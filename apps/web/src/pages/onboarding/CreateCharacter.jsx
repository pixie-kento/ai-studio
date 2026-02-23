import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Loader2, Sparkles, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShows } from '../../hooks/useShows.js';
import { useCreateCharacter } from '../../hooks/useCharacters.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import api from '../../lib/api.js';

const TRAITS = ['Brave', 'Curious', 'Kind', 'Funny', 'Shy', 'Energetic', 'Creative', 'Stubborn', 'Loyal', 'Silly', 'Smart', 'Clumsy'];

export default function CreateCharacter() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows } = useShows(activeWorkspace?.id);
  const firstShow = shows?.[0];
  const createChar = useCreateCharacter(activeWorkspace?.id, firstShow?.id);

  const [form, setForm] = useState({ name: '', age: '', personality_traits: [], role: 'main' });
  const [aiLoading, setAiLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTrait = (t) => update('personality_traits', form.personality_traits.includes(t)
    ? form.personality_traits.filter(x => x !== t)
    : [...form.personality_traits, t]);

  const handleReferenceImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(file);
    setReferenceImagePreview(URL.createObjectURL(file));
  };

  const handleAI = async () => {
    if (!form.name) { toast.error('Add a name first'); return; }
    setAiLoading(true);
    try {
      const { data } = await api.post('/api/ai/character-description', { name: form.name, age: form.age, traits: form.personality_traits });
      setForm(f => ({ ...f, ...data }));
      toast.success('Character description generated!');
    } catch { toast.error('AI generation failed'); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstShow) { toast.error('Create a show first'); return; }

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
    appendField('age', form.age);
    appendField('role', form.role);
    appendField('personality_traits', form.personality_traits);
    appendField('speech_style', form.speech_style);
    appendField('catchphrases', form.catchphrases);
    appendField('visual_description', form.visual_description);
    appendField('clothing_description', form.clothing_description);
    if (referenceImage) payload.append('reference_image', referenceImage);

    await createChar.mutateAsync(payload);
    navigate('/onboarding/setup-complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clapperboard size={32} className="text-white" />
          </div>
          <p className="text-white/60 text-sm mb-2">Step 3 of 4</p>
          <div className="flex gap-1 justify-center mb-6">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1 w-12 rounded-full ${s <= 3 ? 'bg-brand-purple' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Your Main Character</h1>
          <p className="text-slate-500 text-sm mb-8">The star of your show. You can add more characters later.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Character Name</label>
                <input value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="e.g. Milo" required />
              </div>
              <div>
                <label className="label">Age</label>
                <input value={form.age} onChange={e => update('age', e.target.value)} className="input" placeholder="e.g. 6 years old" />
              </div>
            </div>

            <div>
              <label className="label">Personality Traits</label>
              <div className="flex flex-wrap gap-2">
                {TRAITS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrait(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.personality_traits.includes(t) ? 'bg-brand-purple text-white border-brand-purple' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-purple'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {form.personality_traits.length} traits selected
              </p>
              <button
                type="button"
                onClick={handleAI}
                disabled={aiLoading || !form.name}
                className="flex items-center gap-1 text-xs text-brand-purple hover:underline font-medium"
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate character description
              </button>
            </div>

            <div>
              <label className="label">Reference Image (optional)</label>
              <label className="input flex items-center justify-between cursor-pointer">
                <span className="text-slate-500 text-sm">{referenceImage ? referenceImage.name : 'Upload character image'}</span>
                <span className="text-brand-purple text-xs font-medium inline-flex items-center gap-1">
                  <Upload size={12} />
                  Browse
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleReferenceImageChange} />
              </label>
              {referenceImagePreview && (
                <img
                  src={referenceImagePreview}
                  alt="character reference preview"
                  className="mt-3 w-20 h-20 rounded-lg object-cover border border-slate-200"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => navigate('/onboarding/create-show')} className="btn-secondary flex-1 py-3 justify-center">← Back</button>
              <button type="submit" disabled={createChar.isPending} className="btn-primary flex-1 py-3 justify-center">
                {createChar.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Continue →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
