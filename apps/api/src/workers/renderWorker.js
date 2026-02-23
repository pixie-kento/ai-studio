import axios from 'axios';
import { getRenderQueue } from '../services/queue.js';
import { getAdminPB } from '../services/pocketbase.js';
import { getDefaultProductionProfile } from '../services/productionCollections.js';

function getPBFileUrl(record, filename) {
  if (!filename || !record?.id) return null;
  const base = (process.env.POCKETBASE_URL || 'http://localhost:8090').replace(/\/$/, '');
  const collection = record.collectionId || record.collectionName || 'characters';
  return `${base}/api/files/${collection}/${record.id}/${encodeURIComponent(filename)}`;
}

function buildOrFilter(field, ids = []) {
  const values = [...new Set(ids.filter(Boolean))];
  if (values.length === 0) return '';
  if (values.length === 1) return `${field} = "${values[0]}"`;
  return values.map((id) => `${field} = "${id}"`).join(' || ');
}

export function startRenderWorker() {
  const queue = getRenderQueue();

  queue.process(async (job) => {
    const { episodeId, showId, workspaceId, renderSettings: queuedRenderSettings = null } = job.data;
    const pb = await getAdminPB();

    console.log(`[renderWorker] Processing job ${job.id} for episode ${episodeId}`);

    try {
      // Update status to RENDERING
      await pb.collection('episodes').update(episodeId, {
        status: 'RENDERING',
        render_started_at: new Date().toISOString(),
      });

      // Update render_jobs record
      const matchedList = await pb.collection('render_jobs').getList(1, 1, {
        filter: `episode = "${episodeId}" && render_server_job_id = "${job.id}"`,
        sort: '-created',
      }).catch(() => ({ items: [] }));
      let renderJobRecord = matchedList.items?.[0] || null;
      if (!renderJobRecord) {
        const latestList = await pb.collection('render_jobs').getList(1, 1, {
          filter: `episode = "${episodeId}"`,
          sort: '-created',
        }).catch(() => ({ items: [] }));
        renderJobRecord = latestList.items?.[0] || null;
      }
      if (renderJobRecord) {
        await pb.collection('render_jobs').update(renderJobRecord.id, {
          status: 'running',
          started_at: new Date().toISOString(),
          render_server_job_id: String(job.id),
        });
      }
      const renderSettings = queuedRenderSettings || renderJobRecord?.render_settings || {};

      await pb.collection('pipeline_logs').create({
        episode: episodeId,
        workspace: workspaceId,
        event: 'render_started',
        message: `Render started (Bull job ${job.id})`,
      });

      // Load episode + show + characters
      const episode = await pb.collection('episodes').getOne(episodeId);
      const show = await pb.collection('shows').getOne(showId);
      const characters = await pb.collection('characters').getFullList({
        filter: `show = "${showId}" && workspace = "${workspaceId}" && is_active = true`,
        sort: 'sort_order',
      });
      const productionProfile = await pb.collection('show_production_profiles')
        .getFirstListItem(`workspace = "${workspaceId}" && show = "${showId}"`)
        .catch(() => null);
      const productionDefaults = getDefaultProductionProfile(showId, workspaceId);
      const effectiveProduction = {
        ...productionDefaults,
        ...(productionProfile || {}),
        ...(renderSettings?.production || {}),
      };
      const effectiveRender = renderSettings?.render || effectiveProduction.render_preset || {};
      const effectiveAudio = {
        tts_enabled: renderSettings?.audio?.tts_enabled ?? true,
        background_music_enabled:
          renderSettings?.audio?.background_music_enabled ?? (effectiveProduction.background_music_enabled ?? true),
        sfx_enabled:
          renderSettings?.audio?.sfx_enabled ?? (effectiveProduction.sfx_enabled ?? true),
      };
      const voiceAssignments = await pb.collection('character_voice_assignments').getFullList({
        filter: `workspace = "${workspaceId}" && show = "${showId}"`,
      }).catch(() => []);
      const emotionRefs = await pb.collection('character_emotion_refs').getFullList({
        filter: `workspace = "${workspaceId}" && show = "${showId}"`,
        sort: 'emotion',
      }).catch(() => []);

      const voiceActorFilter = buildOrFilter('id', voiceAssignments.map((assignment) => assignment.voice_actor));
      const voiceActors = voiceActorFilter
        ? await pb.collection('voice_actors').getFullList({ filter: voiceActorFilter }).catch(() => [])
        : [];
      const voiceActorById = new Map(voiceActors.map((actor) => [actor.id, actor]));
      const voiceAssignmentByCharacter = new Map(voiceAssignments.map((assignment) => [assignment.character, assignment]));
      const emotionRefsByCharacter = new Map();
      for (const ref of emotionRefs) {
        if (!emotionRefsByCharacter.has(ref.character)) emotionRefsByCharacter.set(ref.character, []);
        emotionRefsByCharacter.get(ref.character).push(ref);
      }

      // Get render server URL
      const renderServerUrl = process.env.RENDER_SERVER_URL;
      if (!renderServerUrl) {
        throw new Error('Render server URL not configured');
      }

      // POST to render server
      const payload = {
        episode_id: episodeId,
        episode_number: episode.episode_number,
        title: episode.title,
        script: episode.script,
        moral: episode.moral,
        storyboard: Array.isArray(renderSettings?.storyboard) ? renderSettings.storyboard : [],
        characters: characters.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role || '',
          positive_prompt: c.comfyui_positive_prompt,
          negative_prompt: c.comfyui_negative_prompt,
          seed: c.master_seed,
          lora_file: c.lora_file,
          reference_image: c.reference_image || '',
          reference_image_url: getPBFileUrl(c, c.reference_image),
          voice_assignment: (() => {
            const assignment = voiceAssignmentByCharacter.get(c.id);
            if (!assignment) return null;
            const actor = assignment.voice_actor ? voiceActorById.get(assignment.voice_actor) : null;
            return {
              voice_actor_id: assignment.voice_actor || '',
              voice_actor_name: actor?.name || '',
              provider: actor?.provider || '',
              external_voice_id: actor?.external_voice_id || '',
              tts_style: assignment.tts_style || '',
              tts_speed: assignment.tts_speed ?? 1,
              tts_pitch: assignment.tts_pitch ?? 0,
              settings: actor?.settings || {},
            };
          })(),
          emotion_references: (emotionRefsByCharacter.get(c.id) || []).map((ref) => ({
            id: ref.id,
            emotion: ref.emotion,
            prompt_hint: ref.prompt_hint || '',
            reference_image: ref.reference_image || '',
            reference_image_url: getPBFileUrl(ref, ref.reference_image),
          })),
        })),
        style: renderSettings?.style_prompt || show.style_prompt || '',
        render: effectiveRender,
        production: effectiveProduction,
        audio: effectiveAudio,
        callback_url: `${process.env.API_URL}/api/webhooks/render`,
        callback_key: process.env.RENDER_SERVER_CALLBACK_KEY,
        job_id: String(job.id),
      };

      await axios.post(`${renderServerUrl}/render-full-episode`, payload, {
        headers: {
          'X-API-Key': process.env.RENDER_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 3600000, // 1 hour
      });

      console.log(`[renderWorker] Job ${job.id} dispatched to render server`);
      // Actual completion handled via webhook callbacks
    } catch (err) {
      console.error(`[renderWorker] Job ${job.id} failed:`, err.message);

      const pb2 = await getAdminPB();
      await pb2.collection('episodes').update(episodeId, { status: 'RENDER_FAILED' }).catch(() => {});
      const matchedList = await pb2.collection('render_jobs').getList(1, 1, {
        filter: `episode = "${episodeId}" && render_server_job_id = "${job.id}"`,
        sort: '-created',
      }).catch(() => ({ items: [] }));
      let renderJobRecord = matchedList.items?.[0] || null;
      if (!renderJobRecord) {
        const latestList = await pb2.collection('render_jobs').getList(1, 1, {
          filter: `episode = "${episodeId}"`,
          sort: '-created',
        }).catch(() => ({ items: [] }));
        renderJobRecord = latestList.items?.[0] || null;
      }
      if (renderJobRecord) {
        await pb2.collection('render_jobs').update(renderJobRecord.id, {
          status: 'failed',
          error_message: err.message,
        }).catch(() => {});
      }
      await pb2.collection('pipeline_logs').create({
        episode: episodeId,
        workspace: workspaceId,
        event: 'render_failed',
        message: err.message,
      }).catch(() => {});

      throw err;
    }
  });

  queue.on('completed', (job) => {
    console.log(`[renderWorker] Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`[renderWorker] Job ${job.id} failed:`, err.message);
  });

  console.log('[renderWorker] Render worker started');
}

export default { startRenderWorker };
