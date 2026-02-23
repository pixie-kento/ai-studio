import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, RefreshCw, WandSparkles, Clapperboard, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useEpisode,
  useEpisodeLogs,
  useApproveEpisode,
  useRejectEpisode,
  useDeleteEpisode,
  useGenerateScenes,
  useQueueRender,
} from '../../hooks/useEpisodes.js';
import { useScenes, useCreateScene, useUpdateScene, useDeleteScene } from '../../hooks/useScenes.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { StatusBadge } from '../../components/shared/StatusBadge.jsx';
import { VideoPlayer } from '../../components/shared/VideoPlayer.jsx';
import { RenderProgress } from '../../components/shared/RenderProgress.jsx';
import { useWorkspacePipeline } from '../../hooks/usePipeline.js';
import { formatDateTime, formatDuration, getPBFileUrl, cn } from '../../lib/utils.js';

const TABS = ['Overview', 'Scenes', 'Script', 'Video', 'Pipeline Log'];
const EMPTY_SCENE_DRAFT = {
  scene_index: 1,
  shot_index: 1,
  duration_sec: 4,
  camera: 'medium',
  emotion: 'neutral',
  action: '',
  prompt_positive: '',
  prompt_negative: '',
  focus_character: '',
  music_mood: '',
  seed: '',
};

function toSceneDraft(scene = {}) {
  return {
    scene_index: scene.scene_index ?? scene.scene ?? 1,
    shot_index: scene.shot_index ?? 1,
    duration_sec: scene.duration_sec ?? 4,
    camera: scene.camera || 'medium',
    emotion: scene.emotion || 'neutral',
    action: scene.action || '',
    prompt_positive: scene.prompt_positive || '',
    prompt_negative: scene.prompt_negative || '',
    focus_character: scene.focus_character || '',
    music_mood: scene.music_mood || '',
    seed: scene.seed ?? '',
  };
}

function toScenePayload(draft) {
  return {
    scene_index: Number(draft.scene_index) || 1,
    shot_index: Number(draft.shot_index) || 1,
    duration_sec: Number(draft.duration_sec) || 4,
    camera: draft.camera || 'medium',
    emotion: draft.emotion || '',
    action: draft.action || '',
    prompt_positive: draft.prompt_positive || '',
    prompt_negative: draft.prompt_negative || '',
    focus_character: draft.focus_character || '',
    music_mood: draft.music_mood || '',
    seed: draft.seed === '' || draft.seed === null ? null : Number(draft.seed),
  };
}

