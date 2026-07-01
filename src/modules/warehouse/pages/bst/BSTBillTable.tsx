import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BSTBoxScan, BSTTransferItem } from '../../types';

type Tally = { qty: number; boxes: number; itemName: string; uom: string };

/**
 * The transfer's SAP line items (the "bill") with live scanned progress per item,
 * styled like the sales-dispatch BillItemsTable. Scanning is NOT restricted to the
 * bill — the warehouse may send off-bill items or extra quantity — so this table
 * also flags over-scanned bill items ("Over +N") and appends any off-bill items
 * scanned ("Not on bill"). Shared by the BST scan, review, gate-out, and detail
 * screens so they read identically.
 */
export function BSTBillTable({
  items,
  scans,
}: {
  items: BSTTransferItem[];
  scans: BSTBoxScan[];
}) {
  const scannedByItem = new Map<string, Tally>();
  for (const s of scans) {
    const cur =
      scannedByItem.get(s.item_code) ?? { qty: 0, boxes: 0, itemName: s.item_name, uom: s.uom };
    cur.qty += Number(s.quantity) || 0;
    cur.boxes += 1;
    scannedByItem.set(s.item_code, cur);
  }

  const billCodes = new Set(items.map((i) => i.item_code));
  const offBill = [...scannedByItem.entries()].filter(([code]) => !billCodes.has(code));

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
            <th className="p-3 text-left font-medium">Item</th>
            <th className="w-[130px] p-3 text-right font-medium">Bill Qty</th>
            <th className="w-[180px] p-3 text-left font-medium">Scanned</th>
            <th className="w-[130px] p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const scanned = scannedByItem.get(it.item_code);
            const scannedQty = scanned?.qty ?? 0;
            const boxes = scanned?.boxes ?? 0;
            const billQty = Number(it.quantity) || 0;
            const over = billQty > 0 && scannedQty > billQty;
            const complete = billQty > 0 && scannedQty >= billQty;
            const progress = billQty > 0 ? Math.min(100, Math.round((scannedQty / billQty) * 100)) : null;
            return (
              <tr
                key={it.id}
                className={cn(
                  'border-b last:border-b-0',
                  over && 'bg-orange-50/70',
                  !over && boxes > 0 && !complete && 'bg-amber-50/60',
                  !over && complete && 'bg-emerald-50/60',
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
                        className={cn('h-full rounded-full', over ? 'bg-orange-500' : 'bg-emerald-500')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  ) : null}
                </td>
                <td className="p-3 align-top">
                  {over ? (
                    <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Over +{scannedQty - billQty}
                    </Badge>
                  ) : complete ? (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                    </Badge>
                  ) : boxes > 0 ? (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      Partial
                    </Badge>
                  ) : (
                    <Badge variant="outline">Open</Badge>
                  )}
                </td>
              </tr>
            );
          })}

          {/* Items scanned that are NOT on the SAP bill. */}
          {offBill.map(([code, tally]) => (
            <tr key={`off-${code}`} className="border-b bg-red-50/70 last:border-b-0">
              <td className="whitespace-nowrap p-3 align-top font-mono text-xs font-semibold">
                {code}
              </td>
              <td className="p-3 align-top">
                <div className="font-medium">{tally.itemName || '—'}</div>
                <div className="mt-1 text-xs text-red-600">Not on this transfer&apos;s bill</div>
              </td>
              <td className="whitespace-nowrap p-3 text-right align-top tabular-nums text-muted-foreground">
                —
              </td>
              <td className="p-3 align-top">
                <div className="font-medium">
                  {tally.boxes} box{tally.boxes === 1 ? '' : 'es'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tally.qty > 0 ? `${tally.qty} ${tally.uom}` : '-'}
                </div>
              </td>
              <td className="p-3 align-top">
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Not on bill
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {offBill.length > 0 ? (
        <div className="border-t bg-red-50 p-2 text-xs text-red-700">
          {offBill.reduce((n, [, t]) => n + t.boxes, 0)} scanned box
          {offBill.reduce((n, [, t]) => n + t.boxes, 0) === 1 ? '' : 'es'} outside this transfer&apos;s
          bill.
        </div>
      ) : null}
    </div>
  );
}
