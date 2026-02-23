import { Link } from 'react-router-dom';
import { ArrowUpRight, Play } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { cn, formatDate, formatDuration, getPBFileUrl } from '../../lib/utils.js';

export function EpisodeCard({ episode, showId, className }) {
  const thumbnailUrl = episode.thumbnail ? getPBFileUrl(episode, episode.thumbnail, '512x288') : null;

  return (
    <Link
      to={`/shows/${showId}/episodes/${episode.id}`}
      data-interactive="true"
      className={cn('card group flex h-full flex-col overflow-hidden p-0', className)}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-900">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={episode.title || 'Episode thumbnail'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <Play size={40} />
          </div>
        )}

        {episode.duration_seconds ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {formatDuration(episode.duration_seconds)}
          </span>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-900">
            Open episode
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ep. {episode.episode_number}</p>
          <StatusBadge status={episode.status} />
        </div>

        <h3 className="line-clamp-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-purple dark:text-slate-100">
          {episode.title || 'Untitled Episode'}
        </h3>

        {episode.moral ? (
          <p className="mt-1 line-clamp-2 flex-1 text-xs text-slate-500 dark:text-slate-300">{episode.moral}</p>
        ) : (
          <p className="mt-1 flex-1 text-xs text-slate-400 dark:text-slate-500">No moral set yet.</p>
        )}

        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{formatDate(episode.created)}</p>
      </div>
    </Link>
  );
}

export default EpisodeCard;
