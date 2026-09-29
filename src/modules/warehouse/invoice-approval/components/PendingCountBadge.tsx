import { cn } from '@/shared/utils';

import { usePendingCount } from '../api/invoice-approval.queries';
import { useSelectedSource } from '../useSelectedSource';
import { useSelectedWarehouse } from '../useSelectedWarehouse';

/**
 * Live count of invoices awaiting approval, rendered next to the "Invoice
 * Approval" sidebar item: the source the page is showing (OMS by default) for
 * the selected warehouse, plus the factory app's held bills across EVERY
 * warehouse the approver runs — a counter bill waiting at a warehouse they
 * don't have selected must still show up here. Renders nothing when there is
 * nothing to show.
 */
export function PendingCountBadge({ className }: { className?: string }) {
  const [warehouse] = useSelectedWarehouse();
  const [source] = useSelectedSource();
  const { data } = usePendingCount(source, warehouse);
  const { data: held } = usePendingCount('APP', warehouse);
  const total = (data?.total ?? 0) + (held?.all_warehouses ?? 0);
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
