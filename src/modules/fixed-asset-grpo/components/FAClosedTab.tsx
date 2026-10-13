import { Undo2 } from 'lucide-react';
import { useState } from 'react';

import { usePermission } from '@/core/auth';
import { Button } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import { useFAAllEntries, useFAGRPOSummary } from '../api/faGrpo.queries';
import { FA_GRPO_POST_ACCESS } from '../constants/permissions';
import { useFAListState } from '../hooks/useFAListState';
import { FAClosureDialog } from './FAClosureDialog';
import { FAListFrame } from './FAListFrame';
import { FAListToolbar } from './FAListToolbar';

/**
 * Done in SAP by hand: the entries closed out of the work lists. The only
 * place they are listed, so this is where one is reopened.
 */
export function FAClosedTab() {
  const { hasAnyPermission } = usePermission();
  const canPost = hasAnyPermission(FA_GRPO_POST_ACCESS);

  const list = useFAListState({ state: 'CLOSED', include_closed: 1 });
  const { data, isLoading, error, refetch } = useFAAllEntries(list.params);
  const [openFor, setOpenFor] = useState<{ id: number; entryNo: string } | null>(null);

  // The summary's closed_count (the tab badge and the card) counts every
  // closed FA entry; this list leaves out entries from before the cut-over
  // (and gate-cancelled ones).
  // Over all months (`counts` ignores the search), say how many are not listed.
  const { data: summary } = useFAGRPOSummary();
  const listedClosed = data?.counts?.CLOSED ?? 0;
  const notListed =
    !list.month && data && summary ? Math.max(0, summary.closed_count - listedClosed) : 0;

  return (
    <div className="space-y-3">
      <FAListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        month={list.month}
        onMonthChange={list.setMonth}
      />
      {notListed > 0 && (
        <p className="text-xs text-muted-foreground">
          {notListed} closed {notListed === 1 ? 'entry is' : 'entries are'} counted in the total but
          not listed here: this list leaves out entries from before the cut-over and entries
          cancelled at the gate.
        </p>
      )}
      <FAListFrame
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyText="No entry is marked as done in SAP by hand."
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">Entry</th>
              <th className="p-2 text-left font-medium">Arrived</th>
              <th className="p-2 text-left font-medium">Supplier (gate)</th>
              <th className="p-2 text-left font-medium">Bill no.</th>
              <th className="p-2 text-left font-medium">PO</th>
              <th className="p-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row) => (
              <tr key={row.vehicle_entry_id} className="border-t">
                <td className="p-2 font-medium">{row.entry_no}</td>
                <td className="p-2 whitespace-nowrap">{formatDateTimeShort(row.entry_time)}</td>
                <td className="p-2">{row.supplier_name || '—'}</td>
                <td className="p-2">{row.invoice_number || '—'}</td>
                <td className="p-2">{row.po_numbers.join(', ') || '—'}</td>
                <td className="p-2">
                  <div className="flex justify-end">
                    {canPost && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOpenFor({ id: row.vehicle_entry_id, entryNo: row.entry_no })
                        }
                      >
                        <Undo2 className="mr-1 h-3.5 w-3.5" /> Details / reopen
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FAListFrame>

      {openFor && (
        <FAClosureDialog
          vehicleEntryId={openFor.id}
          entryNo={openFor.entryNo}
          open
          onOpenChange={(open) => !open && setOpenFor(null)}
        />
      )}
    </div>
  );
}
