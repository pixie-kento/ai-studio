import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';
import { getEpisodeScenes, normalizeScenePayload, sceneRecordToStoryboard } from '../services/scenes.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace);

async function assertEpisodeScope(pb, wid, sid, eid) {
  const episode = await pb.collection('episodes').getOne(eid);
  if (episode.workspace !== wid || episode.show !== sid) {
    const err = new Error('Episode not found');
    err.statusCode = 404;
    throw err;
  }
  return episode;
}

async function assertSceneScope(pb, wid, sid, eid, sceneId) {
  const scene = await pb.collection('episode_scenes').getOne(sceneId);
  if (scene.workspace !== wid || scene.show !== sid || scene.episode !== eid) {
    const err = new Error('Scene not found');
    err.statusCode = 404;
    throw err;
  }
  return scene;
}

async function syncLatestRenderStoryboard(pb, wid, sid, eid) {
  const scenes = await getEpisodeScenes(pb, wid, sid, eid);
  const storyboard = scenes.map(sceneRecordToStoryboard);
  const latest = await pb.collection('render_jobs').getList(1, 1, {
    filter: `episode = "${eid}"`,
    sort: '-created',
  }).catch(() => ({ items: [] }));
  const latestJob = latest.items?.[0] || null;
  if (!latestJob) return storyboard;
  await pb.collection('render_jobs').update(latestJob.id, {
    render_settings: {
      ...(latestJob.render_settings || {}),
      storyboard,
      generated_at: new Date().toISOString(),
    },
  });
  return storyboard;
}

// GET /api/workspaces/:wid/shows/:sid/episodes/:eid/scenes
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertEpisodeScope(pb, req.params.wid, req.params.sid, req.params.eid);
    const scenes = await getEpisodeScenes(pb, req.params.wid, req.params.sid, req.params.eid);
    res.json(scenes);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/episodes/:eid/scenes
router.post('/', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertEpisodeScope(pb, req.params.wid, req.params.sid, req.params.eid);
    const payload = normalizeScenePayload(req.body);
    const created = await pb.collection('episode_scenes').create({
      workspace: req.params.wid,
      show: req.params.sid,
      episode: req.params.eid,
      ...payload,
    });
    await syncLatestRenderStoryboard(pb, req.params.wid, req.params.sid, req.params.eid);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/shows/:sid/episodes/:eid/scenes/:sceneId
router.get('/:sceneId', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertEpisodeScope(pb, req.params.wid, req.params.sid, req.params.eid);
    const scene = await assertSceneScope(pb, req.params.wid, req.params.sid, req.params.eid, req.params.sceneId);
    res.json(scene);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:sid/episodes/:eid/scenes/:sceneId
router.patch('/:sceneId', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertEpisodeScope(pb, req.params.wid, req.params.sid, req.params.eid);
    const existing = await assertSceneScope(pb, req.params.wid, req.params.sid, req.params.eid, req.params.sceneId);
    const normalized = normalizeScenePayload(req.body, existing);
    const allowed = [
      'scene_index',
      'shot_index',
      'duration_sec',
      'camera',
      'action',
      'emotion',
      'music_mood',
      'prompt_positive',
      'prompt_negative',
      'focus_character',
      'seed',
      'sort_order',
      'metadata',
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = normalized[field];
    }
    const updated = await pb.collection('episode_scenes').update(req.params.sceneId, updates);
    await syncLatestRenderStoryboard(pb, req.params.wid, req.params.sid, req.params.eid);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/shows/:sid/episodes/:eid/scenes/:sceneId
router.delete('/:sceneId', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertEpisodeScope(pb, req.params.wid, req.params.sid, req.params.eid);
    await assertSceneScope(pb, req.params.wid, req.params.sid, req.params.eid, req.params.sceneId);
    await pb.collection('episode_scenes').delete(req.params.sceneId);
    await syncLatestRenderStoryboard(pb, req.params.wid, req.params.sid, req.params.eid);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
