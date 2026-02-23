import { Link } from 'react-router-dom';
import { CheckSquare, Film, Loader2 } from 'lucide-react';
import { useReviewQueue } from '../../hooks/useEpisodes.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { getPBFileUrl, formatDate } from '../../lib/utils.js';

export default function ReviewQueue() {
  const { activeWorkspace } = useWorkspaceStore();
  const { data: episodes, isLoading } = useReviewQueue(activeWorkspace?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Review Queue</h1>
        <p className="text-slate-500">Episodes awaiting your approval before publishing</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>
      ) : episodes?.length === 0 ? (
        <div className="card text-center py-16">
          <CheckSquare size={64} className="text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">All clear!</h2>
          <p className="text-slate-400">No episodes awaiting review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {episodes.map(ep => {
            const thumbUrl = ep.thumbnail ? getPBFileUrl(ep, ep.thumbnail, '400x300') : null;
            const showId = ep.show;
            return (
              <div key={ep.id} className="card p-0 overflow-hidden group">
                <div className="aspect-video bg-slate-100 relative">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={ep.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Film size={48} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-bold text-sm">{ep.title || `Episode ${ep.episode_number}`}</p>
                    <p className="text-white/70 text-xs">Ep. {ep.episode_number} · {ep.expand?.show?.name || 'Show'}</p>
                  </div>
                </div>
                <div className="p-4">
                  {ep.moral && (
                    <div className="border-l-4 border-brand-purple pl-3 mb-4">
                      <p className="text-xs font-bold text-brand-purple mb-0.5">Moral</p>
                      <p className="text-sm text-slate-700">{ep.moral}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">{formatDate(ep.created)}</p>
                    <Link
                      to={`/shows/${showId}/episodes/${ep.id}`}
                      className="btn-primary text-sm py-1.5 px-4"
                    >
                      Review Now →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
