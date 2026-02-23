import { useState } from 'react';
import { Check, Zap, Star, Crown, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan.js';
import api from '../../lib/api.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Star,
    color: 'text-blue-500',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    priceMonthly: 19,
    priceYearly: 15,
    description: 'Perfect for individual creators getting started.',
    features: [
      '2 shows',
      '4 characters per show',
      '8 episodes per month',
      'Standard render queue',
      'Basic support',
    ],
    limits: { shows: 2, characters: 4, episodes: 8 },
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    color: 'text-brand-purple',
    border: 'border-brand-purple',
    bg: 'bg-purple-50',
    priceMonthly: 49,
    priceYearly: 39,
    description: 'For growing studios producing regular content.',
    popular: true,
    features: [
      '5 shows',
      '10 characters per show',
      '20 episodes per month',
      'Priority render queue',
      'YouTube publishing',
      'Priority support',
    ],
    limits: { shows: 5, characters: 10, episodes: 20 },
  },
  {
    id: 'studio',
    name: 'Studio',
    icon: Crown,
    color: 'text-amber-500',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    priceMonthly: 99,
    priceYearly: 79,
    description: 'Unlimited everything for professional studios.',
    features: [
      'Unlimited shows',
      'Unlimited characters',
      'Unlimited episodes',
      'Top priority rendering',
      'YouTube publishing',
      'Custom render server',
      'Dedicated support',
    ],
    limits: { shows: -1, characters: -1, episodes: -1 },
  },
];

export default function Plans() {
  const { activeWorkspace } = useWorkspaceStore();
  const { plan, limits, usage } = usePlan();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(null);
  const [showUsage, setShowUsage] = useState(false);

  const handleCheckout = async (planId) => {
    if (planId === plan) return;
    setLoading(planId);
    try {
      const { data } = await api.post('/api/billing/checkout', {
        workspaceId: activeWorkspace.id,
        plan: planId,
        interval: yearly ? 'yearly' : 'monthly',
        successUrl: `${window.location.origin}/billing/plans`,
        cancelUrl: window.location.href,
      });
      window.location.href = data.url;
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading('portal');
    try {
      const { data } = await api.post('/api/billing/portal', {
        workspaceId: activeWorkspace.id,
        returnUrl: window.location.href,
      });
      window.location.href = data.url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  };

  const usageItems = [
    { label: 'Shows', used: usage?.shows || 0, limit: limits.shows },
    { label: 'Characters per show', used: null, limit: limits.characters_per_show },
    { label: 'Episodes this month', used: usage?.episodes_this_month || 0, limit: limits.episodes_per_month },
    { label: 'Team members', used: usage?.team_members || 0, limit: limits.team_members },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Plans & Billing</h1>
          <p className="text-slate-500 mt-1">Manage your subscription and usage.</p>
        </div>
        <button onClick={handlePortal} disabled={loading === 'portal'} className="btn-secondary">
          {loading === 'portal' ? <Loader2 size={16} className="animate-spin" /> : null}
          Billing Portal
        </button>
      </div>

      {/* Current plan + usage */}
      <div className="card">
        <button
          onClick={() => setShowUsage(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
              {plan === 'studio' ? <Crown size={20} className="text-amber-500" /> :
               plan === 'pro' ? <Zap size={20} className="text-brand-purple" /> :
               <Star size={20} className="text-blue-500" />}
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500">Current plan</p>
              <p className="font-bold text-slate-900 capitalize">{plan || 'Starter'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-sm">Usage breakdown</span>
            {showUsage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showUsage && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {usageItems.map(item => {
              const unlimited = item.limit === -1;
              const pct = unlimited || item.used === null ? 0 : Math.min(100, (item.used / item.limit) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-medium text-slate-900">
                      {item.used !== null ? `${item.used} / ` : ''}
                      {unlimited ? '∞' : item.limit}
                    </span>
                  </div>
                  {item.used !== null && !unlimited && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-brand-purple'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yearly toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${!yearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
        <button
          onClick={() => setYearly(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-brand-purple' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${yearly ? 'left-7' : 'left-1'}`} />
        </button>
        <span className={`text-sm font-medium ${yearly ? 'text-slate-900' : 'text-slate-400'}`}>
          Yearly <span className="text-green-600 font-bold text-xs ml-1">Save 20%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(p => {
          const Icon = p.icon;
          const isCurrent = (plan || 'starter') === p.id;
          const price = yearly ? p.priceYearly : p.priceMonthly;

          return (
            <div
              key={p.id}
              className={`relative card border-2 transition-all ${isCurrent ? `${p.border} ${p.bg}` : 'border-slate-200 hover:border-slate-300'} ${p.popular ? 'shadow-lg' : ''}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-purple text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className={p.color} />
                <h3 className="font-bold text-slate-900">{p.name}</h3>
                {isCurrent && <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Current</span>}
              </div>

              <div className="mb-3">
                <span className="text-3xl font-black text-slate-900">${price}</span>
                <span className="text-slate-500 text-sm">/{yearly ? 'mo, billed yearly' : 'mo'}</span>
              </div>

              <p className="text-sm text-slate-500 mb-4">{p.description}</p>

              <ul className="space-y-2 mb-6">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check size={14} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => isCurrent ? null : handleCheckout(p.id)}
                disabled={isCurrent || loading === p.id}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : p.popular
                    ? 'bg-brand-purple text-white hover:bg-purple-700'
                    : 'border-2 border-slate-200 text-slate-700 hover:border-brand-purple hover:text-brand-purple'
                }`}
              >
                {loading === p.id ? <Loader2 size={16} className="animate-spin" /> : null}
                {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-slate-400">
        All plans include a 14-day free trial. Cancel anytime via the billing portal.
      </p>
    </div>
  );
}
