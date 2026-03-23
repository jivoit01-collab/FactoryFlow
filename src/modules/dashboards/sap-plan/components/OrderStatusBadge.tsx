import { cn } from '@/shared/utils';

import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../constants';
import type { ProductionOrderStatus } from '../types';

interface OrderStatusBadgeProps {
  status: ProductionOrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const colors = ORDER_STATUS_COLORS[status];
  const label = ORDER_STATUS_LABELS[status];

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
