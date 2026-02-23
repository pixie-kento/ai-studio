import { Router } from 'express';
import multer from 'multer';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed for voice_sample.'));
    }
    cb(null, true);
  },
});

function uploadVoiceSample(req, res, next) {
  upload.single('voice_sample')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ error: { message: err.message || 'Invalid voice sample upload.' } });
  });
}

function parseJsonField(value, fallback = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function toPBFile(file) {
  if (!file) return undefined;
  if (typeof File !== 'undefined') {
    return new File([file.buffer], file.originalname, { type: file.mimetype });
  }
  return new Blob([file.buffer], { type: file.mimetype });
}

function buildPayload(body) {
  return {
    name: body.name || '',
    provider: body.provider || 'xtts',
    external_voice_id: body.external_voice_id || '',
    settings: parseJsonField(body.settings, {}),
    is_active: parseBoolean(body.is_active, true),
  };
}

async function assertVoiceActorScope(pb, workspaceId, voiceActorId) {
  const actor = await pb.collection('voice_actors').getOne(voiceActorId);
  if (actor.workspace !== workspaceId) {
    const err = new Error('Voice actor not found');
    err.statusCode = 404;
    throw err;
  }
  return actor;
}

// GET /api/workspaces/:wid/voice-actors
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const list = await pb.collection('voice_actors').getFullList({
      filter: `workspace = "${req.params.wid}"`,
      sort: 'name',
    });
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/voice-actors
router.post('/', uploadVoiceSample, requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const payload = buildPayload(req.body);
    if (req.file) payload.voice_sample = toPBFile(req.file);

    const created = await pb.collection('voice_actors').create({
      workspace: req.params.wid,
      ...payload,
    });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/voice-actors/:id
router.patch('/:id', uploadVoiceSample, requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertVoiceActorScope(pb, req.params.wid, req.params.id);
    const updates = {};
    const normalized = buildPayload(req.body);
    const allowed = ['name', 'provider', 'external_voice_id', 'settings', 'is_active'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = normalized[field];
    }
    if (req.file) updates.voice_sample = toPBFile(req.file);
    if (req.body.remove_voice_sample === 'true') updates.voice_sample = '';

    const updated = await pb.collection('voice_actors').update(req.params.id, updates);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/voice-actors/:id
router.delete('/:id', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertVoiceActorScope(pb, req.params.wid, req.params.id);
    await pb.collection('voice_actors').update(req.params.id, { is_active: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
