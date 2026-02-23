import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Clapperboard, Film, LayoutDashboard, Plus, Tv, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const ACTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { id: 'new-show', label: 'New Show', icon: Plus, to: '/shows/new' },
  { id: 'shows', label: 'Shows', icon: Tv, to: '/shows' },
  { id: 'episodes', label: 'Episodes', icon: Film, to: '/episodes' },
  { id: 'pipeline', label: 'Pipeline', icon: Clapperboard, to: '/pipeline' },
  { id: 'review', label: 'Review', icon: CheckSquare, to: '/review' },
];

export function FloatingActions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const onToggleEvent = () => setOpen((prev) => !prev);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('studioai:toggle-quick-actions', onToggleEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('studioai:toggle-quick-actions', onToggleEvent);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const goTo = (to) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      <div
        className={cn(
          'pointer-events-auto w-[220px] rounded-2xl border border-slate-200/85 bg-white/95 p-2 shadow-[0_24px_46px_-26px_rgba(15,23,42,0.62)] backdrop-blur-xl transition-all duration-200 dark:border-white/15 dark:bg-slate-900/95 dark:shadow-[0_24px_56px_-30px_rgba(2,6,23,1)]',
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
        )}
      >
        <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Quick Actions
        </p>
        <div className="space-y-1">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => goTo(action.to)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Icon size={16} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="pointer-events-auto btn-primary h-12 w-12 rounded-full p-0 shadow-[0_18px_30px_-18px_rgba(245,158,11,0.95)]"
        title="Quick actions (Ctrl+K)"
      >
        {open ? <X size={20} /> : <Plus size={20} />}
      </button>
    </div>
  );
}

export default FloatingActions;
