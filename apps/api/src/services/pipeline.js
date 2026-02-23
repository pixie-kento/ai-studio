import { getAdminPB } from './pocketbase.js';
import { generateMoral, generateTitle, generateScript, generateSummary, generateStoryboardPlan } from './ai.js';
import { getRenderQueue } from './queue.js';
import { notifyWorkspace } from './notifications.js';
import { getPlanLimitsForPlan } from './planLimits.js';
import { getDefaultProductionProfile } from './productionCollections.js';
import { syncEpisodeScenesFromStoryboard } from './scenes.js';

async function logPipelineEvent(episodeId, workspaceId, event, message = '', metadata = {}) {
  const pb = await getAdminPB();
  return pb.collection('pipeline_logs').create({
    episode: episodeId,
    workspace: workspaceId,
    event,
    message,
    metadata,
  });
}

async function updateEpisode(episodeId, data) {
  const pb = await getAdminPB();
  return pb.collection('episodes').update(episodeId, data);
}

export async function checkEpisodeLimit(workspaceId) {
  const pb = await getAdminPB();
  const workspace = await pb.collection('workspaces').getOne(workspaceId);
  const limits = await getPlanLimitsForPlan(workspace.plan);
  if (limits.episodes_per_month === -1) return;
  if (workspace.episodes_this_month >= limits.episodes_per_month) {
    const err = new Error(`Episode limit reached. Your ${workspace.plan} plan allows ${limits.episodes_per_month} episodes/month.`);
    err.statusCode = 402;
    err.code = 'PLAN_LIMIT_EPISODE';
    throw err;
  }
}

export async function generateEpisodePipeline(showId, workspaceId, userId) {
  const pb = await getAdminPB();

  // 1. Check plan limits
  await checkEpisodeLimit(workspaceId);

  // 2. Load show + all characters
  const show = await pb.collection('shows').getOne(showId);
  const characters = await pb.collection('characters').getFullList({
    filter: `show = "${showId}" && workspace = "${workspaceId}" && is_active = true`,
    sort: 'sort_order',
  });
  const productionProfile = await pb.collection('show_production_profiles')
    .getFirstListItem(`workspace = "${workspaceId}" && show = "${showId}"`)
    .catch(() => null);

  // 3. Load used morals
  const usedMorals = await pb.collection('morals').getFullList({
    filter: `show = "${showId}" && workspace = "${workspaceId}"`,
    fields: 'moral_text',
  });

  // 4. Load last 3 episode summaries for continuity
  const recentEpisodes = await pb.collection('episodes').getList(1, 3, {
    filter: `show = "${showId}" && workspace = "${workspaceId}" && summary != ""`,
    sort: '-episode_number',
    fields: 'summary,episode_number',
  });
  const recentSummaries = recentEpisodes.items.map(e => e.summary);

  // 5. Calculate next episode number
  const allEpisodes = await pb.collection('episodes').getList(1, 1, {
    filter: `show = "${showId}" && workspace = "${workspaceId}"`,
    sort: '-episode_number',
    fields: 'episode_number',
  });
  const episodeNumber = allEpisodes.items.length > 0
    ? allEpisodes.items[0].episode_number + 1
    : 1;

  // 6. Create episode record
  const episode = await pb.collection('episodes').create({
    show: showId,
    workspace: workspaceId,
    episode_number: episodeNumber,
    status: 'SCRIPT_GENERATING',
    created_by: userId,
  });

  await logPipelineEvent(episode.id, workspaceId, 'created', `Episode ${episodeNumber} created`);
  await logPipelineEvent(episode.id, workspaceId, 'script_generating', 'Generating script with AI');

  try {
    // 7. Generate moral
    const moral = await generateMoral(usedMorals, show.target_age, show.openai_model);

    // 8. Generate title
    const title = await generateTitle(moral, show.name, show.openai_model);

    // 9. Generate full script
    const script = await generateScript({ show, characters, moral, recentSummaries, episodeNumber });

    // 10. Generate summary
    const summary = await generateSummary(script, show.openai_model);

    // 10b. Generate frame-by-frame storyboard prompts for rendering
    const storyboard = await generateStoryboardPlan({
      show,
      characters,
      moral,
      script,
      episodeNumber,
      model: show.openai_model || 'gpt-4o',
    });
    await syncEpisodeScenesFromStoryboard(pb, {
      workspaceId,
      showId,
      episodeId: episode.id,
      storyboard,
    });

    const productionDefaults = getDefaultProductionProfile(showId, workspaceId);
    const production = {
      ...(productionDefaults || {}),
      ...(productionProfile || {}),
    };

    const renderSettings = {
      storyboard,
      style_prompt: show.style_prompt || '',
      render: production.render_preset || productionDefaults.render_preset,
      audio: {
        tts_enabled: true,
        background_music_enabled: production.background_music_enabled ?? true,
        sfx_enabled: production.sfx_enabled ?? true,
      },
      production,
      generated_at: new Date().toISOString(),
    };

    // 11. Update episode with script data
    await updateEpisode(episode.id, {
      title, moral, script, summary,
      status: 'SCRIPT_READY',
    });

    await logPipelineEvent(
      episode.id,
      workspaceId,
      'script_ready',
      `Script ready: "${title}" (${storyboard.length} storyboard shots)`,
      { storyboard_shot_count: storyboard.length }
    );

    // 12. Save moral to morals collection
    await pb.collection('morals').create({
      show: showId,
      workspace: workspaceId,
      moral_text: moral,
      episode: episode.id,
    });

    // 13. Add to render queue
    const workspace = await pb.collection('workspaces').getOne(workspaceId);
    const priority = workspace.render_priority || 1;
    const queue = getRenderQueue();
    const job = await queue.add(
      { episodeId: episode.id, showId, workspaceId, renderSettings },
      { priority: priority * -1 } // Bull uses lower number = higher priority
    );

    // 14. Update episode with render job ID
    await updateEpisode(episode.id, {
      status: 'RENDER_QUEUED',
      render_job_id: String(job.id),
    });

    // Create render_jobs record
    await pb.collection('render_jobs').create({
      episode: episode.id,
      workspace: workspaceId,
      show: showId,
      status: 'queued',
      priority,
      render_settings: renderSettings,
    });

    await logPipelineEvent(episode.id, workspaceId, 'render_queued', `Render job queued (priority: ${priority})`);

    // 15. Increment episodes_this_month
    await pb.collection('workspaces').update(workspaceId, {
      'episodes_this_month+': 1,
    });

    // 16. Notify workspace
    await notifyWorkspace(workspaceId, {
      type: 'approval_needed',
      title: `Episode ${episodeNumber} script ready`,
      message: `"${title}" is queued for rendering`,
      actionUrl: `/review`,
    });

    return await pb.collection('episodes').getOne(episode.id);
  } catch (err) {
    await updateEpisode(episode.id, { status: 'RENDER_FAILED' });
    await logPipelineEvent(episode.id, workspaceId, 'render_failed', err.message);
    throw err;
  }
}

export default { generateEpisodePipeline, checkEpisodeLimit };
