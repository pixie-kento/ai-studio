import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { useShows } from '../../hooks/useShows.js';
import { useEpisodes } from '../../hooks/useEpisodes.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { getPBFileUrl, formatDuration } from '../../lib/utils.js';
import { VideoPlayer } from '../../components/shared/VideoPlayer.jsx';

export default function KidWatch() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows } = useShows(activeWorkspace?.id);
  const firstShow = shows?.[0];
  const { data: episodes } = useEpisodes(activeWorkspace?.id, firstShow?.id, { status: 'PUBLISHED', perPage: 100 });
  const [playing, setPlaying] = useState(null);

  const eps = episodes?.items || [];

  if (playing) {
    const ep = eps.find(e => e.id === playing);
    const videoFileUrl = ep?.video_file ? getPBFileUrl(ep, ep.video_file) : null;
    const thumbUrl = ep?.thumbnail ? getPBFileUrl(ep, ep.thumbnail, '600x400') : null;
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <h2 className="text-white font-black text-xl">{ep?.title}</h2>
          <button onClick={() => setPlaying(null)} className="text-white bg-white/20 rounded-full p-2">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 flex items-center">
          <VideoPlayer
            youtubeUrl={ep?.youtube_url}
            youtubeVideoId={ep?.youtube_video_id}
            videoFileUrl={videoFileUrl}
            thumbnail={thumbUrl}
            title={ep?.title}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/kid')} className="text-3xl font-black text-slate-800">← Back</button>
        <h1 className="text-4xl font-black text-slate-900">🎬 Watch!</h1>
        <div />
      </div>

      {eps.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎭</p>
          <p className="text-2xl font-black text-slate-700">No episodes yet!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[...eps].reverse().map(ep => {
            const thumbUrl = ep.thumbnail ? getPBFileUrl(ep, ep.thumbnail, '400x300') : null;
            return (
              <button
                key={ep.id}
                onClick={() => setPlaying(ep.id)}
                className="rounded-3xl overflow-hidden bg-white shadow-lg hover:scale-105 active:scale-95 transition-transform text-left"
              >
                <div className="aspect-video bg-slate-100 relative">
                  {thumbUrl
                    ? <img src={thumbUrl} alt={ep.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl">🎬</div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-brand-purple rounded-full flex items-center justify-center shadow-lg">
                      <Play size={24} className="text-white ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-slate-400">Episode {ep.episode_number}</p>
                  <p className="font-black text-lg text-slate-900 leading-tight">{ep.title || 'Episode'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
