import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { MaintenanceSpare } from '../../types';
import { stockLevel } from './storeFormat';

/** "Below 0", "Finished" or "Low"; nothing when there is enough. */
export function StockLevelBadge({
  spare,
  className,
}: {
  spare: MaintenanceSpare;
  className?: string;
}) {
  const level = stockLevel(spare);
  if (level === 'ok') return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        level === 'below' || level === 'empty'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
        className,
      )}
    >
      {level === 'below' ? 'Below 0' : level === 'empty' ? 'Finished' : 'Low'}
    </Badge>
  );
}
