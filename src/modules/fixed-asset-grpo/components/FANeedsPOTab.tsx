import { CheckCircle2, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';
import { Button } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import { useFANeedsPO } from '../api/faGrpo.queries';
import { FA_GRPO_LINK_ACCESS, FA_GRPO_POST_ACCESS } from '../constants/permissions';
import { faGrpoPaths } from '../constants/routes';
import { useFAListState } from '../hooks/useFAListState';
import { FAClosureDialog } from './FAClosureDialog';
import { FAListFrame } from './FAListFrame';
import { FAListToolbar } from './FAListToolbar';
import { FAPOLinkDialog } from './FAPOLinkDialog';

/**
 * Needs PO: completed fixed-asset gate entries with no SAP PO linked yet.
 *
 * Each row offers **Link PO** (link or post right) and **Done in SAP by hand**
 * (post right). Linking moves the entry to Ready to post.
 */
export function FANeedsPOTab() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canLink = hasAnyPermission(FA_GRPO_LINK_ACCESS);
  const canPost = hasAnyPermission(FA_GRPO_POST_ACCESS);

  const list = useFAListState();
  const { data, isLoading, error, refetch } = useFANeedsPO(list.params);

  const [linkFor, setLinkFor] = useState<number | null>(null);
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
        emptyText="No fixed-asset entry is waiting for a PO."
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      >
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">Entry</th>
              <th className="p-2 text-left font-medium">Arrived</th>
              <th className="p-2 text-left font-medium">Supplier (gate)</th>
              <th className="p-2 text-left font-medium">Bill no.</th>
              <th className="p-2 text-left font-medium">Work order</th>
              <th className="p-2 text-right font-medium">Assets</th>
              <th className="p-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row) => (
              <tr key={row.vehicle_entry_id} className="border-t">
                <td className="p-2 font-medium">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => navigate(faGrpoPaths.preview(row.vehicle_entry_id))}
                  >
                    {row.entry_no}
                  </button>
                </td>
                <td className="p-2 whitespace-nowrap">{formatDateTimeShort(row.entry_time)}</td>
                <td className="p-2">{row.supplier_name || '—'}</td>
                <td className="p-2">{row.invoice_number || '—'}</td>
                <td className="p-2">{row.work_order_number || '—'}</td>
                <td className="p-2 text-right">{row.item_count}</td>
                <td className="p-2">
                  <div className="flex justify-end gap-2">
                    {canLink && (
                      <Button size="sm" onClick={() => setLinkFor(row.vehicle_entry_id)}>
                        <Link2 className="mr-1 h-3.5 w-3.5" /> Link PO
                      </Button>
                    )}
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
            ))}
          </tbody>
        </table>
      </FAListFrame>

      {linkFor !== null && (
        <FAPOLinkDialog
          vehicleEntryId={linkFor}
          open
          onOpenChange={(open) => !open && setLinkFor(null)}
        />
      )}
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
