import { useNavigate } from 'react-router-dom';
import { Plus, Tv } from 'lucide-react';
import { ShowCard } from '../../components/shared/ShowCard.jsx';
import { UpgradePromptInline } from '../../components/shared/UpgradePrompt.jsx';
import { usePlan } from '../../hooks/usePlan.js';
import { useShows } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

export default function ShowList() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows, isLoading } = useShows(activeWorkspace?.id);
  const { isAtShowLimit } = usePlan();

  const showItems = Array.isArray(shows) ? shows : [];

  return (
    <div className="space-y-6">
      <section className="card border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Shows</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Manage story worlds, style settings, and cast for each production.
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {showItems.length} active {showItems.length === 1 ? 'show' : 'shows'}
            </div>
          </div>

          {!isAtShowLimit() ? (
            <button onClick={() => navigate('/shows/new')} className="btn-primary w-full justify-center py-2.5 sm:w-auto">
              <Plus size={16} />
              New show
            </button>
          ) : null}
        </div>
      </section>

      {isAtShowLimit() ? (
        <UpgradePromptInline message="You've reached your show limit. Upgrade your plan to create more shows." />
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="card h-72 animate-pulse bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : showItems.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
            <Tv size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">No shows yet</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Create your first show to start generating characters, scenes, and episodes.
          </p>
          <button onClick={() => navigate('/shows/new')} className="btn-primary mt-6">
            Create first show
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {showItems.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      )}
    </div>
  );
}
