import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { useEpisode, useApproveEpisode, useRejectEpisode } from '../../hooks/useEpisodes.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { VideoPlayer } from '../../components/shared/VideoPlayer.jsx';
import { getPBFileUrl } from '../../lib/utils.js';

export default function ReviewEpisode() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const [scriptOpen, setScriptOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // We need showId — find from episode expand
  const [showId, setShowId] = useState(null);
  const wid = activeWorkspace?.id;

  // Fetch from review queue (we need showId)
  // Workaround: use PocketBase to find show. For now pass 'unknown' and rely on the episode data
  const { data: episode, isLoading } = useEpisode(wid, episode?.show || showId, episodeId);
  const approve = useApproveEpisode(wid, episode?.show);
  const reject = useRejectEpisode(wid, episode?.show);

  const videoFileUrl = episode?.video_file ? getPBFileUrl(episode, episode.video_file) : null;
  const thumbUrl = episode?.thumbnail ? getPBFileUrl(episode, episode.thumbnail, '600x400') : null;

  if (isLoading || !episode) {
    // Load episode directly with admin PB
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-slate-300" />
      </div>
    );
  }

  const handleApprove = async () => {
    await approve.mutateAsync(episodeId);
    navigate('/review');
  };

  const handleReject = async () => {
    await reject.mutateAsync({ episodeId, reason: rejectReason });
    navigate('/review');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{episode.title || `Episode ${episode.episode_number}`}</h1>
        <p className="text-slate-500">Review and approve or reject this episode</p>
      </div>

      {/* Video */}
      <VideoPlayer
        youtubeUrl={episode.youtube_url}
        youtubeVideoId={episode.youtube_video_id}
        videoFileUrl={videoFileUrl}
        thumbnail={thumbUrl}
        title={episode.title}
      />

      {/* Episode info */}
      {episode.moral && (
        <div className="card border-l-4 border-brand-purple">
          <p className="text-xs font-bold text-brand-purple mb-1">Moral of this episode</p>
          <p className="text-slate-800 font-medium">{episode.moral}</p>
        </div>
      )}
      {episode.summary && (
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-2">Summary</h2>
          <p className="text-slate-600">{episode.summary}</p>
        </div>
      )}

      {/* Script accordion */}
      {episode.script && (
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setScriptOpen(!scriptOpen)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-900">View Full Script</span>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${scriptOpen ? 'rotate-180' : ''}`} />
          </button>
          {scriptOpen && (
            <div className="px-6 pb-6 border-t border-slate-100">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono mt-4 leading-relaxed">{episode.script}</pre>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {episode.status === 'AWAITING_APPROVAL' && (
        <div className="card space-y-4">
          <h2 className="font-bold text-slate-900">Your Decision</h2>
          {!showRejectForm ? (
            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={approve.isPending}
                className="flex-1 btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 py-4 text-lg justify-center rounded-xl"
              >
                {approve.isPending ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
                ✅ Approve & Publish
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-4 text-lg justify-center rounded-xl"
              >
                <XCircle size={24} />
                ❌ Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="label">Reason for rejection</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="input min-h-24 resize-none"
                placeholder="What needs to be fixed?"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowRejectForm(false)} className="btn-secondary flex-1 py-3 justify-center">Cancel</button>
                <button onClick={handleReject} disabled={reject.isPending} className="btn-danger flex-1 py-3 justify-center">
                  {reject.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {episode.status !== 'AWAITING_APPROVAL' && (
        <div className="card text-center py-6">
          <p className="text-slate-500">This episode has already been <strong className="capitalize">{episode.status?.toLowerCase()}</strong>.</p>
        </div>
      )}
    </div>
  );
}
