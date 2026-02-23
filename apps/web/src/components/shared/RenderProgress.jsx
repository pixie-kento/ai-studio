import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function RenderProgress({ job, className }) {
  if (!job) return null;
  const pct = job.progress_percent || 0;

  return (
    <div className={cn('bg-orange-50 border border-orange-200 rounded-xl p-4', className)}>
      <div className="flex items-center gap-3 mb-3">
        <Loader2 size={18} className="text-brand-orange animate-spin" />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {job.current_step || 'Rendering...'}
          </p>
          <p className="text-xs text-slate-500">Job {job.id || job.render_server_job_id}</p>
        </div>
        <span className="ml-auto text-sm font-bold text-brand-orange">{pct}%</span>
      </div>
      <div className="w-full bg-orange-100 rounded-full h-2">
        <div
          className="bg-brand-orange h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default RenderProgress;
