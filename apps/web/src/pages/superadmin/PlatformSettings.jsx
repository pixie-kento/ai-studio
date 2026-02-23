import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Server, Key, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api.js';

function SecretInput({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input pr-10 font-mono text-sm"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function PlatformSettings() {
  const [renderServer, setRenderServer] = useState({ url: '', key: '' });
  const [openai, setOpenai] = useState({ key: '', model: 'gpt-4o' });
  const [stripe, setStripe] = useState({ publishable: '', secret: '', webhookSecret: '' });
  const [saving, setSaving] = useState(null);
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  const { data: settings } = useQuery({
    queryKey: ['superadmin', 'settings'],
    queryFn: () => api.get('/api/superadmin/settings').then(r => r.data),
  });

  useEffect(() => {
    if (settings) {
      if (settings.renderServer) setRenderServer({ url: settings.renderServer.url || '', key: '' });
      if (settings.openai) setOpenai({ key: '', model: settings.openai.model || 'gpt-4o' });
      if (settings.stripe) setStripe({ publishable: settings.stripe.publishableKey || '', secret: '', webhookSecret: '' });
    }
  }, [settings]);

  const handleSaveRenderServer = async () => {
    setSaving('render');
    try {
      await api.post('/api/superadmin/render-server', renderServer);
      toast.success('Render server settings saved');
    } catch {
      toast.error('Failed to save render server settings');
    } finally {
      setSaving(null);
    }
  };

  const handleTestServer = async () => {
    setTestingServer(true);
    setServerStatus(null);
    try {
      const { data } = await api.get('/api/pipeline/health');
      setServerStatus(data.renderServer?.connected ? 'ok' : 'error');
      toast[data.renderServer?.connected ? 'success' : 'error'](
        data.renderServer?.connected ? 'Render server connected!' : 'Render server unreachable'
      );
    } catch {
      setServerStatus('error');
      toast.error('Connection test failed');
    } finally {
      setTestingServer(false);
    }
  };

  const handleSaveOpenAI = async () => {
    setSaving('openai');
    try {
      await api.post('/api/superadmin/settings/openai', openai);
      toast.success('OpenAI settings saved');
    } catch {
      toast.error('Failed to save OpenAI settings');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveStripe = async () => {
    setSaving('stripe');
    try {
      await api.post('/api/superadmin/settings/stripe', stripe);
      toast.success('Stripe settings saved. Restart the API server to apply.');
    } catch {
      toast.error('Failed to save Stripe settings');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Platform Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure global platform infrastructure and API keys.</p>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <span>These settings affect the entire platform. Changes may require an API server restart to take effect.</span>
      </div>

      {/* Render Server */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Server size={16} /> Global Render Server
        </h2>
        <div>
          <label className="label">Render Server URL</label>
          <input
            value={renderServer.url}
            onChange={e => setRenderServer(s => ({ ...s, url: e.target.value }))}
            className="input font-mono text-sm"
            placeholder="https://your-comfyui-server.ngrok.io"
          />
          <p className="text-xs text-slate-400 mt-1">The ngrok/tunnel URL where ComfyUI is running.</p>
        </div>
        <SecretInput
          label="Render Server Webhook Key"
          value={renderServer.key}
          onChange={v => setRenderServer(s => ({ ...s, key: v }))}
          placeholder="Leave blank to keep existing key"
          hint="Secret key sent in X-Render-Server-Key header for webhook validation."
        />
        <div className="flex items-center gap-3">
          <button onClick={handleSaveRenderServer} disabled={saving === 'render'} className="btn-primary">
            {saving === 'render' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
          <button onClick={handleTestServer} disabled={testingServer || !renderServer.url} className="btn-secondary">
            {testingServer ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Test Connection
          </button>
          {serverStatus === 'ok' && <CheckCircle size={18} className="text-green-500" />}
          {serverStatus === 'error' && <AlertTriangle size={18} className="text-red-500" />}
        </div>
      </div>

      {/* OpenAI */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Key size={16} /> OpenAI Configuration
        </h2>
        <SecretInput
          label="OpenAI API Key"
          value={openai.key}
          onChange={v => setOpenai(s => ({ ...s, key: v }))}
          placeholder="sk-… (leave blank to keep existing)"
          hint="Used for all AI generation (script, moral, ComfyUI prompts) unless overridden per workspace."
        />
        <div>
          <label className="label">Default Model</label>
          <select
            value={openai.model}
            onChange={e => setOpenai(s => ({ ...s, model: e.target.value }))}
            className="input w-48"
          >
            <option value="gpt-4o">GPT-4o (Recommended)</option>
            <option value="gpt-4o-mini">GPT-4o Mini (Faster/Cheaper)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">Model used for all generation tasks. GPT-4o gives best results.</p>
        </div>
        <button onClick={handleSaveOpenAI} disabled={saving === 'openai'} className="btn-primary">
          {saving === 'openai' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save OpenAI Settings
        </button>
      </div>

      {/* Stripe */}
      <div className="card space-y-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Key size={16} /> Stripe Configuration
        </h2>
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          Changes to Stripe keys require an API server restart. Set these in your <code className="font-mono bg-blue-100 px-1 rounded">.env</code> file for production.
        </div>
        <div>
          <label className="label">Publishable Key</label>
          <input
            value={stripe.publishable}
            onChange={e => setStripe(s => ({ ...s, publishable: e.target.value }))}
            className="input font-mono text-sm"
            placeholder="pk_live_… or pk_test_…"
          />
        </div>
        <SecretInput
          label="Secret Key"
          value={stripe.secret}
          onChange={v => setStripe(s => ({ ...s, secret: v }))}
          placeholder="sk_live_… or sk_test_… (leave blank to keep)"
        />
        <SecretInput
          label="Webhook Signing Secret"
          value={stripe.webhookSecret}
          onChange={v => setStripe(s => ({ ...s, webhookSecret: v }))}
          placeholder="whsec_… (leave blank to keep)"
          hint="Found in Stripe Dashboard → Webhooks. Used to validate webhook events."
        />
        <button onClick={handleSaveStripe} disabled={saving === 'stripe'} className="btn-primary">
          {saving === 'stripe' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Stripe Settings
        </button>
      </div>

      {/* Plan prices info */}
      <div className="card space-y-3">
        <h2 className="font-bold text-slate-900">Plan Price IDs</h2>
        <p className="text-sm text-slate-500">Update price IDs in <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">apps/api/src/services/stripe.js</code> after creating products in Stripe.</p>
        <div className="bg-slate-50 rounded-xl p-4 font-mono text-xs space-y-2 text-slate-600">
          <div className="flex justify-between">
            <span className="text-blue-600">starter</span>
            <span>STRIPE_PRICE_STARTER_MONTHLY / _YEARLY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-600">pro</span>
            <span>STRIPE_PRICE_PRO_MONTHLY / _YEARLY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600">studio</span>
            <span>STRIPE_PRICE_STUDIO_MONTHLY / _YEARLY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
