import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Film, Loader2, Plus, Tv, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import pb from '../../lib/pocketbase.js';
import { cn, formatRelative } from '../../lib/utils.js';
import { ShowCard } from '../../components/shared/ShowCard.jsx';
import { useReviewQueue } from '../../hooks/useEpisodes.js';
import { useShows } from '../../hooks/useShows.js';
import { useRealtime } from '../../hooks/useRealtime.js';
import { useWorkspaceUsage } from '../../hooks/useWorkspace.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

function StatCard({ label, value, detail, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-interactive="true"
      className="card w-full text-left"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple-light text-brand-purple dark:bg-brand-purple/20">
          <Icon size={17} />
        </span>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{detail}</p> : null}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspaceStore();

  const { data: shows, isLoading: showsLoading } = useShows(activeWorkspace?.id);
  const { data: usage } = useWorkspaceUsage(activeWorkspace?.id);
  const { data: reviewQueue } = useReviewQueue(activeWorkspace?.id);

  const [logs, setLogs] = useState([]);

  const showItems = Array.isArray(shows) ? shows : [];
  const reviewCount = Array.isArray(reviewQueue) ? reviewQueue.length : 0;
  const totalEpisodes = showItems.reduce((count, show) => count + (show.episodes_count || 0), 0);
  const episodesPerMonth = usage?.episodes_per_month || 0;
  const usagePct = episodesPerMonth > 0 ? Math.min(100, ((usage?.episodes_this_month || 0) / episodesPerMonth) * 100) : 0;

  useEffect(() => {
    if (!activeWorkspace?.id) return;

    pb.collection('pipeline_logs')
      .getList(1, 20, {
        filter: `workspace = "${activeWorkspace.id}"`,
        sort: '-@rowid',
        expand: 'episode',
      })
      .then((result) => setLogs(result.items || []))
      .catch(() => setLogs([]));
  }, [activeWorkspace?.id]);

  useRealtime('pipeline_logs', `workspace = "${activeWorkspace?.id}"`, () => {
    queryClient.invalidateQueries({ queryKey: ['episodes'] });

    pb.collection('pipeline_logs')
      .getList(1, 20, {
        filter: `workspace = "${activeWorkspace?.id}"`,
        sort: '-@rowid',
        expand: 'episode',
      })
      .then((result) => setLogs(result.items || []))
      .catch(() => {});
  });

  if (!activeWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Workspace overview</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-50">{activeWorkspace.name}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Plan, generate, and ship episodes with one connected workflow.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Shows"
          value={showItems.length}
          detail={usage ? `${usage.shows_used} in use` : 'Track productions'}
          icon={Tv}
          onClick={() => navigate('/shows')}
        />
        <StatCard
          label="Episodes"
          value={totalEpisodes}
          detail="Across all shows"
          icon={Film}
          onClick={() => navigate('/episodes')}
        />
        <StatCard
          label="This month"
          value={usage?.episodes_this_month || 0}
          detail={episodesPerMonth !== -1 ? `/ ${episodesPerMonth} quota` : 'Unlimited plan'}
          icon={Zap}
          onClick={() => navigate('/pipeline')}
        />
        <StatCard
          label="Needs review"
          value={reviewCount}
          detail={reviewCount ? 'Pending approvals' : 'All clear'}
          icon={CheckSquare}
          onClick={() => navigate('/review')}
        />
      </section>

      {usage && episodesPerMonth > 0 && episodesPerMonth !== -1 ? (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly episode quota</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {usage.episodes_this_month} / {episodesPerMonth}
            </p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                usage.episodes_this_month >= episodesPerMonth ? 'bg-rose-500' : 'bg-brand-purple',
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Shows</h2>
            <button
              type="button"
              onClick={() => navigate('/shows')}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-purple"
            >
              View all
            </button>
          </div>

          {showsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="card h-64 animate-pulse bg-slate-100 dark:bg-white/5" />
              ))}
            </div>
          ) : showItems.length === 0 ? (
            <div className="card py-14 text-center">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                <Tv size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No shows yet</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Create your first show to start generating episodes.
              </p>
              <button onClick={() => navigate('/shows/new')} className="btn-primary mt-6">
                Create show
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {showItems.slice(0, 4).map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
              <button
                type="button"
                onClick={() => navigate('/shows/new')}
                className="card flex min-h-[250px] flex-col items-center justify-center border-2 border-dashed border-slate-300/85 bg-transparent text-slate-500 hover:border-brand-purple hover:text-brand-purple dark:border-white/20"
                data-interactive="true"
              >
                <Plus size={22} />
                <span className="mt-2 text-sm font-semibold">New show</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Recent activity</h2>
          <div className="card overflow-hidden p-0">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No activity yet</p>
            ) : (
              <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => {
                      const episode = log.expand?.episode;
                      if (!episode?.id || !episode?.show) return;
                      navigate(`/shows/${episode.show}/episodes/${episode.id}`);
                    }}
                  >
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                      {log.message || log.event}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatRelative(log.created)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
