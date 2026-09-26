import { SAP_APPROVALS_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { cn } from '@/shared/utils';

import { useSapApprovalsPendingCount } from '../api/sap-approvals.queries';

/**
 * How many SAP approval requests are waiting on the reader's own SAP user,
 * next to the "SAP Approvals" sidebar item.
 *
 * Polled from every page, so it is the count endpoint (never the list), it is
 * enabled only for someone holding an inbox right, it polls slowly away from
 * the page, and it renders nothing when nothing waits or the count is
 * unreadable. Imported by direct path, not through the module's barrel.
 */
export function PendingCountBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission(SAP_APPROVALS_ACCESS);
  const { data } = useSapApprovalsPendingCount(canView);

  const total = data?.total ?? 0;
  if (!canView || !total) return null;

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
