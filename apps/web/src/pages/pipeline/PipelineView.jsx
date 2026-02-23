import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { RenderProgress } from '../../components/shared/RenderProgress.jsx';
import { cn, formatDateTime } from '../../lib/utils.js';
import { usePipelineHealth, useWorkspacePipeline } from '../../hooks/usePipeline.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

function QueueBadge({ priority }) {
  const tierLabel = priority >= 3 ? 'Studio' : priority === 2 ? 'Pro' : 'Starter';
  const tierClass =
    priority >= 3
      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
      : priority === 2
        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
        : 'bg-slate-500/15 text-slate-700 dark:text-slate-300';

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', tierClass)}>
      {tierLabel}
    </span>
  );
}

export default function PipelineView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: health, isLoading: healthLoading } = usePipelineHealth();
  const { data: jobs, isLoading: jobsLoading } = useWorkspacePipeline(activeWorkspace?.id);

  const jobItems = Array.isArray(jobs) ? jobs : [];
  const activeJobs = jobItems.filter((job) => job.status === 'running');
  const queuedJobs = jobItems.filter((job) => job.status === 'queued');
  const recentJobs = jobItems.filter((job) => job.status === 'completed' || job.status === 'failed');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-health'] });
  };

  return (
    <div className="space-y-6">
      <section className="card border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Render pipeline</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Monitor queue health, rendering progress, and recently completed jobs.
            </p>
          </div>
          <button type="button" onClick={refresh} className="btn-secondary w-full justify-center sm:w-auto">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center gap-3">
          {healthLoading ? (
            <Loader2 size={18} className="animate-spin text-slate-400" />
          ) : health?.online ? (
            <>
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <Wifi size={18} className="text-emerald-500" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">Render server connected</p>
            </>
          ) : (
            <>
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              <WifiOff size={18} className="text-rose-500" />
              <p className="font-semibold text-rose-700 dark:text-rose-300">Render server offline</p>
            </>
          )}
          {health?.url ? (
            <span className="ml-auto rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {health.url}
            </span>
          ) : null}
        </div>
      </section>

      {jobsLoading ? (
        <div className="card flex items-center justify-center py-14">
          <Loader2 size={22} className="animate-spin text-slate-400" />
        </div>
      ) : null}

      {activeJobs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Currently rendering</h2>
          {activeJobs.map((job) => (
            <RenderProgress key={job.id} job={job} />
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Queue ({queuedJobs.length})</h2>
        {queuedJobs.length === 0 ? (
          <div className="card py-8 text-center text-sm text-slate-500 dark:text-slate-300">No jobs in queue</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {queuedJobs.map((job, index) => (
                <button
                  key={job.id}
                  type="button"
                  className="card text-left"
                  data-interactive="true"
                  onClick={() => {
                    if (!job.episode) return;
                    const targetShow = job.show || job.expand?.show?.id;
                    if (!targetShow) return;
                    navigate(`/shows/${targetShow}/episodes/${job.episode}`);
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Position #{index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {job.expand?.episode?.title || `Episode ${job.episode?.slice(-6)}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <QueueBadge priority={job.priority} />
                    <span className="text-xs text-slate-400">{formatDateTime(job.created)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-white/5 md:block">
              <table className="min-w-full">
                <thead className="border-b border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Episode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Queued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {queuedJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      className={job.episode ? 'clickable-row' : undefined}
                      onClick={() => {
                        if (!job.episode) return;
                        const targetShow = job.show || job.expand?.show?.id;
                        if (!targetShow) return;
                        navigate(`/shows/${targetShow}/episodes/${job.episode}`);
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-500">#{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {job.expand?.episode?.title || `Episode ${job.episode?.slice(-6)}`}
                      </td>
                      <td className="px-4 py-3">
                        <QueueBadge priority={job.priority} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(job.created)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {recentJobs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent jobs</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-white/5">
            <table className="min-w-full">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Episode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {recentJobs.slice(0, 12).map((job) => (
                  <tr
                    key={job.id}
                    className={job.episode ? 'clickable-row' : undefined}
                    onClick={() => {
                      if (!job.episode) return;
                      const targetShow = job.show || job.expand?.show?.id;
                      if (!targetShow) return;
                      navigate(`/shows/${targetShow}/episodes/${job.episode}`);
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {job.expand?.episode?.title || 'Episode'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                          job.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                        )}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(job.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
