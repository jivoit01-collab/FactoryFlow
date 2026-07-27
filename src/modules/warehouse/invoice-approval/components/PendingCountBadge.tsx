import { cn } from '@/shared/utils';

import { usePendingCount } from '../api/invoice-approval.queries';
import { useSelectedWarehouse } from '../useSelectedWarehouse';

/**
 * Live count of invoices awaiting action (PENDING + EDITED) in the approver's
 * selected warehouse, rendered next to the "Invoice Approval" sidebar item.
 * Renders nothing until a warehouse is chosen or when there is nothing to show.
 */
export function PendingCountBadge({ className }: { className?: string }) {
  const [warehouse] = useSelectedWarehouse();
  const { data } = usePendingCount(warehouse);
  const total = data?.total ?? 0;
  if (!total) return null;

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
