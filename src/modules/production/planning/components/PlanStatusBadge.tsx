import { cn } from '@/shared/utils';

import { PLAN_STATUS_COLORS, PLAN_STATUS_LABELS } from '../constants';
import type { PlanStatus } from '../types';

interface PlanStatusBadgeProps {
  status: PlanStatus;
  className?: string;
}

export function PlanStatusBadge({ status, className }: PlanStatusBadgeProps) {
  const colors = PLAN_STATUS_COLORS[status] || PLAN_STATUS_COLORS.DRAFT;
  const label = PLAN_STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        colors.bg,
        colors.text,
        colors.darkBg,
        colors.darkText,
        className,
      )}
    >
      {label}
    </span>
  );
}
