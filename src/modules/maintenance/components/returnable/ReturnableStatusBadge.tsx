import { AlertTriangle } from 'lucide-react';

import { cn } from '@/shared/utils';

import { RETURNABLE_STATUS_LABELS, RETURNABLE_STATUS_STYLES } from '../../constants/returnable.constants';
import type { ReturnableStatus } from '../../types';

interface ReturnableStatusBadgeProps {
  status: ReturnableStatus;
  /**
   * Overdue is a flag, not a status — a pass can be OUT *and* overdue. Rendered
   * as a separate marker so the real status stays visible.
   */
  isOverdue?: boolean;
  daysOverdue?: number;
  className?: string;
}

export function ReturnableStatusBadge({
  status,
  isOverdue = false,
  daysOverdue = 0,
  className,
}: ReturnableStatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
          RETURNABLE_STATUS_STYLES[status],
        )}
      >
        {RETURNABLE_STATUS_LABELS[status]}
      </span>
      {isOverdue ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
          title={`${daysOverdue} day(s) past the expected return date`}
        >
          <AlertTriangle className="h-3 w-3" />
          {daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Overdue'}
        </span>
      ) : null}
    </span>
  );
}
