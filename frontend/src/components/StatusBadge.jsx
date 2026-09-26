import { cn, statusLabel } from '../lib/utils';

const variants = {
  approved: 'bg-status-approved text-status-approved-text border border-status-approved',
  denied: 'bg-status-denied text-status-denied-text border border-status-denied',
  escalated: 'bg-status-escalated text-status-escalated-text border border-status-escalated',
  pending: 'bg-status-pending text-status-pending-text border border-transparent',
  processing: 'bg-status-processing text-status-processing-text border border-transparent',
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold tracking-wide uppercase',
      variants[status] || 'bg-surface-3 text-text-secondary border border-border-subtle',
      className
    )}>
      {statusLabel(status)}
    </span>
  );
}
