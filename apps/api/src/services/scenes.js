function asText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function parseIntSafe(value, fallback = 0, min = null, max = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  let n = Math.trunc(parsed);
  if (min !== null) n = Math.max(min, n);
  if (max !== null) n = Math.min(max, n);
  return n;
}

function parseFloatSafe(value, fallback = 0, min = null, max = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  let n = parsed;
  if (min !== null) n = Math.max(min, n);
  if (max !== null) n = Math.min(max, n);
  return n;
}

function parseJsonSafe(value, fallback = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeScenePayload(raw = {}, previous = null) {
  const sceneIndex = parseIntSafe(raw.scene_index ?? raw.scene, previous?.scene_index ?? previous?.scene ?? 1, 1, 10000);
  const shotIndex = parseIntSafe(raw.shot_index, previous?.shot_index ?? 1, 1, 10000);
  const defaultSort = sceneIndex * 1000 + shotIndex;
  const seedRaw = raw.seed ?? previous?.seed ?? null;
  const seed = seedRaw === '' || seedRaw === null || seedRaw === undefined
    ? null
    : parseIntSafe(seedRaw, 0);

  return {
    scene_index: sceneIndex,
    shot_index: shotIndex,
    duration_sec: parseFloatSafe(raw.duration_sec, previous?.duration_sec ?? 4, 0.5, 120),
    camera: asText(raw.camera, previous?.camera || 'medium').slice(0, 120),
    action: asText(raw.action, previous?.action || '').slice(0, 5000),
    emotion: asText(raw.emotion, previous?.emotion || '').slice(0, 120),
    music_mood: asText(raw.music_mood, previous?.music_mood || '').slice(0, 200),
    prompt_positive: asText(raw.prompt_positive, previous?.prompt_positive || '').slice(0, 10000),
    prompt_negative: asText(raw.prompt_negative, previous?.prompt_negative || '').slice(0, 6000),
    focus_character: asText(raw.focus_character, previous?.focus_character || '').slice(0, 200),
    seed,
    sort_order: parseIntSafe(raw.sort_order, previous?.sort_order ?? defaultSort, 0),
    metadata: parseJsonSafe(raw.metadata, previous?.metadata || {}),
  };
}

export function sceneRecordToStoryboard(scene) {
  return {
    scene: scene.scene_index ?? 1,
    shot_index: scene.shot_index ?? 1,
    duration_sec: scene.duration_sec ?? 4,
    camera: scene.camera || 'medium',
    action: scene.action || '',
    emotion: scene.emotion || '',
    music_mood: scene.music_mood || '',
    prompt_positive: scene.prompt_positive || '',
    prompt_negative: scene.prompt_negative || '',
    focus_character: scene.focus_character || '',
    seed: scene.seed ?? null,
  };
}

export function storyboardShotToScenePayload(shot = {}, index = 0) {
  const sceneIndex = parseIntSafe(shot.scene, 1, 1, 10000);
  const shotIndex = parseIntSafe(shot.shot_index, index + 1, 1, 10000);
  return normalizeScenePayload({
    scene_index: sceneIndex,
    shot_index: shotIndex,
    duration_sec: shot.duration_sec ?? 4,
    camera: shot.camera || 'medium',
    action: shot.action || '',
    emotion: shot.emotion || '',
    music_mood: shot.music_mood || '',
    prompt_positive: shot.prompt_positive || '',
    prompt_negative: shot.prompt_negative || '',
    focus_character: shot.focus_character || '',
    seed: shot.seed ?? null,
    sort_order: sceneIndex * 1000 + shotIndex,
  });
}

export async function getEpisodeScenes(pb, workspaceId, showId, episodeId) {
  return pb.collection('episode_scenes').getFullList({
    filter: `workspace = "${workspaceId}" && show = "${showId}" && episode = "${episodeId}"`,
    sort: 'sort_order,scene_index,shot_index,@rowid',
  }).catch(() => []);
}

export async function syncEpisodeScenesFromStoryboard(pb, { workspaceId, showId, episodeId, storyboard = [] }) {
  const existing = await getEpisodeScenes(pb, workspaceId, showId, episodeId);
  for (const record of existing) {
    await pb.collection('episode_scenes').delete(record.id).catch(() => {});
  }
  const created = [];
  for (let i = 0; i < storyboard.length; i += 1) {
    const payload = storyboardShotToScenePayload(storyboard[i], i);
    const record = await pb.collection('episode_scenes').create({
      workspace: workspaceId,
      show: showId,
      episode: episodeId,
      ...payload,
    });
    created.push(record);
  }
  return created;
}

export default {
  normalizeScenePayload,
  sceneRecordToStoryboard,
  storyboardShotToScenePayload,
  getEpisodeScenes,
  syncEpisodeScenesFromStoryboard,
};
