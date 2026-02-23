import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  useCreateVoiceActor,
  useDeleteVoiceActor,
  useShowProductionProfile,
  useUpdateShowProductionProfile,
  useVoiceActors,
} from '../../hooks/useProduction.js';

const PROVIDERS = ['xtts', 'piper', 'elevenlabs', 'rvc', 'custom'];

function Toggle({ label, checked, onChange, hint = '' }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand-purple' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export function ShowProductionPanel({ workspaceId, showId }) {
  const { data: profile, isLoading } = useShowProductionProfile(workspaceId, showId);
  const { data: voiceActors = [] } = useVoiceActors(workspaceId);
  const updateProfile = useUpdateShowProductionProfile(workspaceId, showId);
  const createVoiceActor = useCreateVoiceActor(workspaceId);
  const deleteVoiceActor = useDeleteVoiceActor(workspaceId);

  const [form, setForm] = useState(null);
  const [voiceForm, setVoiceForm] = useState({
    name: '',
    provider: 'xtts',
    external_voice_id: '',
    sampleFile: null,
  });

  useEffect(() => {
    if (!profile) return;
    const preset = profile.render_preset || {};
    setForm({
      pipeline_mode: profile.pipeline_mode || 'storyboard_keyframes',
      frame_generation_enabled: !!profile.frame_generation_enabled,
      scene_generation_enabled: !!profile.scene_generation_enabled,
      music_generation_enabled: !!profile.music_generation_enabled,
      sfx_enabled: !!profile.sfx_enabled,
      background_music_enabled: !!profile.background_music_enabled,
      intro_enabled: !!profile.intro_enabled,
      outro_enabled: !!profile.outro_enabled,
      intro_text: profile.intro_text || '',
      outro_text: profile.outro_text || '',
      intro_duration_sec: profile.intro_duration_sec ?? 4,
      outro_duration_sec: profile.outro_duration_sec ?? 4,
      music_prompt: profile.music_prompt || '',
      sfx_prompt: profile.sfx_prompt || '',
      render_preset: {
        width: preset.width ?? 832,
        height: preset.height ?? 480,
        fps: preset.fps ?? 12,
        steps: preset.steps ?? 24,
        cfg: preset.cfg ?? 7,
        denoise: preset.denoise ?? 0.55,
        sampler: preset.sampler || 'euler',
        scheduler: preset.scheduler || 'normal',
      },
    });
  }, [profile]);

  const activeVoices = useMemo(
    () => (voiceActors || []).filter((item) => item.is_active !== false),
    [voiceActors],
  );

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updatePreset = (key, value) => setForm((prev) => ({
    ...prev,
    render_preset: { ...(prev?.render_preset || {}), [key]: value },
  }));

  const handleSaveProfile = async () => {
    if (!form) return;
    await updateProfile.mutateAsync(form);
  };

  const handleCreateVoiceActor = async () => {
    if (!voiceForm.name.trim()) return;
    const payload = new FormData();
    payload.append('name', voiceForm.name.trim());
    payload.append('provider', voiceForm.provider);
    payload.append('external_voice_id', voiceForm.external_voice_id || '');
    payload.append('settings', JSON.stringify({}));
    if (voiceForm.sampleFile) payload.append('voice_sample', voiceForm.sampleFile);
    await createVoiceActor.mutateAsync(payload);
    setVoiceForm({ name: '', provider: 'xtts', external_voice_id: '', sampleFile: null });
  };

  if (isLoading || !form) {
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Production Pipeline</h2>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
            className="btn-primary"
          >
            {updateProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Profile
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <label className="label mb-1">Pipeline Mode</label>
            <select
              value={form.pipeline_mode}
              onChange={(e) => update('pipeline_mode', e.target.value)}
              className="input"
            >
              <option value="storyboard_keyframes">Storyboard Keyframes</option>
              <option value="scene_video">Scene Video</option>
            </select>
          </div>
          <Toggle
            label="Frame Generation"
            checked={form.frame_generation_enabled}
            onChange={(v) => update('frame_generation_enabled', v)}
            hint="Generate per-shot keyframes from storyboard prompts."
          />
          <Toggle
            label="Scene Generator"
            checked={form.scene_generation_enabled}
            onChange={(v) => update('scene_generation_enabled', v)}
            hint="Enable frame-by-frame scene orchestration."
          />
          <Toggle
            label="Music Generator"
            checked={form.music_generation_enabled}
            onChange={(v) => update('music_generation_enabled', v)}
            hint="Generate or compose music tracks per episode."
          />
          <Toggle
            label="Sound Effects"
            checked={form.sfx_enabled}
            onChange={(v) => update('sfx_enabled', v)}
            hint="Include scene-level foley and SFX generation."
          />
          <Toggle
            label="Background Music"
            checked={form.background_music_enabled}
            onChange={(v) => update('background_music_enabled', v)}
            hint="Keep ambient BGM under dialogue."
          />
          <Toggle
            label="Intro + Outro"
            checked={form.intro_enabled || form.outro_enabled}
            onChange={(v) => {
              update('intro_enabled', v);
              update('outro_enabled', v);
            }}
            hint="Include show intro/outro cards in final render."
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="label">Intro Text</label>
            <input
              value={form.intro_text}
              onChange={(e) => update('intro_text', e.target.value)}
              className="input"
              placeholder="Welcome to Milo's World"
            />
          </div>
          <div>
            <label className="label">Outro Text</label>
            <input
              value={form.outro_text}
              onChange={(e) => update('outro_text', e.target.value)}
              className="input"
              placeholder="Thanks for watching"
            />
          </div>
          <div>
            <label className="label">Music Prompt</label>
            <input
              value={form.music_prompt}
              onChange={(e) => update('music_prompt', e.target.value)}
              className="input"
              placeholder="uplifting kids adventure music"
            />
          </div>
          <div>
            <label className="label">SFX Prompt</label>
            <input
              value={form.sfx_prompt}
              onChange={(e) => update('sfx_prompt', e.target.value)}
              className="input"
              placeholder="cartoon foley, sparkles, whooshes"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="label">Width</label>
            <input type="number" value={form.render_preset.width} onChange={(e) => updatePreset('width', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">Height</label>
            <input type="number" value={form.render_preset.height} onChange={(e) => updatePreset('height', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">FPS</label>
            <input type="number" value={form.render_preset.fps} onChange={(e) => updatePreset('fps', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">Steps</label>
            <input type="number" value={form.render_preset.steps} onChange={(e) => updatePreset('steps', Number(e.target.value))} className="input" />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Voice Actors</h2>
          <span className="badge">{activeVoices.length} active</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            value={voiceForm.name}
            onChange={(e) => setVoiceForm((s) => ({ ...s, name: e.target.value }))}
            className="input md:col-span-2"
            placeholder="Voice actor name"
          />
          <select
            value={voiceForm.provider}
            onChange={(e) => setVoiceForm((s) => ({ ...s, provider: e.target.value }))}
            className="input"
          >
            {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
          <input
            value={voiceForm.external_voice_id}
            onChange={(e) => setVoiceForm((s) => ({ ...s, external_voice_id: e.target.value }))}
            className="input"
            placeholder="External voice id"
          />
          <label className="input flex items-center justify-between">
            <span className="truncate text-xs">{voiceForm.sampleFile?.name || 'Sample audio (opt)'}</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setVoiceForm((s) => ({ ...s, sampleFile: e.target.files?.[0] || null }))}
            />
          </label>
        </div>

        <button type="button" onClick={handleCreateVoiceActor} disabled={createVoiceActor.isPending} className="btn-secondary">
          {createVoiceActor.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Voice Actor
        </button>

        <div className="space-y-2">
          {activeVoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Add at least one voice actor so characters can be assigned voice profiles.
            </div>
          ) : activeVoices.map((voice) => (
            <div key={voice.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{voice.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{voice.provider} {voice.external_voice_id ? `- ${voice.external_voice_id}` : ''}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteVoiceActor.mutate(voice.id)}
                className="btn-danger px-3 py-1.5 text-xs"
              >
                <Trash2 size={12} />
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShowProductionPanel;
