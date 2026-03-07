import { cn } from '@/shared/utils';

import { CLEARANCE_STATUS_COLORS, CLEARANCE_STATUS_LABELS } from '../constants';
import type { ClearanceStatus } from '../types';

interface ClearanceStatusBadgeProps {
  status: ClearanceStatus;
  className?: string;
}

export function ClearanceStatusBadge({ status, className }: ClearanceStatusBadgeProps) {
  const colors = CLEARANCE_STATUS_COLORS[status] || CLEARANCE_STATUS_COLORS.DRAFT;
  const label = CLEARANCE_STATUS_LABELS[status] || status;

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
