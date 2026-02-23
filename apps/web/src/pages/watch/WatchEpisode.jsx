import { Link, useParams } from 'react-router-dom';
import { Loader2, ChevronRight } from 'lucide-react';
import { useEpisode, useEpisodes } from '../../hooks/useEpisodes.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { VideoPlayer } from '../../components/shared/VideoPlayer.jsx';
import { getPBFileUrl } from '../../lib/utils.js';

export default function WatchEpisode() {
  const { showId, episodeId } = useParams();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: episode, isLoading } = useEpisode(activeWorkspace?.id, showId, episodeId);
  const { data: allEpisodes } = useEpisodes(activeWorkspace?.id, showId, { status: 'PUBLISHED', perPage: 100 });

  const videoFileUrl = episode?.video_file ? getPBFileUrl(episode, episode.video_file) : null;
  const thumbUrl = episode?.thumbnail ? getPBFileUrl(episode, episode.thumbnail, '600x400') : null;

  // Find next episode
  const episodes = allEpisodes?.items || [];
  const currentIdx = episodes.findIndex(e => e.id === episodeId);
  const nextEpisode = currentIdx >= 0 && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <VideoPlayer
        youtubeUrl={episode?.youtube_url}
        youtubeVideoId={episode?.youtube_video_id}
        videoFileUrl={videoFileUrl}
        thumbnail={thumbUrl}
        title={episode?.title}
        className="w-full"
      />

      <div>
        <p className="text-sm text-slate-400 mb-1">
          <Link to={`/watch/${showId}`} className="hover:text-brand-purple">← Back to show</Link>
        </p>
        <h1 className="text-2xl font-black text-slate-900">{episode?.title}</h1>
        {episode?.moral && (
          <div className="mt-3 bg-brand-purple-light rounded-xl px-4 py-3">
            <p className="text-sm text-brand-purple font-medium">
              In this episode: <span className="font-semibold">{episode.moral}</span>
            </p>
          </div>
        )}
        {episode?.summary && (
          <p className="text-slate-600 mt-3">{episode.summary}</p>
        )}
      </div>

      {nextEpisode && (
        <Link to={`/watch/${showId}/${nextEpisode.id}`} className="card flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-0.5">Next Episode</p>
            <p className="font-bold text-slate-900 group-hover:text-brand-purple transition-colors">{nextEpisode.title || `Episode ${nextEpisode.episode_number}`}</p>
          </div>
          <ChevronRight size={20} className="text-slate-400 group-hover:text-brand-purple" />
        </Link>
      )}
    </div>
  );
}
