import { CheckCircle2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BSTBoxScan, BSTTransferItem } from '../../types';

/**
 * The transfer's SAP line items (the "bill") with live scanned progress per item,
 * styled like the sales-dispatch BillItemsTable. Shared by the BST scan, review,
 * and gate-out review screens so they read identically.
 */
export function BSTBillTable({
  items,
  scans,
}: {
  items: BSTTransferItem[];
  scans: BSTBoxScan[];
}) {
  const scannedByItem = new Map<string, { qty: number; boxes: number }>();
  for (const s of scans) {
    const cur = scannedByItem.get(s.item_code) ?? { qty: 0, boxes: 0 };
    cur.qty += Number(s.quantity) || 0;
    cur.boxes += 1;
    scannedByItem.set(s.item_code, cur);
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
            <th className="p-3 text-left font-medium">Item</th>
            <th className="w-[130px] p-3 text-right font-medium">Bill Qty</th>
            <th className="w-[180px] p-3 text-left font-medium">Scanned</th>
            <th className="w-[120px] p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const scanned = scannedByItem.get(it.item_code);
            const scannedQty = scanned?.qty ?? 0;
            const boxes = scanned?.boxes ?? 0;
            const billQty = Number(it.quantity) || 0;
            const complete = billQty > 0 && scannedQty >= billQty;
            const progress = billQty > 0 ? Math.min(100, Math.round((scannedQty / billQty) * 100)) : null;
            return (
              <tr
                key={it.id}
                className={cn(
                  'border-b last:border-b-0',
                  boxes > 0 && !complete && 'bg-amber-50/60',
                  complete && 'bg-emerald-50/60',
                )}
              >
                <td className="whitespace-nowrap p-3 align-top font-mono text-xs font-semibold">
                  {it.item_code}
                </td>
                <td className="p-3 align-top">
                  <div className="font-medium">{it.item_name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Line {it.line_num + 1}</div>
                </td>
                <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                  {it.quantity} {it.uom}
                </td>
                <td className="p-3 align-top">
                  <div className="font-medium">
                    {boxes} box{boxes === 1 ? '' : 'es'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scannedQty > 0 ? `${scannedQty} ${it.uom}` : '-'}
                  </div>
                  {progress !== null ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  ) : null}
                </td>
                <td className="p-3 align-top">
                  <Badge
                    variant={complete ? 'success' : 'outline'}
                    className={cn(!complete && boxes > 0 && 'border-amber-200 bg-amber-50 text-amber-700')}
                  >
                    {complete ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                      </>
                    ) : boxes > 0 ? (
                      'Partial'
                    ) : (
                      'Open'
                    )}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
