import { cn } from '@/shared/utils';

import { STOCK_STATUS_COLORS, STOCK_STATUS_LABELS } from '../constants';
import type { StockStatus } from '../types';

interface StockStatusBadgeProps {
  status: StockStatus;
  className?: string;
}

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
  const colors = STOCK_STATUS_COLORS[status];
  const label = STOCK_STATUS_LABELS[status];

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
