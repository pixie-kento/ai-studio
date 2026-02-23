import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clapperboard, Sparkles } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 19,
    yearly: 182,
    summary: 'For solo creators validating a new show format.',
    features: [
      '1 show workspace',
      '3 characters per show',
      '4 episodes per month',
      '5 GB storage',
      'Core render pipeline',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 49,
    yearly: 470,
    featured: true,
    summary: 'For teams shipping episodes every week.',
    features: [
      '3 show workspaces',
      '10 characters per show',
      'Unlimited episodes',
      '25 GB storage',
      'Priority render queue',
      'YouTube publish tools',
      'Custom style prompts',
      'Priority support',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    monthly: 99,
    yearly: 950,
    summary: 'For advanced production pipelines and agencies.',
    features: [
      'Unlimited workspaces',
      'Unlimited characters',
      'Unlimited episodes',
      '100 GB storage',
      'Fastest render priority',
      'Advanced review workflow',
      'Dedicated onboarding',
      'Dedicated support channel',
    ],
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="public-shell-bg min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
        <div className="page-container flex items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple text-white shadow-[0_14px_24px_-16px_rgba(91,117,255,0.95)]">
              <Clapperboard size={18} />
            </div>
            <div>
              <span className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">StudioAI</span>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Show OS</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/login" className="hidden px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      <main className="page-container px-4 pb-16 pt-14 md:px-6 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            <Sparkles size={13} className="text-brand-purple" />
            Usage-based plans for episodic production teams
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 dark:text-slate-50 md:text-5xl">
            Straightforward pricing without hidden render fees.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 dark:text-slate-300">
            Every plan includes a 14-day free trial. Upgrade only when your show pipeline needs more capacity.
          </p>

          <div className="mt-8 inline-flex rounded-xl border border-slate-200 bg-white/80 p-1 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                yearly
                  ? 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                  : 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900',
              ].join(' ')}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                yearly
                  ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100',
              ].join(' ')}
            >
              Yearly
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={[
                'card relative overflow-hidden',
                plan.featured
                  ? 'border-brand-purple/30 bg-brand-purple-light/35 shadow-[0_24px_40px_-28px_rgba(91,117,255,0.85)] dark:border-brand-purple/35 dark:bg-brand-purple/15'
                  : 'bg-white/80 dark:bg-white/5',
              ].join(' ')}
              data-interactive="true"
            >
              {plan.featured && (
                <span className="badge mb-4 w-fit bg-brand-purple text-white dark:text-white">
                  Most Popular
                </span>
              )}

              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{plan.summary}</p>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-50">
                  ${yearly ? Math.round(plan.yearly / 12) : plan.monthly}
                </span>
                <span className="mb-1 text-sm text-slate-400">/month</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {yearly ? `Billed $${plan.yearly}/year` : 'Billed monthly'}
              </p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                      <Check size={12} />
                    </span>
                    <span className="text-slate-600 dark:text-slate-200">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/register?plan=${plan.id}`}
                className={plan.featured ? 'btn-primary mt-6 w-full justify-center py-3' : 'btn-secondary mt-6 w-full justify-center py-3'}
              >
                Start free trial
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
