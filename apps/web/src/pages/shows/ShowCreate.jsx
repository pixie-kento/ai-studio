import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCreateShow } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

const AGE_GROUPS = ['3-5', '4-6', '5-7', '6-8', '7-10'];

export default function ShowCreate() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const [form, setForm] = useState({ name: '', description: '', tagline: '', target_age: '4-6', style_prompt: '' });
  const createShow = useCreateShow(activeWorkspace?.id);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const show = await createShow.mutateAsync(form);
    if (show) navigate(`/shows/${show.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Create New Show</h1>
        <p className="text-slate-500">Set up a new cartoon show for your workspace</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Show Name *</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="e.g. Milo's World" required />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input type="text" value={form.tagline} onChange={e => update('tagline', e.target.value)} className="input" placeholder="A short catchy description" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} className="input min-h-24 resize-none" placeholder="What is this show about?" />
          </div>
          <div>
            <label className="label">Target Age Group</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(age => (
                <button key={age} type="button" onClick={() => update('target_age', age)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${form.target_age === age ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-200 text-slate-600 hover:border-brand-purple'}`}>
                  Ages {age}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Style Prompt (ComfyUI)</label>
            <textarea value={form.style_prompt} onChange={e => update('style_prompt', e.target.value)} className="input min-h-20 resize-none font-mono text-xs" placeholder="cartoon style, bright colors, children's animation, Disney-style..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/shows')} className="btn-secondary flex-1 justify-center py-3">Cancel</button>
            <button type="submit" disabled={createShow.isPending} className="btn-primary flex-1 justify-center py-3">
              {createShow.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Create Show'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
