import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateShow } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import api from '../../lib/api.js';

const AGE_GROUPS = ['3-5', '4-6', '5-7', '6-8', '7-10'];

export default function CreateShow() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const [form, setForm] = useState({ name: '', description: '', target_age: '4-6' });
  const [aiLoading, setAiLoading] = useState(false);
  const createShow = useCreateShow(activeWorkspace?.id);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSuggestName = async () => {
    if (!form.description) { toast.error('Add a description first'); return; }
    setAiLoading(true);
    try {
      const { data } = await api.post('/api/ai/show-names', { description: form.description });
      if (data.suggestions?.length > 0) {
        update('name', data.suggestions[0]);
        toast.success('Name suggested! Feel free to edit it.');
      }
    } catch { toast.error('AI suggestion failed'); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    const show = await createShow.mutateAsync(form);
    if (show) navigate('/onboarding/create-character');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clapperboard size={32} className="text-white" />
          </div>
          <p className="text-white/60 text-sm mb-2">Step 2 of 4</p>
          <div className="flex gap-1 justify-center mb-6">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1 w-12 rounded-full ${s <= 2 ? 'bg-brand-purple' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Your Show</h1>
          <p className="text-slate-500 text-sm mb-8">This is your cartoon show. You can change everything later.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Description (helps AI suggest names)</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                className="input min-h-24 resize-none"
                placeholder="A cartoon about a curious bear cub who explores the forest and learns valuable lessons with his friends..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Show Name</label>
                <button
                  type="button"
                  onClick={handleSuggestName}
                  disabled={aiLoading}
                  className="flex items-center gap-1 text-xs text-brand-purple hover:underline font-medium"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Suggest a name
                </button>
              </div>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                className="input"
                placeholder="e.g. Milo's World"
                required
              />
            </div>

            <div>
              <label className="label">Target Age Group</label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map(age => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => update('target_age', age)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${form.target_age === age ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-200 text-slate-600 hover:border-brand-purple'}`}
                  >
                    Ages {age}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => navigate('/onboarding/welcome')} className="btn-secondary flex-1 py-3 justify-center">← Back</button>
              <button type="submit" disabled={createShow.isPending} className="btn-primary flex-1 py-3 justify-center">
                {createShow.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Continue →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
