import { cn } from '@/shared/utils';

import { RUN_STATUS_COLORS, RUN_STATUS_LABELS } from '../constants';
import type { RunStatus } from '../types';

interface ProductionStatusBadgeProps {
  status: RunStatus;
  className?: string;
}

export function ProductionStatusBadge({ status, className }: ProductionStatusBadgeProps) {
  const colors = RUN_STATUS_COLORS[status] || RUN_STATUS_COLORS.DRAFT;
  const label = RUN_STATUS_LABELS[status] || status;

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
