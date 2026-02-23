import { STATUS_COLORS, STATUS_LABELS } from '../../lib/utils.js';
import { cn } from '../../lib/utils.js';

export function StatusBadge({ status, className }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={cn('badge', color, className)}>
      {label}
    </span>
  );
}

export default StatusBadge;
