import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BSTBoxScan, BSTTransferItem } from '../../types';
import { expectedBstItemBoxes } from './bstBoxCounts';

type Tally = { qty: number; boxes: number; itemName: string; uom: string };

type BillLine = { expected: number; qty: number; uom: string; itemName: string };

/**
 * The transfer's combined SAP bill with live scanned progress per item. A BST
 * entry can span several SAP documents; lines are aggregated by item code so the
 * box target and scanned progress match the scan rule (which caps each item at
 * the total box count summed across every document). The bill's target is a
 * **box count** (line quantity ÷ pieces-per-carton, from SAP) — each scanned box
 * is one carton. The "Over +N" / "Not on bill" rows are defensive and shouldn't
 * normally appear. Shared by the BST scan, review, gate-out, and detail screens.
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

  // Aggregate the bill by item code across all documents.
  const billByItem = new Map<string, BillLine>();
  for (const it of items) {
    const cur =
      billByItem.get(it.item_code) ?? { expected: 0, qty: 0, uom: it.uom, itemName: it.item_name };
    cur.expected += expectedBstItemBoxes(it);
    cur.qty += Number(it.quantity) || 0;
    billByItem.set(it.item_code, cur);
  }
  const billLines = [...billByItem.entries()];

  const billCodes = new Set(billByItem.keys());
  const offBill = [...scannedByItem.entries()].filter(([code]) => !billCodes.has(code));

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
            <th className="p-3 text-left font-medium">Item</th>
            <th className="w-[130px] p-3 text-right font-medium">Boxes to scan</th>
            <th className="w-[180px] p-3 text-left font-medium">Scanned</th>
            <th className="w-[130px] p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {billLines.map(([code, bill]) => {
            const scanned = scannedByItem.get(code);
            const scannedQty = scanned?.qty ?? 0;
            const boxes = scanned?.boxes ?? 0;
            const expectedBoxes = bill.expected;
            const over = expectedBoxes > 0 && boxes > expectedBoxes;
            const complete = expectedBoxes > 0 && boxes >= expectedBoxes;
            const progress =
              expectedBoxes > 0 ? Math.min(100, Math.round((boxes / expectedBoxes) * 100)) : null;
            return (
              <tr
                key={code}
                className={cn(
                  'border-b last:border-b-0',
                  over && 'bg-orange-50/70',
                  !over && boxes > 0 && !complete && 'bg-amber-50/60',
                  !over && complete && 'bg-emerald-50/60',
                )}
              >
                <td className="whitespace-nowrap p-3 align-top font-mono text-xs font-semibold">
                  {code}
                </td>
                <td className="p-3 align-top">
                  <div className="font-medium">{bill.itemName}</div>
                </td>
                <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                  <div className="font-medium">
                    {expectedBoxes} box{expectedBoxes === 1 ? '' : 'es'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bill.qty} {bill.uom}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="font-medium">
                    {boxes} of {expectedBoxes} box{expectedBoxes === 1 ? '' : 'es'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scannedQty > 0 ? `${scannedQty} ${bill.uom}` : '-'}
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
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Over +{boxes - expectedBoxes}
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

          {/* Items scanned that are NOT on the SAP bill (defensive — blocked on scan). */}
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
