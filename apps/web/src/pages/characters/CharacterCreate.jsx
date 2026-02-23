import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Sparkles, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { useCreateCharacter } from '../../hooks/useCharacters.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

const TRAITS = [
  'Brave',
  'Curious',
  'Kind',
  'Funny',
  'Shy',
  'Energetic',
  'Creative',
  'Stubborn',
  'Loyal',
  'Silly',
  'Smart',
  'Clumsy',
  'Adventurous',
  'Gentle',
  'Mischievous',
];

const ROLES = ['main', 'supporting', 'recurring', 'background'];
const STEPS = ['Basic Info', 'Personality', 'Visual', 'Review'];

export default function CharacterCreate() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const createCharacter = useCreateCharacter(activeWorkspace?.id, showId);

  const [step, setStep] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState('');

  const [form, setForm] = useState({
    name: '',
    role: 'main',
    age: '',
    personality_traits: [],
    speech_style: '',
    catchphrases: [],
    visual_description: '',
    clothing_description: '',
    comfyui_positive_prompt: '',
    comfyui_negative_prompt: '',
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleTrait = (trait) =>
    update(
      'personality_traits',
      form.personality_traits.includes(trait)
        ? form.personality_traits.filter((value) => value !== trait)
        : [...form.personality_traits, trait],
    );

  const handleReferenceImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setReferenceImage(file);
    setReferenceImagePreview(URL.createObjectURL(file));
  };

  const handleAI = async () => {
    if (!form.name) {
      toast.error('Name is required first');
      return;
    }

    setAiLoading(true);
    try {
      const { data } = await api.post('/api/ai/character-description', {
        name: form.name,
        age: form.age,
        traits: form.personality_traits,
      });
      setForm((prev) => ({ ...prev, ...data }));
      toast.success('Character details generated');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setAiLoading(true);
    try {
      const basePrompt = [
        form.name,
        form.visual_description,
        form.clothing_description,
        'cartoon character',
        "children's animation style",
      ]
        .filter(Boolean)
        .join(', ');

      update('comfyui_positive_prompt', basePrompt);
      update('comfyui_negative_prompt', 'photorealistic, horror, gore, adult content, blurry');
      toast.success('ComfyUI prompts generated');
    } catch {
      toast.error('Prompt generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error('Character name is required');
      return;
    }

    const payload = new FormData();
    const appendField = (key, value) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        payload.append(key, JSON.stringify(value));
        return;
      }
      payload.append(key, String(value));
    };

    appendField('name', form.name);
    appendField('role', form.role);
    appendField('age', form.age);
    appendField('personality_traits', form.personality_traits);
    appendField('speech_style', form.speech_style);
    appendField('catchphrases', form.catchphrases);
    appendField('visual_description', form.visual_description);
    appendField('clothing_description', form.clothing_description);
    appendField('comfyui_positive_prompt', form.comfyui_positive_prompt);
    appendField('comfyui_negative_prompt', form.comfyui_negative_prompt);

    if (referenceImage) payload.append('reference_image', referenceImage);

    await createCharacter.mutateAsync(payload);
    navigate(`/shows/${showId}/characters`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mb-1 text-sm text-slate-400">
          <Link to={`/shows/${showId}`} className="hover:text-brand-purple">
            Show
          </Link>{' '}
          / Characters / New
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Create character</h1>
      </div>

      <div className="card">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={[
                  'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                  index < step
                    ? 'bg-emerald-500 text-white'
                    : index === step
                      ? 'bg-brand-purple text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400',
                ].join(' ')}
              >
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              <span
                className={[
                  'text-xs font-semibold uppercase tracking-[0.08em]',
                  index === step ? 'text-brand-purple' : 'text-slate-400',
                ].join(' ')}
              >
                {label}
              </span>
              {index < STEPS.length - 1 ? <span className="mx-1 h-px w-5 bg-slate-300 dark:bg-white/15" /> : null}
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {step === 0 ? (
            <>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Basic information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Name *</label>
                  <input
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    className="input"
                    placeholder="Milo"
                    required
                  />
                </div>
                <div>
                  <label className="label">Age</label>
                  <input
                    value={form.age}
                    onChange={(event) => update('age', event.target.value)}
                    className="input"
                    placeholder="6"
                  />
                </div>
              </div>
              <div>
                <label className="label">Role</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => update('role', role)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-all',
                        form.role === role
                          ? 'border-brand-purple bg-brand-purple text-white'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:border-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
                      ].join(' ')}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Personality</h2>
                <button
                  type="button"
                  onClick={handleAI}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-purple"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate
                </button>
              </div>

              <div>
                <label className="label">Personality traits</label>
                <div className="flex flex-wrap gap-2">
                  {TRAITS.map((trait) => (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => toggleTrait(trait)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                        form.personality_traits.includes(trait)
                          ? 'border-brand-purple bg-brand-purple text-white'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:border-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
                      ].join(' ')}
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Speech style</label>
                <input
                  value={form.speech_style}
                  onChange={(event) => update('speech_style', event.target.value)}
                  className="input"
                  placeholder="Energetic, playful, curious"
                />
              </div>

              <div>
                <label className="label">Catchphrases (one per line)</label>
                <textarea
                  value={(form.catchphrases || []).join('\n')}
                  onChange={(event) =>
                    update(
                      'catchphrases',
                      event.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean),
                    )
                  }
                  className="input min-h-24 resize-none"
                  placeholder={"Let's go explore!\nI have an idea!"}
                />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Visual references</h2>
                <button
                  type="button"
                  onClick={handleGeneratePrompts}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-purple"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate prompts
                </button>
              </div>

              <div>
                <label className="label">Visual description</label>
                <textarea
                  value={form.visual_description}
                  onChange={(event) => update('visual_description', event.target.value)}
                  className="input min-h-24 resize-none"
                  placeholder="Hair, eyes, body shape, visual style notes..."
                />
              </div>

              <div>
                <label className="label">Clothing description</label>
                <textarea
                  value={form.clothing_description}
                  onChange={(event) => update('clothing_description', event.target.value)}
                  className="input min-h-20 resize-none"
                  placeholder="Signature outfit, accessories, colors..."
                />
              </div>

              <div>
                <label className="label">ComfyUI positive prompt</label>
                <textarea
                  value={form.comfyui_positive_prompt}
                  onChange={(event) => update('comfyui_positive_prompt', event.target.value)}
                  className="input min-h-24 resize-none font-mono text-xs"
                  placeholder="cartoon character, clean line art, colorful..."
                />
              </div>

              <div>
                <label className="label">ComfyUI negative prompt</label>
                <textarea
                  value={form.comfyui_negative_prompt}
                  onChange={(event) => update('comfyui_negative_prompt', event.target.value)}
                  className="input min-h-20 resize-none font-mono text-xs"
                  placeholder="realistic, blurry, horror..."
                />
              </div>

              <div>
                <label className="label">Reference image</label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm text-slate-500 transition-all hover:border-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <span className="truncate pr-3">{referenceImage ? referenceImage.name : 'Upload character image (optional)'}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-purple">
                    <Upload size={12} />
                    Browse
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleReferenceImageChange} />
                </label>
                {referenceImagePreview ? (
                  <img
                    src={referenceImagePreview}
                    alt="Reference preview"
                    className="mt-3 h-24 w-24 rounded-xl border border-slate-200 object-cover dark:border-white/10"
                  />
                ) : null}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Review</h2>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-300">Name</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{form.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-300">Role</span>
                  <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">{form.role}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-300">Age</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{form.age || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-300">Traits</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{form.personality_traits.length}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((prev) => prev - 1) : navigate(`/shows/${showId}/characters`))}
            className="btn-secondary w-full justify-center py-2.5"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 0 && !form.name) {
                  toast.error('Name is required');
                  return;
                }
                setStep((prev) => prev + 1);
              }}
              className="btn-primary w-full justify-center py-2.5"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createCharacter.isPending}
              className="btn-primary w-full justify-center py-2.5"
            >
              {createCharacter.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create character'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
