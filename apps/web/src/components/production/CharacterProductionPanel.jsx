import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Loader2, Save, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useCharacterProduction,
  useCreateEmotionReference,
  useDeleteEmotionReference,
  useUpdateCharacterVoice,
  useVoiceActors,
} from '../../hooks/useProduction.js';
import { getPBFileUrl } from '../../lib/utils.js';

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'excited', 'scared', 'thinking', 'surprised'];

function safeJsonParse(raw, fallback = {}) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function CharacterProductionPanel({ workspaceId, showId, characterId }) {
  const { data, isLoading } = useCharacterProduction(workspaceId, showId, characterId);
  const { data: voiceActors = [] } = useVoiceActors(workspaceId);
  const updateVoice = useUpdateCharacterVoice(workspaceId, showId, characterId);
  const createEmotionRef = useCreateEmotionReference(workspaceId, showId, characterId);
  const deleteEmotionRef = useDeleteEmotionReference(workspaceId, showId, characterId);

  const [voiceForm, setVoiceForm] = useState({
    voice_actor: '',
    tts_style: '',
    tts_speed: 1,
    tts_pitch: 0,
    tts_emotion_map: '{}',
  });
  const [emotionForm, setEmotionForm] = useState({
    emotion: 'happy',
    prompt_hint: '',
    is_primary: false,
    file: null,
  });

  useEffect(() => {
    const assignment = data?.assignment;
    if (!assignment) {
      setVoiceForm((prev) => ({ ...prev, voice_actor: '', tts_style: '', tts_speed: 1, tts_pitch: 0, tts_emotion_map: '{}' }));
      return;
    }
    setVoiceForm({
      voice_actor: assignment.voice_actor || '',
      tts_style: assignment.tts_style || '',
      tts_speed: assignment.tts_speed ?? 1,
      tts_pitch: assignment.tts_pitch ?? 0,
      tts_emotion_map: JSON.stringify(assignment.tts_emotion_map || {}, null, 2),
    });
  }, [data?.assignment]);

  const activeVoices = useMemo(
    () => (voiceActors || []).filter((voice) => voice.is_active !== false),
    [voiceActors],
  );
  const emotionRefs = Array.isArray(data?.emotion_refs) ? data.emotion_refs : [];
  const selectedVoice = activeVoices.find((voice) => voice.id === voiceForm.voice_actor);

  const saveVoiceAssignment = async () => {
    const emotionMap = safeJsonParse(voiceForm.tts_emotion_map, null);
    if (emotionMap === null) {
      toast.error('TTS emotion map must be valid JSON');
      return;
    }
    await updateVoice.mutateAsync({
      voice_actor: voiceForm.voice_actor || '',
      tts_style: voiceForm.tts_style || '',
      tts_speed: Number(voiceForm.tts_speed) || 1,
      tts_pitch: Number(voiceForm.tts_pitch) || 0,
      tts_emotion_map: emotionMap,
    });
  };

  const uploadEmotionReference = async () => {
    if (!emotionForm.file) {
      toast.error('Select an emotion image first');
      return;
    }
    const payload = new FormData();
    payload.append('emotion', emotionForm.emotion);
    payload.append('prompt_hint', emotionForm.prompt_hint || '');
    payload.append('is_primary', String(Boolean(emotionForm.is_primary)));
    payload.append('reference_image', emotionForm.file);
    await createEmotionRef.mutateAsync(payload);
    setEmotionForm({ emotion: 'happy', prompt_hint: '', is_primary: false, file: null });
  };

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Voice Assignment</h2>
          <button
            type="button"
            onClick={saveVoiceAssignment}
            disabled={updateVoice.isPending}
            className="btn-primary"
          >
            {updateVoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Voice
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="label">Voice Actor</label>
            <select
              value={voiceForm.voice_actor}
              onChange={(e) => setVoiceForm((prev) => ({ ...prev, voice_actor: e.target.value }))}
              className="input"
            >
              <option value="">No voice assigned</option>
              {activeVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>{voice.name} ({voice.provider})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">TTS Style</label>
            <input
              value={voiceForm.tts_style}
              onChange={(e) => setVoiceForm((prev) => ({ ...prev, tts_style: e.target.value }))}
              className="input"
              placeholder="calm storyteller"
            />
          </div>
          <div>
            <label className="label">TTS Speed</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="2"
              value={voiceForm.tts_speed}
              onChange={(e) => setVoiceForm((prev) => ({ ...prev, tts_speed: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">TTS Pitch</label>
            <input
              type="number"
              step="0.5"
              min="-24"
              max="24"
              value={voiceForm.tts_pitch}
              onChange={(e) => setVoiceForm((prev) => ({ ...prev, tts_pitch: e.target.value }))}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Emotion Voice Map (JSON)</label>
          <textarea
            value={voiceForm.tts_emotion_map}
            onChange={(e) => setVoiceForm((prev) => ({ ...prev, tts_emotion_map: e.target.value }))}
            className="input min-h-24 resize-y font-mono text-xs"
            placeholder='{"happy":"cheerful","sad":"gentle"}'
          />
        </div>

        <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Selected voice</p>
          <p>
            {selectedVoice
              ? `${selectedVoice.name} (${selectedVoice.provider}${selectedVoice.external_voice_id ? `: ${selectedVoice.external_voice_id}` : ''})`
              : 'No voice actor selected'}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Emotion References</h2>
          <span className="badge">{emotionRefs.length} refs</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select
            value={emotionForm.emotion}
            onChange={(e) => setEmotionForm((prev) => ({ ...prev, emotion: e.target.value }))}
            className="input"
          >
            {EMOTIONS.map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}
          </select>
          <input
            value={emotionForm.prompt_hint}
            onChange={(e) => setEmotionForm((prev) => ({ ...prev, prompt_hint: e.target.value }))}
            className="input md:col-span-2"
            placeholder="eyebrows raised, slight smile, warm lighting"
          />
          <label className="input flex items-center justify-between md:col-span-2">
            <span className="truncate text-xs">{emotionForm.file?.name || 'Upload emotion image'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setEmotionForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
            />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={emotionForm.is_primary}
              onChange={(e) => setEmotionForm((prev) => ({ ...prev, is_primary: e.target.checked }))}
            />
            Mark as primary for this emotion
          </label>
          <button
            type="button"
            onClick={uploadEmotionReference}
            disabled={createEmotionRef.isPending}
            className="btn-secondary"
          >
            {createEmotionRef.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload Reference
          </button>
        </div>

        <div className="space-y-3">
          {emotionRefs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Upload at least one expression image so rendering can keep character emotions consistent.
            </div>
          ) : emotionRefs.map((ref) => {
            const imageUrl = ref.reference_image ? getPBFileUrl(ref, ref.reference_image, '256x256') : null;
            return (
              <div key={ref.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {imageUrl ? (
                    <img src={imageUrl} alt={ref.emotion} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">
                    {ref.emotion}
                    {ref.is_primary ? ' (primary)' : ''}
                  </p>
                  {ref.prompt_hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{ref.prompt_hint}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => deleteEmotionRef.mutate(ref.id)}
                  className="btn-danger px-3 py-1.5 text-xs"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CharacterProductionPanel;
