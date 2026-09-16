import { ArrowRightLeft, ArrowUpRight } from 'lucide-react';

import { cn } from '@/shared/utils';

interface ReturnableTypeBadgeProps {
  isReturnable: boolean;
  className?: string;
}

/**
 * Returnable vs non-returnable. Worth showing everywhere a pass appears — the
 * two behave nothing alike: one is tracked until it comes back, the other closes
 * the moment it leaves the gate.
 */
export function ReturnableTypeBadge({ isReturnable, className }: ReturnableTypeBadgeProps) {
  const Icon = isReturnable ? ArrowRightLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        isReturnable
          ? 'border-sky-200 dark:border-sky-500/30 bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-400'
          : 'border-orange-200 dark:border-orange-500/30 bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-400',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {isReturnable ? 'Returnable' : 'Non-returnable'}
    </span>
  );
}
