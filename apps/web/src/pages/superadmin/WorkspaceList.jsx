import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2, Users, Film, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import api from '../../lib/api.js';
import { formatDate, formatCurrency } from '../../lib/utils.js';

const PLAN_COLORS = {
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  studio: 'bg-amber-100 text-amber-700',
};

export default function WorkspaceList() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sort, setSort] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'workspaces', search, planFilter, sort, sortDir, page],
    queryFn: () => api.get('/api/superadmin/workspaces', {
      params: { search, plan: planFilter, sort: `${sortDir === 'desc' ? '-' : ''}${sort}`, page, perPage: 20 },
    }).then(r => r.data),
  });

  const handleSort = (col) => {
    if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => sort === col ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Workspaces</h1>
        <p className="text-slate-500 text-sm mt-1">{data?.totalItems ?? '…'} total workspaces</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 w-64"
            placeholder="Search by name or slug…"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="input w-36"
        >
          <option value="">All plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="studio">Studio</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
                <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-900">
                  Workspace <SortIcon col="name" />
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Plan</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">
                <button onClick={() => handleSort('shows_count')} className="flex items-center gap-1 hover:text-slate-900">
                  Shows <SortIcon col="shows_count" />
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">
                <button onClick={() => handleSort('episodes_this_month')} className="flex items-center gap-1 hover:text-slate-900">
                  Episodes/mo <SortIcon col="episodes_this_month" />
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden lg:table-cell">
                <button onClick={() => handleSort('created')} className="flex items-center gap-1 hover:text-slate-900">
                  Created <SortIcon col="created" />
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden lg:table-cell">Owner</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items?.map(ws => (
              <tr key={ws.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-sm flex-shrink-0">
                      {ws.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ws.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{ws.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[ws.plan] || PLAN_COLORS.starter}`}>
                    {ws.plan}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Film size={13} className="text-slate-400" />
                    {ws.shows_count ?? 0}
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm text-slate-600">{ws.episodes_this_month ?? 0}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">{formatDate(ws.created)}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <p className="text-xs text-slate-600">{ws.owner_email || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/superadmin/workspaces/${ws.id}`}
                    className="text-xs text-brand-purple hover:underline font-medium flex items-center gap-1"
                  >
                    View <ExternalLink size={11} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {data.totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
