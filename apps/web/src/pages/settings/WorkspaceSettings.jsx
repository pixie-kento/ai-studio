import { useState, useEffect, useRef } from 'react';
import { Loader2, Save, Upload, Server, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWorkspace, useUpdateWorkspace } from '../../hooks/useWorkspace.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import api from '../../lib/api.js';
import { getPBFileUrl } from '../../lib/utils.js';

const AGE_GROUPS = ['toddlers', 'preschool', 'kids', 'tweens', 'all-ages'];
const STYLES = ['3d-animation', '2d-cartoon', 'anime', 'clay', 'puppets', 'mixed-media'];

export default function WorkspaceSettings() {
  const { activeWorkspace } = useWorkspaceStore();
  const { data: workspace, isLoading } = useWorkspace(activeWorkspace?.id);
  const updateWs = useUpdateWorkspace(activeWorkspace?.id);
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [testingServer, setTestingServer] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (workspace) {
      setForm({ ...workspace });
      setDirty(false);
    }
  }, [workspace]);

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  const handleSave = async () => {
    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== undefined) payload.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
    });
    if (logoFile) payload.append('logo', logoFile);
    try {
      await updateWs.mutateAsync(form);
      setDirty(false);
      toast.success('Workspace saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleTestServer = async () => {
    setTestingServer(true);
    try {
      const { data } = await api.get(`/api/workspaces/${activeWorkspace.id}/pipeline/health`);
      if (data.renderServer?.connected) {
        toast.success('Render server connected!');
      } else {
        toast.error('Render server unreachable');
      }
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTestingServer(false);
    }
  };

  const logoUrl = logoPreview || (workspace?.logo ? getPBFileUrl(workspace, workspace.logo, '128x128') : null);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">Workspace Settings</h1>
        {dirty && (
          <button onClick={handleSave} disabled={updateWs.isPending} className="btn-primary">
            {updateWs.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        )}
      </div>

      {/* General */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900">General</h2>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">{form.name?.[0] || '?'}</div>
            }
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Workspace Logo</p>
            <button type="button" onClick={() => fileRef.current.click()} className="btn-secondary text-sm">
              <Upload size={14} /> Upload Logo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
          </div>
        </div>

        <div>
          <label className="label">Workspace Name</label>
          <input value={form.name || ''} onChange={e => update('name', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Slug</label>
          <input value={form.slug || ''} onChange={e => update('slug', e.target.value)} className="input font-mono text-sm" />
          <p className="text-xs text-slate-400 mt-1">Used in URLs. Only letters, numbers, and hyphens.</p>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Key size={16} /> AI Configuration
        </h2>
        <div>
          <label className="label">OpenAI API Key (optional override)</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.openai_api_key || ''}
              onChange={e => update('openai_api_key', e.target.value)}
              className="input pr-10"
              placeholder="sk-... (leave blank to use platform key)"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Use your own OpenAI key to avoid platform rate limits.</p>
        </div>
      </div>

      {/* Render Server */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Server size={16} /> Custom Render Server
        </h2>
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Only available on Studio plan. Leave blank to use the shared render server.</span>
        </div>
        <div>
          <label className="label">Render Server URL</label>
          <input
            value={form.custom_render_url || ''}
            onChange={e => update('custom_render_url', e.target.value)}
            className="input font-mono text-sm"
            placeholder="https://your-comfyui-server.ngrok.io"
          />
        </div>
        <div>
          <label className="label">Render Server Key</label>
          <input
            type="password"
            value={form.custom_render_key || ''}
            onChange={e => update('custom_render_key', e.target.value)}
            className="input font-mono text-sm"
            placeholder="Secret key for webhook validation"
          />
        </div>
        <button
          type="button"
          onClick={handleTestServer}
          disabled={testingServer || !form.custom_render_url}
          className="btn-secondary"
        >
          {testingServer ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
          Test Connection
        </button>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200 space-y-4">
        <h2 className="font-bold text-red-600">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Delete Workspace</p>
            <p className="text-xs text-slate-500">Permanently delete this workspace and all its data.</p>
          </div>
          <button className="btn-danger text-sm" onClick={() => toast.error('Contact support to delete a workspace')}>
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
