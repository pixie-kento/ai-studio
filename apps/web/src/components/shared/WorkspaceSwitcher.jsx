import { useState } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { cn } from '../../lib/utils.js';

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const { workspaces } = useAuthStore();
  const { activeWorkspace, setWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  if (!workspaces?.length) return null;

  const ws = activeWorkspace;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-white/55 p-2 text-left transition-all hover:border-slate-300 hover:bg-white/85 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-purple/90 text-xs font-bold text-white">
          {ws?.name?.[0] || 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{ws?.name || 'My Studio'}</p>
          <p className="text-xs capitalize text-slate-400 dark:text-slate-500">{ws?.plan || 'starter'} plan</p>
        </div>
        <ChevronDown size={16} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1 shadow-[0_22px_45px_-26px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_22px_48px_-26px_rgba(2,8,23,1)]">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => {
                  setWorkspace(workspace);
                  setOpen(false);
                  navigate('/dashboard');
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/10"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-purple/90 text-xs font-bold text-white">
                  {workspace.name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{workspace.name}</p>
                  <p className="text-xs capitalize text-slate-400 dark:text-slate-500">{workspace.plan}</p>
                </div>
                {workspace.id === activeWorkspace?.id && <Check size={14} className="shrink-0 text-brand-purple" />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/onboarding/welcome');
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-500 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/20 dark:text-slate-300"
            >
              <Plus size={14} />
              New workspace
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default WorkspaceSwitcher;
