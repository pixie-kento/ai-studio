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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for emotion reference uploads.'));
    }
    cb(null, true);
  },
});

function uploadEmotionImage(req, res, next) {
  upload.single('reference_image')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ error: { message: err.message || 'Invalid reference image upload.' } });
  });
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

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function parseNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPBFile(file) {
  if (!file) return undefined;
  if (typeof File !== 'undefined') {
    return new File([file.buffer], file.originalname, { type: file.mimetype });
  }
  return new Blob([file.buffer], { type: file.mimetype });
}

async function assertCharacterScope(pb, wid, sid, cid) {
  const character = await pb.collection('characters').getOne(cid);
  if (character.workspace !== wid || character.show !== sid) {
    const err = new Error('Character not found');
    err.statusCode = 404;
    throw err;
  }
  return character;
}

async function getVoiceAssignment(pb, wid, sid, cid) {
  return pb.collection('character_voice_assignments')
    .getFirstListItem(`workspace = "${wid}" && show = "${sid}" && character = "${cid}"`)
    .catch(() => null);
}

async function getEmotionRefs(pb, wid, sid, cid) {
  return pb.collection('character_emotion_refs').getFullList({
    filter: `workspace = "${wid}" && show = "${sid}" && character = "${cid}"`,
    sort: 'emotion,-@rowid',
  });
}

// GET /api/workspaces/:wid/shows/:sid/characters/:cid/production
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertCharacterScope(pb, req.params.wid, req.params.sid, req.params.cid);
    const [assignment, emotionRefs] = await Promise.all([
      getVoiceAssignment(pb, req.params.wid, req.params.sid, req.params.cid),
      getEmotionRefs(pb, req.params.wid, req.params.sid, req.params.cid),
    ]);
    res.json({ assignment, emotion_refs: emotionRefs });
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:sid/characters/:cid/production/voice
router.patch('/voice', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertCharacterScope(pb, req.params.wid, req.params.sid, req.params.cid);
    const existing = await getVoiceAssignment(pb, req.params.wid, req.params.sid, req.params.cid);

    const payload = {
      workspace: req.params.wid,
      show: req.params.sid,
      character: req.params.cid,
      voice_actor: req.body.voice_actor || '',
      tts_style: req.body.tts_style || '',
      tts_speed: parseNumber(req.body.tts_speed, 1),
      tts_pitch: parseNumber(req.body.tts_pitch, 0),
      tts_emotion_map: parseJson(req.body.tts_emotion_map, {}),
      metadata: parseJson(req.body.metadata, {}),
    };

    if (existing) {
      const updated = await pb.collection('character_voice_assignments').update(existing.id, payload);
      return res.json(updated);
    }

    const created = await pb.collection('character_voice_assignments').create(payload);
    return res.json(created);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/characters/:cid/production/emotion-refs
router.post('/emotion-refs', uploadEmotionImage, requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertCharacterScope(pb, req.params.wid, req.params.sid, req.params.cid);
    if (!req.file) {
      return res.status(400).json({ error: { message: 'reference_image is required' } });
    }

    const created = await pb.collection('character_emotion_refs').create({
      workspace: req.params.wid,
      show: req.params.sid,
      character: req.params.cid,
      emotion: req.body.emotion || 'neutral',
      prompt_hint: req.body.prompt_hint || '',
      is_primary: parseBoolean(req.body.is_primary, false),
      reference_image: toPBFile(req.file),
    });
    return res.status(201).json(created);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:sid/characters/:cid/production/emotion-refs/:refId
router.patch('/emotion-refs/:refId', uploadEmotionImage, requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertCharacterScope(pb, req.params.wid, req.params.sid, req.params.cid);
    const existing = await pb.collection('character_emotion_refs').getOne(req.params.refId);
    if (
      existing.workspace !== req.params.wid ||
      existing.show !== req.params.sid ||
      existing.character !== req.params.cid
    ) {
      return res.status(404).json({ error: { message: 'Emotion reference not found' } });
    }

    const updates = {};
    if (req.body.emotion !== undefined) updates.emotion = req.body.emotion;
    if (req.body.prompt_hint !== undefined) updates.prompt_hint = req.body.prompt_hint;
    if (req.body.is_primary !== undefined) updates.is_primary = parseBoolean(req.body.is_primary, false);
    if (req.file) updates.reference_image = toPBFile(req.file);
    if (req.body.remove_reference_image === 'true') updates.reference_image = '';

    const updated = await pb.collection('character_emotion_refs').update(req.params.refId, updates);
    return res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/shows/:sid/characters/:cid/production/emotion-refs/:refId
router.delete('/emotion-refs/:refId', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    await assertCharacterScope(pb, req.params.wid, req.params.sid, req.params.cid);
    const existing = await pb.collection('character_emotion_refs').getOne(req.params.refId);
    if (
      existing.workspace !== req.params.wid ||
      existing.show !== req.params.sid ||
      existing.character !== req.params.cid
    ) {
      return res.status(404).json({ error: { message: 'Emotion reference not found' } });
    }
    await pb.collection('character_emotion_refs').delete(req.params.refId);
    return res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
