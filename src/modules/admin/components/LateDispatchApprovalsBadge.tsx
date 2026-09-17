import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useLateDispatchApprovals } from '@/modules/admin/api';
import { cn } from '@/shared/utils';

/**
 * Live count of trucks waiting at the gate for a late dispatch gate-in, as a small
 * pill in the sidebar. A driver is standing outside while this sits unread, so the
 * count is worth carrying. Renders nothing when there is nothing pending or the
 * user cannot view the queue.
 */
export function LateDispatchApprovalsBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission([
    GATE_PERMISSIONS.LATE_DISPATCH_GATE_IN.VIEW,
    GATE_PERMISSIONS.LATE_DISPATCH_GATE_IN.APPROVE,
  ]);

  const { data } = useLateDispatchApprovals(
    { status: 'PENDING', all_companies: true },
    { enabled: canView },
  );

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} truck${count === 1 ? '' : 's'} waiting for a late gate-in approval`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
