import { useQuery } from '@tanstack/react-query';
import { Users, Building2, Film, DollarSign, Cpu, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { formatDate, formatCurrency } from '../../lib/utils.js';
import { StatusBadge } from '../../components/shared/StatusBadge.jsx';

function StatCard({ icon: Icon, label, value, sub, color = 'text-brand-purple' }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function SuperDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: () => api.get('/api/superadmin/stats').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: renderQueue } = useQuery({
    queryKey: ['superadmin', 'queue'],
    queryFn: () => api.get('/api/superadmin/render-queue').then(r => r.data),
    refetchInterval: 10000,
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}
      </div>
    </div>
  );

  const statCards = [
    { icon: Building2, label: 'Total Workspaces', value: stats?.totalWorkspaces ?? '—', sub: `${stats?.activeThisMonth ?? 0} active this month` },
    { icon: Users, label: 'Total Users', value: stats?.totalUsers ?? '—', sub: `${stats?.newThisMonth ?? 0} new this month` },
    { icon: DollarSign, label: 'MRR', value: stats?.mrr ? formatCurrency(stats.mrr / 100) : '—', sub: stats?.arr ? `ARR: ${formatCurrency(stats.arr / 100)}` : '', color: 'text-green-600' },
    { icon: Film, label: 'Episodes Generated', value: stats?.totalEpisodes ?? '—', sub: `${stats?.episodesThisMonth ?? 0} this month` },
  ];

  const planBreakdown = stats?.planBreakdown || {};
  const activeRenders = renderQueue?.active || [];
  const waitingRenders = renderQueue?.waiting || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Super Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Platform-wide overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity size={14} className="text-green-500" />
          Live — auto-refreshes every 30s
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan breakdown */}
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Plan Distribution
          </h2>
          <div className="space-y-3">
            {[
              { plan: 'starter', label: 'Starter', color: 'bg-blue-400' },
              { plan: 'pro', label: 'Pro', color: 'bg-brand-purple' },
              { plan: 'studio', label: 'Studio', color: 'bg-amber-400' },
            ].map(({ plan, label, color }) => {
              const count = planBreakdown[plan] || 0;
              const total = Object.values(planBreakdown).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link to="/superadmin/workspaces" className="text-sm text-brand-purple hover:underline font-medium">
              View all workspaces →
            </Link>
          </div>
        </div>

        {/* Active renders */}
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Cpu size={16} /> Render Queue
            <span className="ml-auto text-xs font-normal text-slate-400">{activeRenders.length} active · {waitingRenders.length} waiting</span>
          </h2>

          {activeRenders.length === 0 && waitingRenders.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Cpu size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm">No renders in queue</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...activeRenders.slice(0, 3), ...waitingRenders.slice(0, 5)].map(job => (
                <div key={job.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeRenders.find(j => j.id === job.id) ? 'bg-green-400 animate-pulse' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{job.data?.episodeTitle || 'Episode'}</p>
                    <p className="text-xs text-slate-400 truncate">{job.data?.workspaceName || job.data?.workspaceId}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activeRenders.find(j => j.id === job.id) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {activeRenders.find(j => j.id === job.id) ? 'Active' : 'Waiting'}
                  </span>
                  {job.data?.priority && (
                    <span className="text-xs text-slate-400">P{job.data.priority}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link to="/superadmin/render" className="text-sm text-brand-purple hover:underline font-medium">
              Manage render infra →
            </Link>
          </div>
        </div>
      </div>

      {/* Render server status */}
      {stats?.renderServerStatus && (
        <div className={`card border-2 ${stats.renderServerStatus.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${stats.renderServerStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <p className="font-semibold text-slate-900">
                Render Server: {stats.renderServerStatus.connected ? 'Online' : 'Offline'}
              </p>
              {stats.renderServerStatus.url && (
                <p className="text-xs text-slate-500 font-mono">{stats.renderServerStatus.url}</p>
              )}
            </div>
            {!stats.renderServerStatus.connected && (
              <div className="ml-auto flex items-center gap-1 text-red-600 text-sm">
                <AlertTriangle size={16} />
                Check render server configuration
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent signups */}
      {stats?.recentSignups?.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4">Recent Signups</h2>
          <div className="space-y-3">
            {stats.recentSignups.map(ws => (
              <div key={ws.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-sm flex-shrink-0">
                  {ws.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{ws.name}</p>
                  <p className="text-xs text-slate-400">{formatDate(ws.created)}</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full capitalize">{ws.plan}</span>
                <Link to={`/superadmin/workspaces`} className="text-xs text-brand-purple hover:underline">View</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
