import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useBSTPartialTransfers } from '@/modules/warehouse/api';
import { cn } from '@/shared/utils';

/**
 * Live count of BST partial-transfer requests waiting for a decision. Polls far
 * slower than the approvals page itself — a sidebar pill does not need the 4s
 * live cadence the queue uses.
 */
export function BstApprovalsBadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL);

  const { data } = useBSTPartialTransfers(
    { status: 'PENDING' },
    { enabled: canApprove, refetchInterval: canApprove ? 30_000 : false },
  );

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} pending BST partial-transfer approval${count === 1 ? '' : 's'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
