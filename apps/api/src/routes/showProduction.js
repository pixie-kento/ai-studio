import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';
import { getDefaultProductionProfile } from '../services/productionCollections.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace);

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function parseInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseJson(value, fallback = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getProfile(pb, workspaceId, showId) {
  return pb.collection('show_production_profiles')
    .getFirstListItem(`workspace = "${workspaceId}" && show = "${showId}"`)
    .catch(() => null);
}

function normalizeProfilePayload(body, existing = null) {
  const defaults = existing || {};
  return {
    pipeline_mode: body.pipeline_mode || defaults.pipeline_mode || 'storyboard_keyframes',
    frame_generation_enabled: parseBoolean(body.frame_generation_enabled, defaults.frame_generation_enabled ?? true),
    scene_generation_enabled: parseBoolean(body.scene_generation_enabled, defaults.scene_generation_enabled ?? true),
    music_generation_enabled: parseBoolean(body.music_generation_enabled, defaults.music_generation_enabled ?? true),
    sfx_enabled: parseBoolean(body.sfx_enabled, defaults.sfx_enabled ?? true),
    background_music_enabled: parseBoolean(body.background_music_enabled, defaults.background_music_enabled ?? true),
    intro_enabled: parseBoolean(body.intro_enabled, defaults.intro_enabled ?? true),
    outro_enabled: parseBoolean(body.outro_enabled, defaults.outro_enabled ?? true),
    intro_text: body.intro_text ?? defaults.intro_text ?? '',
    outro_text: body.outro_text ?? defaults.outro_text ?? '',
    intro_duration_sec: parseInteger(body.intro_duration_sec, defaults.intro_duration_sec ?? 4),
    outro_duration_sec: parseInteger(body.outro_duration_sec, defaults.outro_duration_sec ?? 4),
    music_prompt: body.music_prompt ?? defaults.music_prompt ?? '',
    sfx_prompt: body.sfx_prompt ?? defaults.sfx_prompt ?? '',
    render_preset: parseJson(body.render_preset, defaults.render_preset || {}),
    metadata: parseJson(body.metadata, defaults.metadata || {}),
  };
}

// GET /api/workspaces/:wid/shows/:sid/production
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const profile = await getProfile(pb, req.params.wid, req.params.sid);
    if (!profile) {
      return res.json({
        id: null,
        ...getDefaultProductionProfile(req.params.sid, req.params.wid),
      });
    }
    res.json(profile);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:sid/production
router.patch('/', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await getProfile(pb, req.params.wid, req.params.sid);
    const payload = normalizeProfilePayload(req.body, existing);

    if (existing) {
      const updated = await pb.collection('show_production_profiles').update(existing.id, payload);
      return res.json(updated);
    }

    const created = await pb.collection('show_production_profiles').create({
      workspace: req.params.wid,
      show: req.params.sid,
      ...payload,
    });
    return res.json(created);
  } catch (err) { next(err); }
});

export default router;
