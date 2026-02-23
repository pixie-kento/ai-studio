import { Link } from 'react-router-dom';
import { ArrowUpRight, Film, Tv } from 'lucide-react';
import { cn, getPBFileUrl } from '../../lib/utils.js';

const STATUS_DOT = {
  active: 'bg-emerald-400',
  paused: 'bg-amber-400',
  archived: 'bg-slate-400',
};

export function ShowCard({ show, className }) {
  const thumbnailUrl = show.thumbnail ? getPBFileUrl(show, show.thumbnail, '640x360') : null;

  return (
    <Link
      to={`/shows/${show.id}`}
      data-interactive="true"
      className={cn(
        'card group relative overflow-hidden p-0',
        'transition-transform duration-200',
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={show.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <Tv size={52} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-900">
            Open show
            <ArrowUpRight size={12} />
          </span>
        </div>

        <div className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-2 py-1 text-xs text-white backdrop-blur-md">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[show.status] || STATUS_DOT.active)} />
          <span className="capitalize">{show.status || 'active'}</span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-brand-purple dark:text-slate-100">
            {show.name}
          </h3>
          {show.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">{show.description}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">No description yet.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/80 px-2 py-1 dark:border-white/10 dark:bg-white/5">
            <Film size={12} />
            {show.episodes_count || 0} episodes
          </span>
          {show.target_age && (
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50/80 px-2 py-1 dark:border-white/10 dark:bg-white/5">
              Ages {show.target_age}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ShowCard;
