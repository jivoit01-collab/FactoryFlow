import { cn } from '@/shared/utils';

import { getMovementStatus } from '../utils/movementStatus';

export function NonMovingStatusBadge({ days }: { days: number }) {
  const config = {
    recent: {
      label: 'Recently Moved',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    'slow-moving': {
      label: 'Slow Moving',
      classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    'non-moving': {
      label: 'Non Moving',
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
  } as const;
  const { label, classes } = config[getMovementStatus(days)];

  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs', classes)}>
      {label}
    </span>
  );
}
