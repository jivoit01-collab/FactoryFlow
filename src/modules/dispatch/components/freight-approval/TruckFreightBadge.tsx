import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { TruckFreightRow } from '../../api/freightApproval.api';

/**
 * Where a booked truck's freight stands, for its card on Vehicle Linking.
 *
 * Nothing is shown for a truck with no freight at all — it was linked before
 * freight was asked for, and the gate lets it through as before.
 */
export function TruckFreightBadge({
  row,
  bills,
}: {
  row: TruckFreightRow | undefined;
  /** The bills the card shows; any the freight does not cover are counted. */
  bills: { company_code?: string | null; doc_entry: number }[];
}) {
  const approval = row?.approval;
  if (!row || !approval) return null;
  const covered = new Set(row.covered_bills.map((b) => `${b.company_code}:${b.doc_entry}`));
  const uncovered = bills.filter(
    (bill) => !covered.has(`${bill.company_code ?? ''}:${bill.doc_entry}`),
  ).length;

  let label: string;
  let tone: string;
  switch (approval.status) {
    case 'PENDING':
      label = 'Freight awaiting approval';
      tone = 'border-amber-300 text-amber-700 dark:border-amber-500/30 dark:text-amber-400';
      break;
    case 'REJECTED':
      label = 'Freight refused';
      tone = 'border-rose-300 text-rose-700 dark:border-rose-500/30 dark:text-rose-400';
      break;
    case 'APPROVED':
      label = 'Freight approved';
      tone = 'border-emerald-300 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400';
      break;
    default:
      label = 'Freight within benchmark';
      tone = 'border-emerald-300 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400';
  }

  return (
    <>
      <Badge variant="outline" className={cn(tone)} title={approval.review_notes || undefined}>
        {label}
      </Badge>
      {uncovered > 0 && (
        <Badge
          variant="outline"
          className="border-amber-300 text-amber-700 dark:border-amber-500/30 dark:text-amber-400"
          title="Bills added after the freight was entered. Re-enter the freight to cover them."
        >
          {uncovered} bill{uncovered === 1 ? '' : 's'} not in the freight
        </Badge>
      )}
    </>
  );
}
