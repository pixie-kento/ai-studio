import { Link, useParams } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { useShow } from '../../hooks/useShows.js';
import { useEpisodes } from '../../hooks/useEpisodes.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { getPBFileUrl, formatDuration } from '../../lib/utils.js';

export default function WatchShow() {
  const { showId } = useParams();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: show } = useShow(activeWorkspace?.id, showId);
  const { data: episodes, isLoading } = useEpisodes(activeWorkspace?.id, showId, { status: 'PUBLISHED', perPage: 100 });

  const bannerUrl = show?.banner ? getPBFileUrl(show, show.banner, '1200x400') : null;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative aspect-[3/1] bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl overflow-hidden">
        {bannerUrl && <img src={bannerUrl} alt={show?.name} className="w-full h-full object-cover opacity-70" />}
        <div className="absolute inset-0 flex items-end p-6">
          <div>
            <h1 className="text-3xl font-black text-white">{show?.name}</h1>
            {show?.tagline && <p className="text-white/80">{show.tagline}</p>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">All Episodes</h2>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-slate-300" /></div>
        ) : episodes?.items?.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">No published episodes yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...(episodes?.items || [])].reverse().map(ep => {
              const thumbUrl = ep.thumbnail ? getPBFileUrl(ep, ep.thumbnail, '400x300') : null;
              return (
                <Link key={ep.id} to={`/watch/${showId}/${ep.id}`}
                  className="card p-0 overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-slate-100 relative">
                    {thumbUrl
                      ? <img src={thumbUrl} alt={ep.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-300"><Play size={36} /></div>
                    }
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                        <Play size={24} className="text-slate-900 ml-1" />
                      </div>
                    </div>
                    {ep.duration_seconds && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(ep.duration_seconds)}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Episode {ep.episode_number}</p>
                    <p className="font-semibold text-slate-900 text-sm">{ep.title || 'Untitled'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
