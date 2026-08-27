import { GOODS_RETURN_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
// Direct-ish import via the goods-return api barrel (api + queries only, no
// components), so this sidebar badge doesn't drag page chunks in with it.
import { usePendingApprovalGoodsReturns } from '@/modules/returns/customer/api';
import { cn } from '@/shared/utils';

/**
 * Live count of goods returns flagged "coming on approval" and still pending an
 * admin decision. Renders nothing when the queue is empty or the user cannot approve.
 */
export function GoodsReturnApprovalsBadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(GOODS_RETURN_PERMISSIONS.APPROVE);

  const { data } = usePendingApprovalGoodsReturns(canApprove);

  const count = data?.length ?? 0;
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={`${count} goods return${count === 1 ? '' : 's'} pending approval`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
