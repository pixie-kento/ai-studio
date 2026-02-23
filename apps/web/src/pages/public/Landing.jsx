import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clapperboard,
  Layers,
  PlayCircle,
  Sparkles,
  WandSparkles,
  Youtube,
  Users,
  ShieldCheck,
} from 'lucide-react';

const FEATURES = [
  {
    title: 'Show Bible + Character Memory',
    description: 'Keep style, character traits, and lore consistent across every episode and scene.',
    icon: Layers,
  },
  {
    title: 'Script and Scene Orchestration',
    description: 'Generate scripts, frame-level scene prompts, and iterate quickly from one timeline.',
    icon: WandSparkles,
  },
  {
    title: 'Render Pipeline Control',
    description: 'Queue, monitor, and re-run renders with production presets and voice assignments.',
    icon: PlayCircle,
  },
  {
    title: 'Team + Review Workflow',
    description: 'Collaborate with creators/reviewers and keep approvals organized before publishing.',
    icon: Users,
  },
  {
    title: 'Publishing Ready',
    description: 'Prepare episodes for platform publishing with metadata and a structured handoff.',
    icon: Youtube,
  },
  {
    title: 'Production Guardrails',
    description: 'Plan limits, audit logs, and reliable process state across all episode stages.',
    icon: ShieldCheck,
  },
];

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$19', subtitle: 'Small teams getting started' },
  { id: 'pro', name: 'Pro', price: '$49', subtitle: 'Growing studios and channels', featured: true },
  { id: 'studio', name: 'Studio', price: '$99', subtitle: 'Advanced production pipelines' },
];

const FAQS = [
  {
    q: 'Can I run this with local models?',
    a: 'Yes. StudioAI supports local-first render and generation workflows so you can optimize cost and control.',
  },
  {
    q: 'Do I need animation skills?',
    a: 'No. The product is designed for creators who want strong output quality without a traditional animation pipeline.',
  },
  {
    q: 'Can I manage multiple shows?',
    a: 'Yes. You can manage multiple shows, episodes, characters, and scene-level iterations in one workspace.',
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0);
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
        <div className="page-container flex items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple text-white shadow-[0_14px_24px_-16px_rgba(91,117,255,0.95)]">
              <Clapperboard size={18} />
            </div>
            <div>
              <span className="font-display text-lg font-semibold tracking-tight">StudioAI</span>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Show OS</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/pricing" className="hidden px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline-flex">
              Pricing
            </Link>
            <Link to="/login" className="hidden px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      <section className="page-container grid grid-cols-1 gap-10 px-4 pb-16 pt-16 md:px-6 md:pt-24 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            <Sparkles size={13} className="text-brand-purple" />
            AI-native studio platform for serialized show production
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 dark:text-slate-50 md:text-6xl">
            Produce full episodic shows with one cohesive workflow.
          </h1>

          <p className="mt-6 max-w-2xl text-base text-slate-500 dark:text-slate-300 md:text-lg">
            Manage show bible, character references, scene prompts, rendering, reviews, and publishing from a single production surface.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">
              Build your first show
              <ArrowRight size={17} />
            </Link>
            <Link to="/pricing" className="btn-secondary px-6 py-3 text-base">
              View plans
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: 'Shows', value: 'Multi' },
              { label: 'Scene Control', value: 'Frame-Level' },
              { label: 'Workflow', value: 'End-to-End' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white/75 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card overflow-hidden p-0">
            <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Pipeline Snapshot</p>
            </div>
            <div className="space-y-3 p-4">
              {[
                'Show profile configured',
                'Characters and voices assigned',
                'Episode script generated',
                'Scene prompts generated',
                'Render queued and tracked',
              ].map((line) => (
                <div key={line} className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <span className="h-2 w-2 rounded-full bg-brand-purple" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-container px-4 pb-12 md:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="card" data-interactive="true">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple-light text-brand-purple dark:bg-brand-purple/20">
                  <Icon size={18} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-300">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-container px-4 pb-12 md:px-6">
        <div className="card">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Straightforward plans</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Start free, scale when your pipeline scales.</p>
            </div>
            <Link to="/pricing" className="btn-secondary text-sm">Full pricing</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={[
                  'rounded-2xl border p-4 transition-all',
                  plan.featured
                    ? 'border-brand-purple/40 bg-brand-purple-light/55 dark:border-brand-purple/40 dark:bg-brand-purple/15'
                    : 'border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/5',
                ].join(' ')}
              >
                {plan.featured && <span className="badge mb-2">Popular</span>}
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{plan.name}</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{plan.price}<span className="text-sm font-medium text-slate-400">/mo</span></p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{plan.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-container px-4 pb-16 md:px-6">
        <div className="card">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">FAQ</h2>
          <div className="space-y-2">
            {FAQS.map((item, index) => (
              <div key={item.q} className="rounded-xl border border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setOpenFaq((prev) => (prev === index ? -1 : index))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{item.q}</span>
                  <span className="text-slate-400">{openFaq === index ? '-' : '+'}</span>
                </button>
                {openFaq === index && <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-300">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        <p>© {year} StudioAI. Built for modern show pipelines.</p>
      </footer>
    </div>
  );
}
