import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function VideoPlayer({ youtubeUrl, youtubeVideoId, videoFileUrl, thumbnail, title, className }) {
  const [playing, setPlaying] = useState(false);

  const embedId = youtubeVideoId || (youtubeUrl ? youtubeUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] : null);

  if (embedId && playing) {
    return (
      <div className={cn('relative aspect-video bg-black rounded-xl overflow-hidden', className)}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
          title={title || 'Episode'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (videoFileUrl && playing) {
    return (
      <div className={cn('relative aspect-video bg-black rounded-xl overflow-hidden', className)}>
        <video
          src={videoFileUrl}
          controls
          autoPlay
          className="w-full h-full object-cover"
          title={title}
        />
      </div>
    );
  }

  // Thumbnail / placeholder with play button
  return (
    <div
      className={cn('relative aspect-video bg-slate-900 rounded-xl overflow-hidden cursor-pointer group', className)}
      onClick={() => setPlaying(true)}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-slate-500 text-center">
            <Play size={48} className="mx-auto mb-2" />
            <p className="text-sm">No preview available</p>
          </div>
        </div>
      )}
      {(embedId || videoFileUrl) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group-hover:scale-110">
            <Play size={36} className="text-white ml-1" />
          </div>
        </div>
      )}
      {embedId && !playing && (
        <a
          href={`https://youtube.com/watch?v=${embedId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 text-white/70 hover:text-white"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={18} />
        </a>
      )}
    </div>
  );
}

export default VideoPlayer;
