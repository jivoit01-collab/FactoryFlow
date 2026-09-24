import { LEAVE_DECIDE_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { cn } from '@/shared/utils';

import { usePendingLeaveCount } from '../api';

/**
 * How many requests are waiting on this person, next to the Approvals item.
 *
 * Counts only what they may actually decide — the endpoint is scoped by the
 * reporting tree, so a manager's badge never includes another line's queue.
 *
 * Fetched from the count endpoint rather than by measuring the queue: this is
 * polled from every page by every approver, and pulling the whole list to call
 * `.length` on it is the mistake the OMS integration already made once and had
 * to undo. Renders nothing when there is nothing waiting.
 */
export function PendingLeaveBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canDecide = hasAnyPermission(LEAVE_DECIDE_ACCESS);
  const { data } = usePendingLeaveCount(canDecide);

  const total = data ?? 0;
  if (!canDecide || !total) return null;

  return (
    <span
      className={cn(
        'ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white',
        className,
      )}
    >
      {total > 99 ? '99+' : total}
    </span>
  );
}
