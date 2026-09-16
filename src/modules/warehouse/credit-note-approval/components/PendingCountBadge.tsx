import { cn } from '@/shared/utils';

import { useCreditNotePendingCount } from '../api/creditNoteApproval.queries';

/**
 * Live count of credit notes SAP is holding for approval, rendered next to the
 * "Credit Note Approval" sidebar item.
 *
 * Counts the whole company queue rather than just the reader's own rows: the
 * reason the page exists is that a credit note stuck on somebody who never
 * opens SAP is invisible, and a badge that only counted your own would hide
 * exactly that. Renders nothing when the queue is empty or unreadable.
 */
export function PendingCountBadge({ className }: { className?: string }) {
  const { data } = useCreditNotePendingCount();
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
