import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useRegister } from '../../hooks/useAuth.js';

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$19/mo', description: '1 show, core pipeline controls' },
  { id: 'pro', name: 'Pro', price: '$49/mo', description: '3 shows, team workflow, publish tools', popular: true },
  { id: 'studio', name: 'Studio', price: '$99/mo', description: 'Unlimited scale, priority rendering' },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', plan: 'starter' });
  const [showPw, setShowPw] = useState(false);
  const register = useRegister();

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleStep1 = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = (plan) => {
    update('plan', plan);
    setStep(3);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    register.mutate(form);
  };

  return (
    <div className="public-shell-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple text-white shadow-[0_14px_26px_-16px_rgba(91,117,255,0.95)]">
              <Clapperboard size={20} />
            </div>
            <div className="text-left">
              <span className="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">StudioAI</span>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Show OS</p>
            </div>
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
                  s < step
                    ? 'bg-[var(--app-success)] text-white'
                    : s === step
                      ? 'bg-brand-purple text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400',
                ].join(' ')}
              >
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${s < step ? 'bg-[var(--app-success)]' : 'bg-slate-300 dark:bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 md:p-8">
          {step === 1 && (
            <>
              <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Create your account</h1>
              <p className="mb-7 text-sm text-slate-500 dark:text-slate-300">14-day trial. No card required.</p>
              <form onSubmit={handleStep1} className="space-y-5">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => update('displayName', e.target.value)}
                    className="input"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="input"
                    placeholder="jane@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      className="input pr-10"
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3 text-base">Continue</button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Pick your plan</h1>
              <p className="mb-7 text-sm text-slate-500 dark:text-slate-300">You can upgrade or downgrade anytime.</p>
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleStep2(plan.id)}
                    className={[
                      'relative w-full rounded-xl border p-4 text-left transition-all',
                      form.plan === plan.id
                        ? 'border-brand-purple bg-brand-purple-light/55 dark:bg-brand-purple/20'
                        : 'border-slate-200 hover:border-brand-purple/50 dark:border-white/10 dark:hover:border-brand-purple/40',
                    ].join(' ')}
                  >
                    {plan.popular && <span className="badge absolute right-3 top-3">Popular</span>}
                    <div className="font-bold text-slate-900 dark:text-slate-100">{plan.name} - {plan.price}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{plan.description}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setStep(1)} className="mt-4 text-sm text-slate-500 hover:underline dark:text-slate-300">
                Back
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Start your trial</h1>
              <p className="mb-6 text-sm text-slate-500 dark:text-slate-300">
                Confirm details and launch your workspace on the <strong className="capitalize text-brand-purple">{form.plan}</strong> plan.
              </p>

              <div className="mb-6 space-y-2 rounded-xl border border-slate-200 bg-white/65 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Name</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{form.displayName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Email</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{form.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Plan</span>
                  <span className="font-medium capitalize text-slate-900 dark:text-slate-100">{form.plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Trial</span>
                  <span className="font-medium text-[var(--app-success)]">14 days free</span>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <button type="submit" disabled={register.isPending} className="btn-primary w-full justify-center py-3 text-base">
                  {register.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Create account'}
                </button>
              </form>

              <button type="button" onClick={() => setStep(2)} className="mt-4 text-sm text-slate-500 hover:underline dark:text-slate-300">
                Back
              </button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-purple hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
