import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Tv,
  Film,
  Clapperboard,
  CheckSquare,
  Eye,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  PlusCircle,
  WandSparkles,
} from 'lucide-react';
import { WorkspaceSwitcher } from '../shared/WorkspaceSwitcher.jsx';
import { PlanBadge } from '../shared/PlanBadge.jsx';
import { useLogout } from '../../hooks/useAuth.js';
import useAuthStore from '../../stores/authStore.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { usePlan } from '../../hooks/usePlan.js';
import { cn } from '../../lib/utils.js';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shows', icon: Tv, label: 'Shows' },
  { to: '/episodes', icon: Film, label: 'Episodes' },
  { to: '/pipeline', icon: Clapperboard, label: 'Pipeline' },
  { to: '/review', icon: CheckSquare, label: 'Review' },
  { to: '/watch', icon: Eye, label: 'Watch' },
];

const settingsItems = [
  { to: '/billing/plans', icon: CreditCard, label: 'Billing' },
  { to: '/settings/workspace', icon: Settings, label: 'Settings' },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200',
          isActive
            ? 'border-brand-purple/30 bg-brand-purple-light/70 text-slate-900 shadow-[0_10px_24px_-16px_rgba(91,117,255,0.9)] dark:border-brand-purple/30 dark:bg-brand-purple/20 dark:text-white'
            : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-white',
        )
      }
    >
      <Icon size={17} className="transition-transform duration-200 group-hover:scale-105" />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ className }) {
  const logout = useLogout();
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { plan, isAtEpisodeLimit, episodesRemaining } = usePlan();
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200/80 bg-white/82 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70',
        className,
      )}
    >
      <div className="border-b border-slate-200/80 p-4 dark:border-white/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple text-white shadow-[0_14px_24px_-16px_rgba(91,117,255,0.95)]">
            <Clapperboard size={18} />
          </div>
          <div>
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">StudioAI</span>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Show OS</p>
          </div>
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Workspace</p>
        <WorkspaceSwitcher />
      </div>

      <div className="p-4 pb-2">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => navigate('/shows/new')} className="btn-secondary w-full justify-center text-xs">
            <PlusCircle size={14} />
            New Show
          </button>
          <button type="button" onClick={() => navigate('/episodes')} className="btn-secondary w-full justify-center text-xs">
            <WandSparkles size={14} />
            Episodes
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        {user?.platform_role === 'superadmin' && (
          <div className="space-y-1.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Admin</p>
            <NavItem to="/superadmin" icon={ShieldCheck} label="Super Admin" />
          </div>
        )}

        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Account</p>
          {settingsItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200/80 p-4 dark:border-white/10">
        {activeWorkspace && (
          <div className="mb-3 rounded-xl border border-slate-200/80 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="mb-2 flex items-center justify-between">
              <PlanBadge plan={plan} />
              {plan !== 'studio' && (
                <button
                  type="button"
                  onClick={() => navigate('/billing/plans')}
                  className="text-xs font-semibold text-brand-purple hover:underline"
                >
                  Upgrade
                </button>
              )}
            </div>
            {plan === 'starter' && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {isAtEpisodeLimit() ? (
                  <span className="text-red-500">Episode limit reached this month</span>
                ) : (
                  <span>{episodesRemaining()} episodes remaining this month</span>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
