import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Film, Settings, Tv, Layers, Loader2, Plus, Zap } from 'lucide-react';
import { useShow, useGenerateEpisode } from '../../hooks/useShows.js';
import { useEpisodes } from '../../hooks/useEpisodes.js';
import { useCharacters } from '../../hooks/useCharacters.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { EpisodeCard } from '../../components/shared/EpisodeCard.jsx';
import { CharacterCard } from '../../components/shared/CharacterCard.jsx';
import { cn } from '../../lib/utils.js';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Episodes', 'Characters', 'Settings'];

export default function ShowDetail() {
  const { showId } = useParams();
  const { activeWorkspace } = useWorkspaceStore();
  const [tab, setTab] = useState('Overview');
  const navigate = useNavigate();

  const { data: show, isLoading } = useShow(activeWorkspace?.id, showId);
  const { data: episodes } = useEpisodes(activeWorkspace?.id, showId, {});
  const { data: characters } = useCharacters(activeWorkspace?.id, showId);
  const genEpisode = useGenerateEpisode(activeWorkspace?.id, showId);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;
  if (!show) return <div className="text-center py-20 text-slate-400">Show not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 mb-1"><Link to="/shows" className="hover:text-brand-purple">Shows</Link> / {show.name}</p>
          <h1 className="text-2xl font-black text-slate-900">{show.name}</h1>
          {show.tagline && <p className="text-slate-500">{show.tagline}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/shows/${showId}/settings`)} className="btn-secondary"><Settings size={16} /> Settings</button>
          <button onClick={() => genEpisode.mutate()} disabled={genEpisode.isPending} className="btn-primary">
            {genEpisode.isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Generate Episode
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-slate-500 hover:text-slate-900')}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="font-bold text-slate-900 mb-3">About</h2>
              <p className="text-slate-600">{show.description || 'No description yet.'}</p>
            </div>
            <div className="card">
              <h2 className="font-bold text-slate-900 mb-3">Recent Episodes</h2>
              {episodes?.items?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {episodes.items.slice(0, 4).map(ep => <EpisodeCard key={ep.id} episode={ep} showId={showId} />)}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No episodes yet. Generate your first!</p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-bold text-slate-900 mb-3">Stats</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Episodes</span><span className="font-semibold">{show.episodes_count || 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Characters</span><span className="font-semibold">{characters?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Target Age</span><span className="font-semibold">Ages {show.target_age || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-semibold capitalize">{show.status}</span></div>
              </div>
            </div>
            <div className="card">
              <h2 className="font-bold text-slate-900 mb-3">Characters</h2>
              <div className="space-y-2">
                {characters?.slice(0, 3).map(c => (
                  <Link key={c.id} to={`/shows/${showId}/characters/${c.id}`} className="flex items-center gap-2 hover:text-brand-purple transition-colors text-sm">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><Users size={14} className="text-slate-400" /></div>
                    <span>{c.name}</span>
                    <span className="text-slate-400 capitalize text-xs">({c.role})</span>
                  </Link>
                ))}
                <Link to={`/shows/${showId}/characters`} className="text-xs text-brand-purple hover:underline">View all characters</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Episodes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-500">{episodes?.totalItems || 0} episodes</p>
            <div className="flex gap-2">
              <Link to={`/shows/${showId}/episodes/new`} className="btn-secondary text-sm"><Plus size={14} /> Manual Create</Link>
              <button onClick={() => genEpisode.mutate()} disabled={genEpisode.isPending} className="btn-primary text-sm">
                {genEpisode.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                AI Generate
              </button>
            </div>
          </div>
          {episodes?.items?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.items.map(ep => <EpisodeCard key={ep.id} episode={ep} showId={showId} />)}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Film size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No episodes yet.</p>
              <button onClick={() => genEpisode.mutate()} className="btn-primary">Generate First Episode</button>
            </div>
          )}
        </div>
      )}

      {tab === 'Characters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-500">{characters?.length || 0} characters</p>
            <Link to={`/shows/${showId}/characters/new`} className="btn-primary text-sm"><Plus size={14} /> Add Character</Link>
          </div>
          {characters?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {characters.map(c => <CharacterCard key={c.id} character={c} showId={showId} />)}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No characters yet.</p>
              <Link to={`/shows/${showId}/characters/new`} className="btn-primary">Add Character</Link>
            </div>
          )}
        </div>
      )}

      {tab === 'Settings' && (
        <div className="flex justify-center">
          <div className="card max-w-md w-full text-center">
            <Settings size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Go to full settings page</p>
            <Link to={`/shows/${showId}/settings`} className="btn-primary justify-center">Open Show Settings</Link>
          </div>
        </div>
      )}
    </div>
  );
}


