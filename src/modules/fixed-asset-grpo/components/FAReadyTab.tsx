import { CheckCircle2, FileCheck2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { Button } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import { useFAPendingEntries } from '../api/faGrpo.queries';
import { FA_GRPO_POST_ACCESS } from '../constants/permissions';
import { faGrpoPaths } from '../constants/routes';
import { useFAListState } from '../hooks/useFAListState';
import { FAClosureDialog } from './FAClosureDialog';
import { FAListFrame } from './FAListFrame';
import { FAListToolbar } from './FAListToolbar';

/**
 * Ready to post: completed fixed-asset entries with a linked PO that is not
 * posted yet. Open one to review the lines and post (or simulate) the GRPO.
 */
export function FAReadyTab() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canPost = hasAnyPermission(FA_GRPO_POST_ACCESS);

  const list = useFAListState();
  const { data, isLoading, error, refetch } = useFAPendingEntries(list.params);
  const [closeFor, setCloseFor] = useState<{ id: number; entryNo: string } | null>(null);

  return (
    <div className="space-y-3">
      <FAListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        month={list.month}
        onMonthChange={list.setMonth}
      />
      <FAListFrame
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyText="Nothing is ready to post. Link a PO on a Needs PO entry first."
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      >
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">Entry</th>
              <th className="p-2 text-left font-medium">Arrived</th>
              <th className="p-2 text-left font-medium">SAP supplier</th>
              <th className="p-2 text-left font-medium">PO</th>
              <th className="p-2 text-left font-medium">Bill no.</th>
              <th className="p-2 text-left font-medium">Work order</th>
              <th className="p-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row) => {
              const suppliers = row.suppliers ?? [];
              const receipts = suppliers.flatMap((s) => s.po_receipts);
              const supplier = suppliers[0];
              return (
                <tr key={row.vehicle_entry_id} className="border-t">
                  <td className="p-2 font-medium">{row.entry_no}</td>
                  <td className="p-2 whitespace-nowrap">{formatDateTimeShort(row.entry_time)}</td>
                  <td className="p-2">
                    {supplier ? (
                      <>
                        <div>{supplier.supplier_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {supplier.supplier_code}
                          {row.fa_supplier_name ? ` · gate: ${row.fa_supplier_name}` : ''}
                        </div>
                      </>
                    ) : (
                      row.fa_supplier_name || '—'
                    )}
                  </td>
                  <td className="p-2">{receipts.map((po) => po.po_number).join(', ') || '—'}</td>
                  <td className="p-2">{row.invoice_number || '—'}</td>
                  <td className="p-2">{row.work_order_number || '—'}</td>
                  <td className="p-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(faGrpoPaths.preview(row.vehicle_entry_id))}
                      >
                        <FileCheck2 className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                      {canPost && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCloseFor({ id: row.vehicle_entry_id, entryNo: row.entry_no })
                          }
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done in SAP by hand
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </FAListFrame>

      {closeFor && (
        <FAClosureDialog
          vehicleEntryId={closeFor.id}
          entryNo={closeFor.entryNo}
          open
          onOpenChange={(open) => !open && setCloseFor(null)}
        />
      )}
    </div>
  );
}
