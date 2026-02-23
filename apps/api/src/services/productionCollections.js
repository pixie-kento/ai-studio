import { getAdminPB } from './pocketbase.js';

const COLLECTION_DEFINITIONS = [
  {
    name: 'voice_actors',
    indexes: [
      'CREATE INDEX idx_voice_actors_workspace ON voice_actors (workspace)',
      'CREATE INDEX idx_voice_actors_active ON voice_actors (is_active)',
    ],
    schema: [
      {
        name: 'workspace',
        type: 'relation',
        required: true,
        options: { collectionId: 'wspace0001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      { name: 'name', type: 'text', required: true, options: { min: 1, max: 120, pattern: '' } },
      {
        name: 'provider',
        type: 'select',
        required: false,
        options: { maxSelect: 1, values: ['xtts', 'piper', 'elevenlabs', 'rvc', 'custom'] },
      },
      { name: 'external_voice_id', type: 'text', required: false, options: { min: 0, max: 200, pattern: '' } },
      {
        name: 'voice_sample',
        type: 'file',
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 20 * 1024 * 1024,
          mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-wav', 'audio/ogg'],
          thumbs: [],
          protected: false,
        },
      },
      { name: 'settings', type: 'json', required: false, options: { maxSize: 2_000_000 } },
      { name: 'is_active', type: 'bool', required: false, options: {} },
    ],
  },
  {
    name: 'character_voice_assignments',
    indexes: [
      'CREATE UNIQUE INDEX idx_character_voice_unique ON character_voice_assignments (character)',
      'CREATE INDEX idx_character_voice_workspace ON character_voice_assignments (workspace)',
    ],
    schema: [
      {
        name: 'workspace',
        type: 'relation',
        required: true,
        options: { collectionId: 'wspace0001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'show',
        type: 'relation',
        required: true,
        options: { collectionId: 'shows00001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'character',
        type: 'relation',
        required: true,
        options: { collectionId: 'chars00001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'voice_actor',
        type: 'relation',
        required: false,
        options: { collectionId: 'voice_actors', cascadeDelete: false, minSelect: 0, maxSelect: 1, displayFields: [] },
      },
      { name: 'tts_style', type: 'text', required: false, options: { min: 0, max: 500, pattern: '' } },
      { name: 'tts_speed', type: 'number', required: false, options: { min: 0.5, max: 2.0, noDecimal: false } },
      { name: 'tts_pitch', type: 'number', required: false, options: { min: -24, max: 24, noDecimal: false } },
      { name: 'tts_emotion_map', type: 'json', required: false, options: { maxSize: 2_000_000 } },
      { name: 'metadata', type: 'json', required: false, options: { maxSize: 2_000_000 } },
    ],
  },
  {
    name: 'character_emotion_refs',
    indexes: [
      'CREATE INDEX idx_character_emotion_refs_character ON character_emotion_refs (character)',
      'CREATE INDEX idx_character_emotion_refs_workspace ON character_emotion_refs (workspace)',
    ],
    schema: [
      {
        name: 'workspace',
        type: 'relation',
        required: true,
        options: { collectionId: 'wspace0001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'show',
        type: 'relation',
        required: true,
        options: { collectionId: 'shows00001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'character',
        type: 'relation',
        required: true,
        options: { collectionId: 'chars00001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'emotion',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['neutral', 'happy', 'sad', 'angry', 'excited', 'scared', 'thinking', 'surprised'],
        },
      },
      {
        name: 'reference_image',
        type: 'file',
        required: true,
        options: {
          maxSelect: 1,
          maxSize: 8 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['256x256'],
          protected: false,
        },
      },
      { name: 'prompt_hint', type: 'text', required: false, options: { min: 0, max: 1000, pattern: '' } },
      { name: 'is_primary', type: 'bool', required: false, options: {} },
    ],
  },
  {
    name: 'episode_scenes',
    indexes: [
      'CREATE UNIQUE INDEX idx_episode_scenes_unique ON episode_scenes (episode, scene_index, shot_index)',
      'CREATE INDEX idx_episode_scenes_workspace ON episode_scenes (workspace)',
      'CREATE INDEX idx_episode_scenes_episode_sort ON episode_scenes (episode, sort_order, scene_index, shot_index)',
    ],
    schema: [
      {
        name: 'workspace',
        type: 'relation',
        required: true,
        options: { collectionId: 'wspace0001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'show',
        type: 'relation',
        required: true,
        options: { collectionId: 'shows00001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'episode',
        type: 'relation',
        required: true,
        options: { collectionId: 'episods001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      { name: 'scene_index', type: 'number', required: true, options: { min: 1, max: 10000, noDecimal: true } },
      { name: 'shot_index', type: 'number', required: true, options: { min: 1, max: 10000, noDecimal: true } },
      { name: 'duration_sec', type: 'number', required: false, options: { min: 0.5, max: 120, noDecimal: false } },
      { name: 'camera', type: 'text', required: false, options: { min: 0, max: 120, pattern: '' } },
      { name: 'action', type: 'text', required: false, options: { min: 0, max: 5000, pattern: '' } },
      { name: 'emotion', type: 'text', required: false, options: { min: 0, max: 120, pattern: '' } },
      { name: 'music_mood', type: 'text', required: false, options: { min: 0, max: 200, pattern: '' } },
      { name: 'prompt_positive', type: 'text', required: false, options: { min: 0, max: 10000, pattern: '' } },
      { name: 'prompt_negative', type: 'text', required: false, options: { min: 0, max: 6000, pattern: '' } },
      { name: 'focus_character', type: 'text', required: false, options: { min: 0, max: 200, pattern: '' } },
      { name: 'seed', type: 'number', required: false, options: { min: null, max: null, noDecimal: true } },
      { name: 'sort_order', type: 'number', required: false, options: { min: 0, max: null, noDecimal: true } },
      { name: 'metadata', type: 'json', required: false, options: { maxSize: 2_000_000 } },
    ],
  },
  {
    name: 'show_production_profiles',
    indexes: [
      'CREATE UNIQUE INDEX idx_show_production_unique ON show_production_profiles (show)',
      'CREATE INDEX idx_show_production_workspace ON show_production_profiles (workspace)',
    ],
    schema: [
      {
        name: 'workspace',
        type: 'relation',
        required: true,
        options: { collectionId: 'wspace0001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'show',
        type: 'relation',
        required: true,
        options: { collectionId: 'shows00001', cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: [] },
      },
      {
        name: 'pipeline_mode',
        type: 'select',
        required: false,
        options: { maxSelect: 1, values: ['storyboard_keyframes', 'scene_video'] },
      },
      { name: 'frame_generation_enabled', type: 'bool', required: false, options: {} },
      { name: 'scene_generation_enabled', type: 'bool', required: false, options: {} },
      { name: 'music_generation_enabled', type: 'bool', required: false, options: {} },
      { name: 'sfx_enabled', type: 'bool', required: false, options: {} },
      { name: 'background_music_enabled', type: 'bool', required: false, options: {} },
      { name: 'intro_enabled', type: 'bool', required: false, options: {} },
      { name: 'outro_enabled', type: 'bool', required: false, options: {} },
      { name: 'intro_text', type: 'text', required: false, options: { min: 0, max: 1000, pattern: '' } },
      { name: 'outro_text', type: 'text', required: false, options: { min: 0, max: 1000, pattern: '' } },
      { name: 'intro_duration_sec', type: 'number', required: false, options: { min: 1, max: 20, noDecimal: true } },
      { name: 'outro_duration_sec', type: 'number', required: false, options: { min: 1, max: 20, noDecimal: true } },
      { name: 'music_prompt', type: 'text', required: false, options: { min: 0, max: 1500, pattern: '' } },
      { name: 'sfx_prompt', type: 'text', required: false, options: { min: 0, max: 1500, pattern: '' } },
      { name: 'render_preset', type: 'json', required: false, options: { maxSize: 2_000_000 } },
      { name: 'metadata', type: 'json', required: false, options: { maxSize: 2_000_000 } },
    ],
  },
];

async function getCollectionByName(pb, name) {
  const all = await pb.collections.getFullList();
  return all.find((collection) => collection.name === name) || null;
}

async function resolveRelationSchema(pb, schema = []) {
  const collections = await pb.collections.getFullList();
  const lookup = new Map();
  for (const collection of collections) {
    lookup.set(collection.id, collection.id);
    lookup.set(collection.name, collection.id);
  }

  return schema.map((field) => {
    if (field.type !== 'relation' || !field.options?.collectionId) return field;
    const resolved = lookup.get(field.options.collectionId);
    if (!resolved) return field;
    return {
      ...field,
      options: {
        ...field.options,
        collectionId: resolved,
      },
    };
  });
}

async function createCollectionIfMissing(pb, definition) {
  const existing = await getCollectionByName(pb, definition.name);
  if (existing) return { created: false, id: existing.id };

  const schema = await resolveRelationSchema(pb, definition.schema);

  const created = await pb.collections.create({
    name: definition.name,
    type: 'base',
    schema,
    indexes: definition.indexes || [],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  return { created: true, id: created.id };
}

export async function ensureProductionCollections() {
  const pb = await getAdminPB();
  let created = 0;
  const details = [];

  for (const definition of COLLECTION_DEFINITIONS) {
    const result = await createCollectionIfMissing(pb, definition);
    if (result.created) created += 1;
    details.push({ name: definition.name, created: result.created });
  }

  return { created, total: COLLECTION_DEFINITIONS.length, details };
}

export function getDefaultProductionProfile(showId, workspaceId) {
  return {
    show: showId,
    workspace: workspaceId,
    pipeline_mode: 'storyboard_keyframes',
    frame_generation_enabled: true,
    scene_generation_enabled: true,
    music_generation_enabled: true,
    sfx_enabled: true,
    background_music_enabled: true,
    intro_enabled: true,
    outro_enabled: true,
    intro_text: '',
    outro_text: '',
    intro_duration_sec: 4,
    outro_duration_sec: 4,
    music_prompt: 'uplifting cinematic children cartoon background music',
    sfx_prompt: 'soft cartoon foley, magical twinkles, whooshes',
    render_preset: {
      mode: 'storyboard_keyframes',
      width: 832,
      height: 480,
      fps: 12,
      steps: 24,
      cfg: 7,
      denoise: 0.55,
      sampler: 'euler',
      scheduler: 'normal',
    },
    metadata: {},
  };
}

export default { ensureProductionCollections, getDefaultProductionProfile };
