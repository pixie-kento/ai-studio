import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShow, useUpdateShow, useDeleteShow } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { ShowProductionPanel } from '../../components/production/ShowProductionPanel.jsx';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function ShowSettings() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: show, isLoading } = useShow(activeWorkspace?.id, showId);
  const updateShow = useUpdateShow(activeWorkspace?.id, showId);
  const deleteShow = useDeleteShow(activeWorkspace?.id, showId);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (show) setForm({
      name: show.name || '',
      description: show.description || '',
      tagline: show.tagline || '',
      target_age: show.target_age || '4-6',
      style_prompt: show.style_prompt || '',
      youtube_channel_id: show.youtube_channel_id || '',
      youtube_playlist_id: show.youtube_playlist_id || '',
      schedule_enabled: show.schedule_enabled || false,
      schedule_day: show.schedule_day || 'monday',
      schedule_time: show.schedule_time || '09:00',
      schedule_timezone: show.schedule_timezone || 'UTC',
      openai_model: show.openai_model || 'gpt-4o',
    });
  }, [show]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    await updateShow.mutateAsync(form);
    toast.success('Show settings saved');
  };

  const handleArchiveShow = async () => {
    const ok = window.confirm('Archive this show? You can keep data, but it will no longer be active.');
    if (!ok) return;
    await deleteShow.mutateAsync();
    navigate('/shows');
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-slate-400 mb-1"><Link to="/shows" className="hover:text-brand-purple">Shows</Link> / <Link to={`/shows/${showId}`} className="hover:text-brand-purple">{show?.name}</Link> / Settings</p>
        <h1 className="text-2xl font-black text-slate-900">Show Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-bold text-slate-900">Basic Info</h2>
          <div>
            <label className="label">Show Name</label>
            <input value={form.name || ''} onChange={e => update('name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input value={form.tagline || ''} onChange={e => update('tagline', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description || ''} onChange={e => update('description', e.target.value)} className="input min-h-20 resize-none" />
          </div>
          <div>
            <label className="label">AI Model</label>
            <select value={form.openai_model || 'gpt-4o'} onChange={e => update('openai_model', e.target.value)} className="input">
              <option value="gpt-4o">GPT-4o (Best quality)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster/cheaper)</option>
            </select>
          </div>
          <div>
            <label className="label">ComfyUI Style Prompt</label>
            <textarea value={form.style_prompt || ''} onChange={e => update('style_prompt', e.target.value)} className="input min-h-20 resize-none font-mono text-xs" placeholder="cartoon style, bright colors..." />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-bold text-slate-900">YouTube Integration</h2>
          <div>
            <label className="label">Channel ID</label>
            <input value={form.youtube_channel_id || ''} onChange={e => update('youtube_channel_id', e.target.value)} className="input" placeholder="UCxxxxxxxx" />
          </div>
          <div>
            <label className="label">Playlist ID</label>
            <input value={form.youtube_playlist_id || ''} onChange={e => update('youtube_playlist_id', e.target.value)} className="input" placeholder="PLxxxxxxxx" />
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Weekly Schedule</h2>
            <button type="button" onClick={() => update('schedule_enabled', !form.schedule_enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.schedule_enabled ? 'bg-brand-purple' : 'bg-slate-200'}`}>
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${form.schedule_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.schedule_enabled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Day</label>
                <select value={form.schedule_day || 'monday'} onChange={e => update('schedule_day', e.target.value)} className="input capitalize">
                  {DAYS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" value={form.schedule_time || '09:00'} onChange={e => update('schedule_time', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Timezone</label>
                <input value={form.schedule_timezone || 'UTC'} onChange={e => update('schedule_timezone', e.target.value)} className="input" placeholder="UTC" />
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={updateShow.isPending} className="btn-primary py-3 px-6">
          {updateShow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Settings
        </button>
        <button
          type="button"
          onClick={handleArchiveShow}
          disabled={deleteShow.isPending}
          className="btn-danger py-3 px-6"
        >
          {deleteShow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Archive Show
        </button>
      </form>

      <ShowProductionPanel
        workspaceId={activeWorkspace?.id}
        showId={showId}
      />
    </div>
  );
}
