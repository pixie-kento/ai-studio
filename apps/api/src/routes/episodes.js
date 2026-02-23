import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';
import { getRenderQueue } from '../services/queue.js';
import { generateStoryboardPlan } from '../services/ai.js';
import { getDefaultProductionProfile } from '../services/productionCollections.js';
import { getEpisodeScenes, sceneRecordToStoryboard, syncEpisodeScenesFromStoryboard } from '../services/scenes.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace);

async function getLatestRenderJob(pb, episodeId) {
  const list = await pb.collection('render_jobs').getList(1, 1, {
    filter: `episode = "${episodeId}"`,
    sort: '-created',
  }).catch(() => ({ items: [] }));
  return list.items?.[0] || null;
}

async function getProductionProfile(pb, workspaceId, showId) {
  const defaults = getDefaultProductionProfile(showId, workspaceId);
  const existing = await pb.collection('show_production_profiles')
    .getFirstListItem(`workspace = "${workspaceId}" && show = "${showId}"`)
    .catch(() => null);
  return { ...defaults, ...(existing || {}) };
}

function buildRenderSettings(show, production, storyboard = [], previous = {}) {
  const previousAudio = previous?.audio || {};
  const previousRender = previous?.render || {};
  const renderPreset = production?.render_preset || {};
  return {
    ...previous,
    storyboard: Array.isArray(storyboard) ? storyboard : [],
    style_prompt: previous.style_prompt || show.style_prompt || '',
    render: {
      ...renderPreset,
      ...previousRender,
    },
    audio: {
      tts_enabled: previousAudio.tts_enabled ?? true,
      background_music_enabled:
        production?.background_music_enabled ?? previousAudio.background_music_enabled ?? true,
      sfx_enabled: production?.sfx_enabled ?? previousAudio.sfx_enabled ?? true,
    },
    production,
    generated_at: new Date().toISOString(),
  };
}

// GET /api/workspaces/:wid/shows/:sid/episodes
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const { status, theme, search, page = 1, perPage = 20 } = req.query;
    let filter = `show = "${req.params.sid}" && workspace = "${req.params.wid}"`;
    if (status) filter += ` && status = "${status}"`;
    if (theme) filter += ` && theme = "${theme}"`;
    if (search) filter += ` && (title ~ "${search}" || moral ~ "${search}")`;

    const episodes = await pb.collection('episodes').getList(Number(page), Number(perPage), {
      filter,
      sort: '-episode_number',
    });
    res.json(episodes);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/episodes (manual create)
