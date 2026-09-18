import { StatusPill, type StatusTone } from '@/shared/components/page';

import type { DispatchPlanStatus } from '../types';

/** What each booking status *means*, in the module's shared tone vocabulary. */
const STATUS_TONES: Record<DispatchPlanStatus, StatusTone> = {
  PENDING: 'neutral',
  BOOKED: 'info',
  DISPATCHED: 'done',
  CANCELLED: 'blocked',
};

const STATUS_LABELS: Record<DispatchPlanStatus, string> = {
  PENDING: 'Pending',
  BOOKED: 'Booked',
  DISPATCHED: 'Dispatched',
  CANCELLED: 'Cancelled',
};

interface StatusBadgeProps {
  status: DispatchPlanStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <StatusPill tone={STATUS_TONES[status]} dot className={className}>
      {STATUS_LABELS[status]}
    </StatusPill>
  );
}
