import { Ban, HandCoins } from 'lucide-react';
import { toast } from 'sonner';

import { type CashSaleOut, useCancelCashSaleOut, useCashSaleOuts } from '@/modules/gate/api';
import { GateStatusBadge } from '@/modules/gate/components';
import { promptDialog } from '@/shared/components';
import { Button } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

const TH = 'p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

/**
 * Cash sales marked out in the board's date range. They have no docking, so
 * they sit apart from the trucks above and are not counted in the stat cards.
 * Hidden on a day with none, like the Expected section.
 */
export function CashSaleOutSection({
  dateFrom,
  dateTo,
  canCancel,
}: {
  dateFrom: string;
  dateTo: string;
  canCancel: boolean;
}) {
  const { data: entries = [] } = useCashSaleOuts({ from_date: dateFrom, to_date: dateTo });
  const cancelOut = useCancelCashSaleOut();

  if (!entries.length) return null;

  const outCount = entries.filter((entry) => entry.status === 'OUT').length;

  const handleCancel = async (entry: CashSaleOut) => {
    const reason = await promptDialog({
      title: `Cancel ${entry.entry_no}?`,
      description: 'Its bills go back to the list and can be marked out again.',
      label: 'Reason',
      placeholder: 'Why is this entry wrong?',
      confirmLabel: 'Cancel entry',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (reason === null) return;
    try {
      await cancelOut.mutateAsync({ id: entry.id, reason });
      toast.success(`${entry.entry_no} cancelled`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not cancel the entry'));
    }
  };

  return (
    <section className="rounded-md border">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <HandCoins className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Cash Sale Out ({outCount})</h3>
        <span className="text-xs text-muted-foreground">
          — counter bills taken out by the buyer, no docking
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className={TH}>Entry No.</th>
              <th className={TH}>Company</th>
              <th className={TH}>Bills</th>
              <th className={TH}>Taken Out By</th>
              <th className={TH}>Vehicle</th>
              <th className={TH}>Out At</th>
              <th className={TH}>Status</th>
              {canCancel ? <th className={TH} aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isCancelled = entry.status === 'CANCELLED';
              return (
                <tr
                  key={entry.id}
                  className={cn('border-t', isCancelled && 'text-muted-foreground')}
                >
                  <td className="whitespace-nowrap p-3 font-medium">{entry.entry_no}</td>
                  <td className="whitespace-nowrap p-3">{entry.company_name}</td>
                  <td className="p-3">
                    <div className="font-medium">
                      {entry.bills.map((bill) => bill.sap_doc_num ?? bill.sap_doc_entry).join(', ')}
                    </div>
                    <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                      {entry.bills.map((bill) => bill.item_summary).join('; ')}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{entry.taken_by_name}</div>
                    {entry.taken_by_mobile ? (
                      <div className="text-xs text-muted-foreground">{entry.taken_by_mobile}</div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {entry.vehicle_no || <span className="text-muted-foreground">On foot</span>}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <div>{new Date(entry.out_at).toLocaleString()}</div>
                    {entry.marked_out_by_name ? (
                      <div className="text-xs text-muted-foreground">
                        by {entry.marked_out_by_name}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <GateStatusBadge
                      status={isCancelled ? 'CANCELLED' : 'DISPATCHED'}
                      label={isCancelled ? 'cancelled' : 'marked out'}
                    />
                    {isCancelled && entry.cancel_reason ? (
                      <div
                        className="mt-1 max-w-[200px] truncate text-xs"
                        title={entry.cancel_reason}
                      >
                        {entry.cancel_reason}
                      </div>
                    ) : null}
                  </td>
                  {canCancel ? (
                    <td className="whitespace-nowrap p-3 text-right">
                      {!isCancelled ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleCancel(entry)}
                          disabled={cancelOut.isPending}
                        >
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