router.post('/', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const { title, moral, theme, summary, script } = req.body;

    // Get next episode number
    const latest = await pb.collection('episodes').getList(1, 1, {
      filter: `show = "${req.params.sid}" && workspace = "${req.params.wid}"`,
      sort: '-episode_number',
    });
    const episodeNumber = latest.items[0]?.episode_number + 1 || 1;

    const episode = await pb.collection('episodes').create({
      show: req.params.sid,
      workspace: req.params.wid,
      episode_number: episodeNumber,
      title, moral, theme, summary, script,
      status: script ? 'SCRIPT_READY' : 'PENDING',
      created_by: req.user.id,
    });
    res.status(201).json(episode);
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/shows/:sid/episodes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const episode = await pb.collection('episodes').getOne(req.params.id, { expand: 'approved_by,created_by' });
    if (episode.workspace !== req.params.wid) return res.status(404).json({ error: { message: 'Episode not found' } });
    res.json(episode);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:sid/episodes/:id
router.patch('/:id', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await pb.collection('episodes').getOne(req.params.id);
    if (existing.workspace !== req.params.wid || existing.show !== req.params.sid) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }
    const allowedFields = ['title', 'moral', 'theme', 'theme_tags', 'summary', 'script'];
    const updates = {};
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const episode = await pb.collection('episodes').update(req.params.id, updates);
    res.json(episode);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/shows/:sid/episodes/:id
router.delete('/:id', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await pb.collection('episodes').getOne(req.params.id);
    if (existing.workspace !== req.params.wid || existing.show !== req.params.sid) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }
    await pb.collection('episodes').delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/episodes/:id/approve
router.post('/:id/approve', requireRole('reviewer'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const episode = await pb.collection('episodes').getOne(req.params.id);
    if (episode.status !== 'AWAITING_APPROVAL') {
      return res.status(400).json({ error: { message: 'Episode is not awaiting approval' } });
    }
    const updated = await pb.collection('episodes').update(req.params.id, {
      status: 'APPROVED',
      approved_by: req.user.id,
    });

    await pb.collection('pipeline_logs').create({
      episode: req.params.id,
      workspace: req.params.wid,
      event: 'approved',
      message: `Approved by ${req.user.display_name || req.user.email}`,
    });

    // TODO: trigger YouTube publish if auto-publish enabled
    await pb.collection('episodes').update(req.params.id, { status: 'PUBLISHED', published_at: new Date().toISOString() });
    await pb.collection('pipeline_logs').create({ episode: req.params.id, workspace: req.params.wid, event: 'published', message: 'Episode published' });

    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/episodes/:id/reject
router.post('/:id/reject', requireRole('reviewer'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const { reason } = req.body;
    await pb.collection('episodes').update(req.params.id, {
      status: 'REJECTED',
      rejection_reason: reason || '',
    });
    await pb.collection('pipeline_logs').create({
      episode: req.params.id,
      workspace: req.params.wid,
      event: 'rejected',
      message: `Rejected: ${reason || 'No reason provided'}`,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/episodes/:id/queue-render
router.post('/:id/queue-render', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const episode = await pb.collection('episodes').getOne(req.params.id);
    if (episode.workspace !== req.params.wid || episode.show !== req.params.sid) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }
    const workspace = await pb.collection('workspaces').getOne(req.params.wid);
    const show = await pb.collection('shows').getOne(req.params.sid);
    const production = await getProductionProfile(pb, req.params.wid, req.params.sid);
    const priority = workspace.render_priority || 1;
    const existingRenderJob = await getLatestRenderJob(pb, req.params.id);
    const existingSceneRecords = await getEpisodeScenes(pb, req.params.wid, req.params.sid, req.params.id);
    let storyboard = existingSceneRecords.length > 0
      ? existingSceneRecords.map(sceneRecordToStoryboard)
      : (Array.isArray(existingRenderJob?.render_settings?.storyboard)
        ? existingRenderJob.render_settings.storyboard
        : []);

    if (storyboard.length === 0 && episode.script) {
      const characters = await pb.collection('characters').getFullList({
        filter: `show = "${req.params.sid}" && workspace = "${req.params.wid}" && is_active = true`,
        sort: 'sort_order',
      });
      storyboard = await generateStoryboardPlan({
        show,
        characters,
        moral: episode.moral || '',
        script: episode.script,
        episodeNumber: episode.episode_number,
        model: show.openai_model || 'gpt-4o',
      });
    }

    const renderSettings = buildRenderSettings(
      show,
      production,
      storyboard,
      existingRenderJob?.render_settings || {},
    );

    const queue = getRenderQueue();
    const job = await queue.add(
      {
        episodeId: req.params.id,
        showId: req.params.sid,
        workspaceId: req.params.wid,
        renderSettings,
      },
      { priority: priority * -1 }
    );

    const canReuseExisting =
      existingRenderJob &&
      existingRenderJob.status === 'cancelled' &&
      !existingRenderJob.render_server_job_id;

    if (canReuseExisting) {
      await pb.collection('render_jobs').update(existingRenderJob.id, {
        status: 'queued',
        priority,
        render_server_job_id: String(job.id),
        progress_percent: 0,
        current_step: 'queued',
        error_message: '',
        render_settings: renderSettings,
      });
    } else {
      await pb.collection('render_jobs').create({
        episode: req.params.id,
        workspace: req.params.wid,
        show: req.params.sid,
        status: 'queued',
        priority,
        render_server_job_id: String(job.id),
        render_settings: renderSettings,
      });
    }

    await pb.collection('episodes').update(req.params.id, {
      status: 'RENDER_QUEUED',
      render_job_id: String(job.id),
    });
    await pb.collection('pipeline_logs').create({
      episode: req.params.id,
      workspace: req.params.wid,
      event: 'render_queued',
      message: `Queued for render (priority: ${priority}, ${renderSettings.storyboard.length} shots)`,
    });

    res.json({ success: true, jobId: job.id, shot_count: renderSettings.storyboard.length });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/episodes/:id/generate-scenes
router.post('/:id/generate-scenes', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const episode = await pb.collection('episodes').getOne(req.params.id);
    if (episode.workspace !== req.params.wid || episode.show !== req.params.sid) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }
    if (!episode.script) {
      return res.status(400).json({ error: { message: 'Episode script is empty. Generate or write a script first.' } });
    }

    const show = await pb.collection('shows').getOne(req.params.sid);
    const characters = await pb.collection('characters').getFullList({
      filter: `show = "${req.params.sid}" && workspace = "${req.params.wid}" && is_active = true`,
      sort: 'sort_order',
    });

    const storyboard = await generateStoryboardPlan({
      show,
      characters,
      moral: episode.moral || '',
      script: episode.script,
      episodeNumber: episode.episode_number,
      model: show.openai_model || 'gpt-4o',
    });
    await syncEpisodeScenesFromStoryboard(pb, {
      workspaceId: req.params.wid,
      showId: req.params.sid,
      episodeId: req.params.id,
      storyboard,
    });

    const production = await getProductionProfile(pb, req.params.wid, req.params.sid);
    const latestJob = await getLatestRenderJob(pb, req.params.id);
    const renderSettings = buildRenderSettings(
      show,
      production,
      storyboard,
      latestJob?.render_settings || {},
    );

    const canUpdateExisting = latestJob && ['queued', 'cancelled', 'failed'].includes(latestJob.status);

    if (canUpdateExisting) {
      await pb.collection('render_jobs').update(latestJob.id, {
        render_settings: renderSettings,
      });
    } else {
      const workspace = await pb.collection('workspaces').getOne(req.params.wid);
      await pb.collection('render_jobs').create({
        episode: req.params.id,
        workspace: req.params.wid,
        show: req.params.sid,
        status: 'cancelled',
        priority: workspace.render_priority || 1,
        render_settings: renderSettings,
      });
    }

    await pb.collection('pipeline_logs').create({
      episode: req.params.id,
      workspace: req.params.wid,
      event: 'script_ready',
      message: `Scene generation complete (${storyboard.length} shots)`,
      metadata: { storyboard_shot_count: storyboard.length },
    });

    res.json({ success: true, shot_count: storyboard.length, storyboard });
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/shows/:sid/episodes/:id/logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const logs = await pb.collection('pipeline_logs').getFullList({
      filter: `episode = "${req.params.id}" && workspace = "${req.params.wid}"`,
      sort: '@rowid',
    });
    res.json(logs);
  } catch (err) { next(err); }
});

export default router;
