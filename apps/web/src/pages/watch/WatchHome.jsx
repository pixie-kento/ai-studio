import { Link } from 'react-router-dom';
import { Tv, Loader2 } from 'lucide-react';
import { useShows } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { getPBFileUrl } from '../../lib/utils.js';

export default function WatchHome() {
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows, isLoading } = useShows(activeWorkspace?.id);
  const activeShows = shows?.filter(s => s.status === 'active') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Watch</h1>
        <p className="text-slate-500">Browse all your cartoon shows</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>
      ) : activeShows.length === 0 ? (
        <div className="card text-center py-16">
          <Tv size={64} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400">No shows available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeShows.map(show => {
            const thumbUrl = show.thumbnail ? getPBFileUrl(show, show.thumbnail, '400x300') : null;
            return (
              <Link key={show.id} to={`/watch/${show.id}`}
                className="card p-0 overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-slate-100">
                  {thumbUrl
                    ? <img src={thumbUrl} alt={show.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-300"><Tv size={48} /></div>
                  }
                </div>
                <div className="p-4">
                  <h2 className="font-bold text-slate-900 group-hover:text-brand-purple transition-colors">{show.name}</h2>
                  {show.tagline && <p className="text-sm text-slate-500 mt-1">{show.tagline}</p>}
                  <p className="text-xs text-slate-400 mt-2">{show.episodes_count || 0} episodes · Ages {show.target_age}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