function SceneBlock({ text }) {
  const lines = text.split('\n').filter(Boolean);
  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-1">
      {lines.map((line, i) => {
        const isTag = /^(SETTING|EMOTION|CAMERA|MUSIC_MOOD|DIALOGUE|NARRATION|SCENE)/.test(line.trim());
        return (
          <p key={i} className={`text-sm ${isTag ? 'font-bold text-brand-purple mt-2' : 'text-slate-700 ml-4'}`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function EpisodeDetail() {
  const { showId, episodeId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const [tab, setTab] = useState('Overview');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [newScene, setNewScene] = useState(EMPTY_SCENE_DRAFT);
  const [editingSceneId, setEditingSceneId] = useState(null);
  const [editingScene, setEditingScene] = useState(EMPTY_SCENE_DRAFT);

  const { data: episode, isLoading, refetch } = useEpisode(activeWorkspace?.id, showId, episodeId);
  const { data: logs } = useEpisodeLogs(activeWorkspace?.id, showId, episodeId);
  const { data: sceneRecords = [], isLoading: scenesLoading } = useScenes(activeWorkspace?.id, showId, episodeId);
  const { data: pipeline } = useWorkspacePipeline(activeWorkspace?.id);
  const approve = useApproveEpisode(activeWorkspace?.id, showId);
  const reject = useRejectEpisode(activeWorkspace?.id, showId);
  const deleteEpisode = useDeleteEpisode(activeWorkspace?.id, showId);
  const generateScenes = useGenerateScenes(activeWorkspace?.id, showId);
  const queueRender = useQueueRender(activeWorkspace?.id, showId);
  const createScene = useCreateScene(activeWorkspace?.id, showId, episodeId);
  const updateScene = useUpdateScene(activeWorkspace?.id, showId, episodeId);
  const deleteScene = useDeleteScene(activeWorkspace?.id, showId, episodeId);

  const activeJob = pipeline?.find(j => j.episode === episodeId && (j.status === 'running' || j.status === 'queued'));
  const videoFileUrl = episode?.video_file ? getPBFileUrl(episode, episode.video_file) : null;
  const thumbUrl = episode?.thumbnail ? getPBFileUrl(episode, episode.thumbnail, '600x400') : null;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;
  if (!episode) return <div className="text-center py-20 text-slate-400">Episode not found</div>;

  const handleReject = async () => {
    await reject.mutateAsync({ episodeId, reason: rejectReason });
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handleDeleteEpisode = async () => {
    const ok = window.confirm('Delete this episode? This action cannot be undone.');
    if (!ok) return;
    await deleteEpisode.mutateAsync(episodeId);
    navigate(`/shows/${showId}/episodes`);
  };

  const handleCreateScene = async () => {
    await createScene.mutateAsync(toScenePayload(newScene));
    const nextSceneIndex = (sceneRecords?.length || 0) + 1;
    setNewScene({ ...EMPTY_SCENE_DRAFT, scene_index: nextSceneIndex, shot_index: 1 });
  };

  const handleStartEditScene = (scene) => {
    setEditingSceneId(scene.id);
    setEditingScene(toSceneDraft(scene));
  };

  const handleSaveScene = async (sceneId) => {
    await updateScene.mutateAsync({ sceneId, payload: toScenePayload(editingScene) });
    setEditingSceneId(null);
    setEditingScene(EMPTY_SCENE_DRAFT);
  };

  const handleDeleteScene = async (sceneId) => {
    const ok = window.confirm('Delete this scene shot?');
    if (!ok) return;
    await deleteScene.mutateAsync(sceneId);
  };

  const scriptScenes = episode.script ? episode.script.split(/(?=\[SCENE \d+\])/).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">
            <Link to={`/shows/${showId}`} className="hover:text-brand-purple">Show</Link> /{' '}
            <Link to={`/shows/${showId}/episodes`} className="hover:text-brand-purple">Episodes</Link> / Ep. {episode.episode_number}
          </p>
          <h1 className="text-2xl font-black text-slate-900">{episode.title || `Episode ${episode.episode_number}`}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={episode.status} />
            {episode.duration_seconds && <span className="text-sm text-slate-400">{formatDuration(episode.duration_seconds)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateScenes.mutate(episodeId)}
            disabled={generateScenes.isPending || !episode.script}
            className="btn-secondary text-sm"
          >
            {generateScenes.isPending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}
            Generate Scenes
          </button>
          <button
            onClick={() => queueRender.mutate(episodeId)}
            disabled={queueRender.isPending}
            className="btn-primary text-sm"
          >
            {queueRender.isPending ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />}
            Queue Render
          </button>
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handleDeleteEpisode}
            disabled={deleteEpisode.isPending}
            className="btn-danger text-sm"
          >
            {deleteEpisode.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete Episode
          </button>
        </div>
      </div>

      {/* Render progress */}
      {activeJob && <RenderProgress job={activeJob} />}

      {/* Approval buttons - shown prominently when awaiting */}
      {episode.status === 'AWAITING_APPROVAL' && (
        <div className="card bg-purple-50 border-purple-200">
          <h2 className="font-bold text-slate-900 mb-4">This episode is ready for your review</h2>
          <div className="flex gap-4">
            <button
              onClick={() => approve.mutate(episodeId)}
              disabled={approve.isPending}
              className="flex-1 btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 py-3 text-base justify-center"
            >
              {approve.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={20} />}
              Approve & Publish
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-3 text-base justify-center"
            >
              <XCircle size={20} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-slate-500 hover:text-slate-900')}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {episode.moral && (
              <div className="card border-l-4 border-brand-purple">
                <p className="text-xs font-bold text-brand-purple uppercase mb-1">Moral of this episode</p>
                <p className="text-slate-800 font-medium">{episode.moral}</p>
              </div>
            )}
            {episode.summary && (
              <div className="card">
                <h2 className="font-bold text-slate-900 mb-2">Summary</h2>
                <p className="text-slate-600">{episode.summary}</p>
              </div>
            )}
            {episode.theme_tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {episode.theme_tags.map(t => <span key={t} className="badge bg-brand-purple-light text-brand-purple">{t}</span>)}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="card text-sm space-y-3">
              <h2 className="font-bold text-slate-900">Details</h2>
              <div className="flex justify-between"><span className="text-slate-500">Episode</span><span className="font-semibold">#{episode.episode_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={episode.status} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Theme</span><span className="font-semibold capitalize">{episode.theme?.replace(/_/g, ' ') || '-'}</span></div>
              {episode.render_started_at && <div className="flex justify-between"><span className="text-slate-500">Render started</span><span className="font-semibold text-xs">{formatDateTime(episode.render_started_at)}</span></div>}
              {episode.render_completed_at && <div className="flex justify-between"><span className="text-slate-500">Render done</span><span className="font-semibold text-xs">{formatDateTime(episode.render_completed_at)}</span></div>}
              {episode.published_at && <div className="flex justify-between"><span className="text-slate-500">Published</span><span className="font-semibold text-xs">{formatDateTime(episode.published_at)}</span></div>}
              {episode.rejection_reason && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-red-600 mb-1">Rejection reason</p>
                  <p className="text-xs text-red-700">{episode.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scenes */}
      {tab === 'Scenes' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Add Scene Shot</h2>
              <button
                onClick={handleCreateScene}
                disabled={createScene.isPending}
                className="btn-primary text-sm"
              >
                {createScene.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add Scene
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input type="number" value={newScene.scene_index} onChange={(e) => setNewScene((s) => ({ ...s, scene_index: e.target.value }))} className="input" placeholder="Scene #" />
              <input type="number" value={newScene.shot_index} onChange={(e) => setNewScene((s) => ({ ...s, shot_index: e.target.value }))} className="input" placeholder="Shot #" />
              <input type="number" step="0.5" value={newScene.duration_sec} onChange={(e) => setNewScene((s) => ({ ...s, duration_sec: e.target.value }))} className="input" placeholder="Duration" />
              <input value={newScene.camera} onChange={(e) => setNewScene((s) => ({ ...s, camera: e.target.value }))} className="input" placeholder="Camera" />
              <input value={newScene.emotion} onChange={(e) => setNewScene((s) => ({ ...s, emotion: e.target.value }))} className="input" placeholder="Emotion" />
            </div>
            <textarea value={newScene.action} onChange={(e) => setNewScene((s) => ({ ...s, action: e.target.value }))} className="input min-h-16 resize-none" placeholder="Action" />
            <input value={newScene.focus_character} onChange={(e) => setNewScene((s) => ({ ...s, focus_character: e.target.value }))} className="input" placeholder="Focus character name" />
            <textarea value={newScene.prompt_positive} onChange={(e) => setNewScene((s) => ({ ...s, prompt_positive: e.target.value }))} className="input min-h-16 resize-none font-mono text-xs" placeholder="Positive prompt override" />
            <textarea value={newScene.prompt_negative} onChange={(e) => setNewScene((s) => ({ ...s, prompt_negative: e.target.value }))} className="input min-h-16 resize-none font-mono text-xs" placeholder="Negative prompt override" />
          </div>

          {scenesLoading ? (
            <div className="card flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : sceneRecords.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">
              No scene shots yet. Add one manually or click "Generate Scenes".
            </div>
          ) : (
            <div className="space-y-3">
              {sceneRecords.map((scene) => (
                <div key={scene.id} className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Scene {scene.scene_index}, Shot {scene.shot_index}
                      </p>
                      <p className="text-xs text-slate-500">
                        {scene.camera || 'camera n/a'} | {scene.emotion || 'neutral'} | {scene.duration_sec || 4}s
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStartEditScene(scene)} className="btn-secondary text-xs px-3 py-1.5">
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button onClick={() => handleDeleteScene(scene.id)} className="btn-danger text-xs px-3 py-1.5">
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingSceneId === scene.id ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <input type="number" value={editingScene.scene_index} onChange={(e) => setEditingScene((s) => ({ ...s, scene_index: e.target.value }))} className="input" />
                        <input type="number" value={editingScene.shot_index} onChange={(e) => setEditingScene((s) => ({ ...s, shot_index: e.target.value }))} className="input" />
                        <input type="number" step="0.5" value={editingScene.duration_sec} onChange={(e) => setEditingScene((s) => ({ ...s, duration_sec: e.target.value }))} className="input" />
                        <input value={editingScene.camera} onChange={(e) => setEditingScene((s) => ({ ...s, camera: e.target.value }))} className="input" />
                        <input value={editingScene.emotion} onChange={(e) => setEditingScene((s) => ({ ...s, emotion: e.target.value }))} className="input" />
                      </div>
                      <textarea value={editingScene.action} onChange={(e) => setEditingScene((s) => ({ ...s, action: e.target.value }))} className="input min-h-16 resize-none" />
                      <input value={editingScene.focus_character} onChange={(e) => setEditingScene((s) => ({ ...s, focus_character: e.target.value }))} className="input" />
                      <textarea value={editingScene.prompt_positive} onChange={(e) => setEditingScene((s) => ({ ...s, prompt_positive: e.target.value }))} className="input min-h-16 resize-none font-mono text-xs" />
                      <textarea value={editingScene.prompt_negative} onChange={(e) => setEditingScene((s) => ({ ...s, prompt_negative: e.target.value }))} className="input min-h-16 resize-none font-mono text-xs" />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveScene(scene.id)} disabled={updateScene.isPending} className="btn-primary text-sm">
                          {updateScene.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Save Scene
                        </button>
                        <button onClick={() => setEditingSceneId(null)} className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">{scene.action || 'No action text.'}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Script */}
      {tab === 'Script' && (
        <div className="space-y-4">
          {episode.script ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{scriptScenes.length} scenes</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateScenes.mutate(episodeId)}
                    disabled={generateScenes.isPending}
                    className="btn-secondary text-sm"
                  >
                    {generateScenes.isPending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}
                    Regenerate Scenes
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(episode.script); }} className="btn-secondary text-sm">Copy Script</button>
                </div>
              </div>
              {scriptScenes.length > 0 ? scriptScenes.map((scene, i) => <SceneBlock key={i} text={scene} />) : (
                <div className="card">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">{episode.script}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-12">
              <p className="text-slate-400">No script yet. Script is generated automatically during episode creation.</p>
            </div>
          )}
        </div>
      )}

      {/* Video */}
      {tab === 'Video' && (
        <div className="space-y-4">
          <VideoPlayer
            youtubeUrl={episode.youtube_url}
            youtubeVideoId={episode.youtube_video_id}
            videoFileUrl={videoFileUrl}
            thumbnail={thumbUrl}
            title={episode.title}
            className="max-w-3xl"
          />
          {episode.youtube_url && (
            <a href={episode.youtube_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm inline-flex">
              Open on YouTube
            </a>
          )}
          {episode.status === 'AWAITING_APPROVAL' && (
            <div className="flex gap-4 pt-4 max-w-lg">
              <button onClick={() => approve.mutate(episodeId)} disabled={approve.isPending}
                className="flex-1 btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 py-3 justify-center">
                {approve.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Approve
              </button>
              <button onClick={() => setShowRejectModal(true)}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-3 justify-center">
                <XCircle size={18} /> Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Log */}
      {tab === 'Pipeline Log' && (
        <div className="space-y-2">
          {logs?.length === 0 ? (
            <div className="card text-center py-8 text-slate-400">No pipeline events yet</div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {(logs || []).map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-purple mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{log.event?.replace(/_/g, ' ')}</p>
                      {log.message && <p className="text-xs text-slate-500">{log.message}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(log.created)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Reject Episode</h2>
            <label className="label">Reason for rejection</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input min-h-24 resize-none mb-4" placeholder="e.g. Script needs revision, character looks wrong..." />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1 py-3 justify-center">Cancel</button>
              <button onClick={handleReject} disabled={reject.isPending} className="btn-danger flex-1 py-3 justify-center">
                {reject.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

