import { useNavigate } from 'react-router-dom';
import { Clapperboard, Tv, Film, Users, Zap, Check } from 'lucide-react';
import useAuthStore from '../../stores/authStore.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { PlanBadge } from '../../components/shared/PlanBadge.jsx';

const PLAN_FEATURES = {
  starter: ['1 cartoon show', '3 characters per show', '4 episodes per month', '5 GB storage'],
  pro: ['3 cartoon shows', '10 characters per show', 'Unlimited episodes', 'YouTube auto-publish', '5 team members'],
  studio: ['Unlimited shows', 'Unlimited characters', 'Unlimited episodes', 'Priority rendering', 'Unlimited team members'],
};

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const plan = activeWorkspace?.plan || 'starter';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clapperboard size={32} className="text-white" />
          </div>
          <p className="text-white/60 text-sm mb-2">Step 1 of 4</p>
          <div className="flex gap-1 justify-center mb-6">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1 w-12 rounded-full ${s === 1 ? 'bg-brand-purple' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Welcome to StudioAI, {user?.display_name?.split(' ')[0] || 'Creator'}! 🎬
          </h1>
          <p className="text-slate-500 mb-6">Your cartoon studio is ready. Let's set it up in just a few steps.</p>

          <div className="bg-brand-purple-light rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <PlanBadge plan={plan} />
              <span className="text-sm font-semibold text-slate-700">Your Plan Features</span>
            </div>
            <ul className="space-y-2">
              {(PLAN_FEATURES[plan] || PLAN_FEATURES.starter).map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Tv, label: 'Create Show' },
              { icon: Users, label: 'Add Characters' },
              { icon: Film, label: 'Generate Episodes' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-3">
                <Icon size={24} className="text-brand-purple" />
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/onboarding/create-show')}
            className="btn-primary w-full py-3 text-base justify-center"
          >
            Let's Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}
