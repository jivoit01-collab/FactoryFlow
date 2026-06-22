import { ADMIN_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useDockingPartialScanRequests } from '@/modules/admin/api';
import { cn } from '@/shared/utils';

/**
 * Live count of pending docking partial-dispatch requests, rendered as a small pill in
 * the sidebar. Renders nothing when there are none pending or the user cannot view them.
 */
export function PartialApprovalsBadge({ className }: { className?: string }) {
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission([
    ADMIN_PERMISSIONS.DOCKING.VIEW_PARTIAL_SCAN,
    ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN,
  ]);

  const { data } = useDockingPartialScanRequests({ status: 'PENDING' }, { enabled: canView });

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} pending partial dispatch approval${count === 1 ? '' : 's'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
