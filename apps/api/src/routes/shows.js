import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';
import { checkShowLimit } from '../middleware/planLimits.js';
import { generateEpisodePipeline } from '../services/pipeline.js';
import { getDefaultProductionProfile } from '../services/productionCollections.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace);

// GET /api/workspaces/:wid/shows
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const shows = await pb.collection('shows').getFullList({
      filter: `workspace = "${req.params.wid}"`,
      sort: '-@rowid',
    });
    res.json(shows);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows
router.post('/', requireRole('creator'), checkShowLimit, async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const { name, description, tagline, target_age, style_prompt } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
    const show = await pb.collection('shows').create({
      workspace: req.params.wid,
      name, description, tagline, target_age, style_prompt,
      slug,
      status: 'active',
      openai_model: 'gpt-4o',
      episodes_count: 0,
      schedule_enabled: false,
    });

    const defaultProduction = getDefaultProductionProfile(show.id, req.params.wid);
    await pb.collection('show_production_profiles').create(defaultProduction).catch(() => {});

    res.status(201).json(show);
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/shows/:id
router.get('/:id', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const show = await pb.collection('shows').getOne(req.params.id);
    if (show.workspace !== req.params.wid) return res.status(404).json({ error: { message: 'Show not found' } });
    res.json(show);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:id
router.patch('/:id', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await pb.collection('shows').getOne(req.params.id);
    if (existing.workspace !== req.params.wid) {
      return res.status(404).json({ error: { message: 'Show not found' } });
    }
    const allowedFields = [
      'name', 'description', 'tagline', 'thumbnail', 'banner',
      'target_age', 'status', 'youtube_channel_id', 'youtube_playlist_id',
      'schedule_enabled', 'schedule_day', 'schedule_time', 'schedule_timezone',
      'openai_model', 'style_prompt',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const show = await pb.collection('shows').update(req.params.id, updates);
    res.json(show);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/shows/:id
router.delete('/:id', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await pb.collection('shows').getOne(req.params.id);
    if (existing.workspace !== req.params.wid) {
      return res.status(404).json({ error: { message: 'Show not found' } });
    }
    await pb.collection('shows').update(req.params.id, { status: 'archived' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:id/generate-episode
router.post('/:id/generate-episode', requireRole('creator'), async (req, res, next) => {
  try {
    const episode = await generateEpisodePipeline(req.params.id, req.params.wid, req.user.id);
    res.status(202).json({ success: true, episode });
  } catch (err) { next(err); }
});

export default router;
