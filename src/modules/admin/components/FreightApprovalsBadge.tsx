import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useFreightApprovals } from '@/modules/dispatch/api/freightApproval.api';
import { cn } from '@/shared/utils';

/**
 * Trucks whose freight is over its benchmark and waiting for a decision, as a
 * pill in the sidebar. The gate will not take such a truck in, so the count
 * polls rather than waiting for the page to be opened.
 */
export function FreightApprovalsBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission([
    DISPATCH_PERMISSIONS.VIEW_FREIGHT_APPROVALS,
    DISPATCH_PERMISSIONS.APPROVE_FREIGHT_APPROVALS,
  ]);

  const { data } = useFreightApprovals('PENDING', { enabled: canView, poll: canView });

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} truck${count === 1 ? '' : 's'} waiting for a freight approval`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
