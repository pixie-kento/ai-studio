import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Film, Loader2, Plus, WandSparkles, Zap } from 'lucide-react';
import { StatusBadge } from '../../components/shared/StatusBadge.jsx';
import { useEpisodes } from '../../hooks/useEpisodes.js';
import { useGenerateEpisode } from '../../hooks/useShows.js';
import { formatDate } from '../../lib/utils.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

const STATUSES = [
  '',
  'PENDING',
  'SCRIPT_GENERATING',
  'SCRIPT_READY',
  'RENDER_QUEUED',
  'RENDERING',
  'AWAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
];

export default function EpisodeList() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: episodes, isLoading } = useEpisodes(activeWorkspace?.id, showId, {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
    perPage: 50,
  });

  const genEpisode = useGenerateEpisode(activeWorkspace?.id, showId);
  const episodeItems = Array.isArray(episodes?.items) ? episodes.items : [];

  return (
    <div className="space-y-6">
      <section className="card border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {showId ? (
              <p className="mb-1 text-xs font-medium text-slate-400">
                <Link to={`/shows/${showId}`} className="transition-colors hover:text-brand-purple">
                  Show
                </Link>{' '}
                / Episodes
              </p>
            ) : null}
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Episodes</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Track script and render status across your episode queue.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {showId ? (
              <Link to={`/shows/${showId}/episodes/new`} className="btn-secondary">
                <Plus size={15} />
                Manual
              </Link>
            ) : null}
            {showId ? (
              <button
                type="button"
                onClick={() => genEpisode.mutate()}
                disabled={genEpisode.isPending}
                className="btn-primary"
              >
                {genEpisode.isPending ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                Generate
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            placeholder="Search episode title, summary, moral..."
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="card flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : episodeItems.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
            <Film size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">No episodes found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Start with your first episode and generate scripts and scenes automatically.
          </p>
          {showId ? (
            <button type="button" onClick={() => genEpisode.mutate()} className="btn-primary mt-6">
              <WandSparkles size={16} />
              Generate episode
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {episodeItems.map((episode) => (
              <button
                key={episode.id}
                type="button"
                onClick={() => navigate(`/shows/${showId || episode.show}/episodes/${episode.id}`)}
                className="card text-left"
                data-interactive="true"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Ep. {episode.episode_number}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {episode.title || 'Untitled Episode'}
                    </p>
                  </div>
                  <StatusBadge status={episode.status} />
                </div>
                <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{episode.moral || 'No moral set yet.'}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(episode.created)}</p>
              </button>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-white/5 md:block">
            <table className="min-w-full">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Episode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Moral</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {episodeItems.map((episode) => (
                  <tr
                    key={episode.id}
                    className="clickable-row"
                    onClick={() => navigate(`/shows/${showId || episode.show}/episodes/${episode.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/shows/${showId || episode.show}/episodes/${episode.id}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-500">Ep. {episode.episode_number}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {episode.title || 'Untitled Episode'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">
                      <p className="line-clamp-2 max-w-xs">{episode.moral || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={episode.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(episode.created)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-brand-purple">Open</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
