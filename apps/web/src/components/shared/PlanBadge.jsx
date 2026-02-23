import { cn } from '../../lib/utils.js';
import { Zap, Star, Crown } from 'lucide-react';

const PLAN_CONFIG = {
  starter: { label: 'Starter', icon: Star, color: 'bg-slate-100 text-slate-700' },
  pro: { label: 'Pro', icon: Zap, color: 'bg-brand-purple-light text-brand-purple' },
  studio: { label: 'Studio', icon: Crown, color: 'bg-yellow-100 text-yellow-700' },
};

export function PlanBadge({ plan, className }) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.starter;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', config.color, className)}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export default PlanBadge;
