import { Router } from 'express';
import multer from 'multer';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';
import { checkCharacterLimit } from '../middleware/planLimits.js';
import { generateComfyUIPrompts } from '../services/ai.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed for reference_image.'));
    }
    cb(null, true);
  },
});

function uploadReferenceImage(req, res, next) {
  upload.single('reference_image')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ error: { message: err.message || 'Invalid reference image upload.' } });
  });
}

function parseArrayField(value) {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseIntegerField(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toPBFile(file) {
  if (!file) return undefined;
  if (typeof File !== 'undefined') {
    return new File([file.buffer], file.originalname, { type: file.mimetype });
  }
  return new Blob([file.buffer], { type: file.mimetype });
}

function buildCharacterPayload(body) {
  return {
    name: body.name,
    role: body.role || 'supporting',
    age: body.age || '',
    personality_traits: parseArrayField(body.personality_traits),
    speech_style: body.speech_style || '',
    catchphrases: parseArrayField(body.catchphrases),
    fears: parseArrayField(body.fears),
    relationships: body.relationships || '',
    visual_description: body.visual_description || '',
    clothing_description: body.clothing_description || '',
    growth_rules: body.growth_rules || '',
    backstory: body.backstory || '',
    comfyui_positive_prompt: body.comfyui_positive_prompt || '',
    comfyui_negative_prompt: body.comfyui_negative_prompt || '',
    master_seed: parseIntegerField(body.master_seed, Math.floor(Math.random() * 999999)),
    lora_file: body.lora_file || '',
    sort_order: parseIntegerField(body.sort_order, 0),
  };
}

// GET /api/workspaces/:wid/shows/:sid/characters
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const characters = await pb.collection('characters').getFullList({
      filter: `show = "${req.params.sid}" && workspace = "${req.params.wid}"`,
      sort: 'sort_order,name',
    });
    res.json(characters);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/characters
router.post('/', uploadReferenceImage, requireRole('creator'), checkCharacterLimit, async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const payload = buildCharacterPayload(req.body);
    if (req.file) payload.reference_image = toPBFile(req.file);

    const character = await pb.collection('characters').create({
      show: req.params.sid,
      workspace: req.params.wid,
      ...payload,
      is_active: true,
    });
    res.status(201).json(character);
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/shows/:sid/characters/:id
router.get('/:id', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const character = await pb.collection('characters').getOne(req.params.id);
    if (character.workspace !== req.params.wid) {
      return res.status(404).json({ error: { message: 'Character not found' } });
    }
    res.json(character);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/shows/:sid/characters/:id
router.patch('/:id', uploadReferenceImage, requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await pb.collection('characters').getOne(req.params.id);
    if (existing.workspace !== req.params.wid || existing.show !== req.params.sid) {
      return res.status(404).json({ error: { message: 'Character not found' } });
    }
    const normalized = buildCharacterPayload(req.body);
    const fieldMap = [
      'name', 'role', 'age', 'personality_traits', 'speech_style', 'catchphrases',
      'fears', 'relationships', 'visual_description', 'clothing_description',
      'growth_rules', 'backstory', 'comfyui_positive_prompt', 'comfyui_negative_prompt',
      'master_seed', 'lora_file', 'sort_order',
    ];
    const updates = {};
    for (const field of fieldMap) {
      if (req.body[field] !== undefined) updates[field] = normalized[field];
    }
    if (req.body.is_active !== undefined) {
      updates.is_active = req.body.is_active === true || req.body.is_active === 'true';
    }
    if (req.file) updates.reference_image = toPBFile(req.file);
    if (req.body.remove_reference_image === 'true') updates.reference_image = '';

    const character = await pb.collection('characters').update(req.params.id, updates);
    res.json(character);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/shows/:sid/characters/:id
router.delete('/:id', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const existing = await pb.collection('characters').getOne(req.params.id);
    if (existing.workspace !== req.params.wid || existing.show !== req.params.sid) {
      return res.status(404).json({ error: { message: 'Character not found' } });
    }
    await pb.collection('characters').update(req.params.id, { is_active: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/shows/:sid/characters/:id/generate-prompts
router.post('/:id/generate-prompts', requireRole('creator'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const character = await pb.collection('characters').getOne(req.params.id);
    const prompts = await generateComfyUIPrompts(character);
    const updated = await pb.collection('characters').update(req.params.id, {
      comfyui_positive_prompt: prompts.positive,
      comfyui_negative_prompt: prompts.negative,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
