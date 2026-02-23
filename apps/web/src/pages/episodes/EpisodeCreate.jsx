import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../lib/api.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const THEMES = ['friendship', 'courage', 'honesty', 'sharing_kindness', 'never_give_up', 'other'];

export default function EpisodeCreate() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', moral: '', theme: 'other', summary: '', script: '' });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(`/api/workspaces/${activeWorkspace?.id}/shows/${showId}/episodes`, form);
      qc.invalidateQueries({ queryKey: ['episodes', activeWorkspace?.id, showId] });
      toast.success('Episode created!');
      navigate(`/shows/${showId}/episodes/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create episode');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-slate-400 mb-1">
          <Link to={`/shows/${showId}`} className="hover:text-brand-purple">Show</Link> /{' '}
          <Link to={`/shows/${showId}/episodes`} className="hover:text-brand-purple">Episodes</Link> / New
        </p>
        <h1 className="text-2xl font-black text-slate-900">Create Episode Manually</h1>
        <p className="text-slate-500 text-sm">Provide your own script instead of using AI generation.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Episode Title</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} className="input" placeholder="e.g. The Lost Treasure" />
          </div>
          <div>
            <label className="label">Moral</label>
            <input value={form.moral} onChange={e => update('moral', e.target.value)} className="input" placeholder="e.g. Sharing makes everyone happy" />
          </div>
          <div>
            <label className="label">Theme</label>
            <select value={form.theme} onChange={e => update('theme', e.target.value)} className="input">
              {THEMES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Summary</label>
            <textarea value={form.summary} onChange={e => update('summary', e.target.value)} className="input min-h-20 resize-none" placeholder="Brief description of the episode..." />
          </div>
          <div>
            <label className="label">Script</label>
            <textarea value={form.script} onChange={e => update('script', e.target.value)} className="input min-h-64 resize-y font-mono text-xs" placeholder="[SCENE 1]&#10;SETTING: ...&#10;DIALOGUE: ...&#10;NARRATION: ..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(`/shows/${showId}/episodes`)} className="btn-secondary flex-1 justify-center py-3">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Episode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
