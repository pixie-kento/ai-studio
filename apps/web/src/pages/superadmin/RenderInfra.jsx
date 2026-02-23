import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cpu, Wifi, WifiOff, Trash2, RefreshCw, AlertTriangle, Activity, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';

const PRIORITY_LABELS = { 3: 'Studio', 2: 'Pro', 1: 'Starter' };
const PRIORITY_COLORS = { 3: 'bg-amber-100 text-amber-700', 2: 'bg-purple-100 text-purple-700', 1: 'bg-blue-100 text-blue-700' };

function StatusDot({ connected }) {
  return (
    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
  );
}

export default function RenderInfra() {
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);

  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ['superadmin', 'queue'],
    queryFn: () => api.get('/api/superadmin/render-queue').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ['pipeline', 'health'],
    queryFn: () => api.get('/api/pipeline/health').then(r => r.data),
    refetchInterval: 15000,
  });

  const deleteJob = useMutation({
    mutationFn: (jobId) => api.delete(`/api/superadmin/render-jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'queue'] });
      toast.success('Job removed');
    },
    onError: () => toast.error('Failed to remove job'),
  });

  const handleClearStuck = async () => {
    if (!confirm('Clear all jobs that have been processing for more than 30 minutes?')) return;
    setClearing(true);
    try {
      const { data } = await api.post('/api/superadmin/render-queue/clear-stuck');
      toast.success(`Cleared ${data.cleared} stuck jobs`);
      refetch();
    } catch {
      toast.error('Failed to clear stuck jobs');
    } finally {
      setClearing(false);
    }
  };

  const active = queue?.active || [];
  const waiting = queue?.waiting || [];
  const completed = queue?.completed || [];
  const failed = queue?.failed || [];
  const connected = health?.renderServer?.connected;

  const stats = [
    { label: 'Active', value: active.length, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Waiting', value: waiting.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed (24h)', value: completed.length, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Failed (24h)', value: failed.length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Render Infrastructure</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor and manage the render pipeline</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleClearStuck} disabled={clearing} className="btn-danger text-sm">
            {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Clear Stuck
          </button>
        </div>
      </div>

      {/* Server status */}
      <div className={`card border-2 ${connected ? 'border-green-200' : 'border-red-200'}`}>
        <div className="flex items-center gap-4">
          {connected ? <Wifi size={24} className="text-green-600" /> : <WifiOff size={24} className="text-red-500" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusDot connected={connected} />
              <h2 className="font-bold text-slate-900">
                Render Server {connected ? 'Online' : 'Offline'}
              </h2>
            </div>
            {health?.renderServer?.url && (
              <p className="text-xs font-mono text-slate-500 mt-0.5">{health.renderServer.url}</p>
            )}
            {health?.renderServer?.lastPing && (
              <p className="text-xs text-slate-400 mt-0.5">
                Last ping: {formatDate(health.renderServer.lastPing)}
              </p>
            )}
          </div>
          {!connected && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
              <AlertTriangle size={16} />
              Check render server URL in Platform Settings
            </div>
          )}
        </div>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`card ${s.bg} border-0`}>
              <div className="flex items-center gap-3">
                <Icon size={20} className={s.color} />
                <div>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active renders */}
      <div className="card">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-green-500" />
          Active Renders
          <span className="ml-auto text-xs font-normal text-slate-400">Auto-refreshes every 5s</span>
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-32 bg-slate-100 rounded-lg" />
        ) : active.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Cpu size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm">No active renders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <Activity size={16} className="text-green-500 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{job.data?.episodeTitle || 'Episode'}</p>
                    {job.data?.priority && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[job.data.priority] || ''}`}>
                        {PRIORITY_LABELS[job.data.priority] || ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{job.data?.workspaceName || job.data?.workspaceId} · Job #{job.id}</p>
                  {job.data?.progress !== undefined && (
                    <div className="mt-1.5 h-1 bg-green-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${job.data.progress}%` }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteJob.mutate(job.id)}
                  disabled={deleteJob.isPending}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Cancel job"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiting queue */}
      <div className="card">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          Waiting Queue ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Queue is empty</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {waiting.map((job, idx) => (
              <div key={job.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{job.data?.episodeTitle || 'Episode'}</p>
                  <p className="text-xs text-slate-400">{job.data?.workspaceName || job.data?.workspaceId}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[job.data?.priority] || 'bg-slate-100 text-slate-500'}`}>
                  {PRIORITY_LABELS[job.data?.priority] || 'Unknown'}
                </span>
                <button
                  onClick={() => deleteJob.mutate(job.id)}
                  disabled={deleteJob.isPending}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failed jobs */}
      {failed.length > 0 && (
        <div className="card border-red-100">
          <h2 className="font-bold text-red-600 mb-4 flex items-center gap-2">
            <XCircle size={16} />
            Failed Jobs (last 24h)
          </h2>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {failed.map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <XCircle size={14} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{job.data?.episodeTitle || 'Episode'}</p>
                  <p className="text-xs text-red-500 truncate">{job.failedReason || 'Unknown error'}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(job.finishedOn)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
