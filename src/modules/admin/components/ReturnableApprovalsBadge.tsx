import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useReturnablePendingApproval } from '@/modules/maintenance/api';
import { cn } from '@/shared/utils';

/**
 * Live count of returnable / non-returnable gate passes waiting for the higher
 * authority's sign-off. Renders nothing when the queue is empty or the user
 * cannot approve.
 */
export function ReturnableApprovalsBadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(RETURNABLE_PERMISSIONS.APPROVE_GATEPASS);

  const { data } = useReturnablePendingApproval(canApprove);

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} gate pass${count === 1 ? '' : 'es'} pending approval`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
