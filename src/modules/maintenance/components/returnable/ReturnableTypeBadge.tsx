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
          ? 'border-sky-200 bg-sky-100 text-sky-800'
          : 'border-orange-200 bg-orange-100 text-orange-800',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {isReturnable ? 'Returnable' : 'Non-returnable'}
    </span>
  );
}
