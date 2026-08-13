import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useState } from 'react';

import { Badge, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BSTBoxScan, BSTManualEntry, BSTTransferItem } from '../../types';
import { expectedBstItemBoxes, isPmItemCode } from './bstBoxCounts';

type Tally = { qty: number; boxes: number; itemName: string; uom: string };

type BillLine = { expected: number; qty: number; uom: string; itemName: string };

/** Save a scan-exempt line's typed quantity; `null` clears it. Rejects surface as a throw. */
export type SaveManualQty = (itemCode: string, quantity: string | null) => Promise<unknown>;

function trimQty(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

// Up to 3 decimals — the quantity precision the BST API stores.
const QTY_PATTERN = /^\d+(\.\d{1,3})?$/;

/**
 * The typed quantity for one scan-exempt (PM) line. Commits on Enter/blur and only
 * when the value actually changed, so the 4s detail poll doesn't fire writes. The
 * server owns the rules (PM-only, on-bill, not over the bill) — a rejected save
 * reverts the box to the stored value and the caller shows the reason.
 */
function ManualQtyCell({
  itemCode,
  entry,
  uom,
  onSave,
}: {
  itemCode: string;
  entry?: BSTManualEntry;
  uom: string;
  onSave: SaveManualQty;
}) {
  const saved = entry ? trimQty(Number(entry.quantity)) : '';
  const [value, setValue] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState(false);

  // Re-sync only when the stored value itself changes, so a poll landing mid-typing
  // doesn't overwrite what the operator is entering.
  useEffect(() => setValue(saved), [saved]);

  const commit = async () => {
    const raw = value.trim();
    if (raw === saved) return;
    if (raw !== '' && !QTY_PATTERN.test(raw)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setSaving(true);
    try {
      await onSave(itemCode, raw === '' ? null : raw);
    } catch {
      setValue(saved); // caller reports why
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur(); // blur commits
    } else if (e.key === 'Escape') {
      setValue(saved);
      setInvalid(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          inputMode="decimal"
          disabled={saving}
          aria-label={`Quantity sent for ${itemCode}`}
          placeholder="Enter qty"
          className={cn('h-8 w-24 tabular-nums', invalid && 'border-red-400')}
        />
        <span className="text-xs text-muted-foreground">{uom}</span>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      {invalid ? (
        <p className="text-xs text-red-600">Numbers only (up to 3 decimals).</p>
      ) : entry ? (
        <p className="text-xs text-muted-foreground">
          by {entry.entered_by_name || '—'}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The transfer's combined SAP bill with live scanned progress per item. A BST
 * entry can span several SAP documents; lines are aggregated by item code.
 *
 * Completeness is judged on QUANTITY — scanned pieces vs the bill's line quantity
 * — the same rule the backend uses to gate sealing (compute_scan_status). Quantity
 * is ground truth on both sides (the SAP line qty; each box's own piece count), so
 * a box whose qty is wrong (e.g. a 4-pack labelled as 1) is caught as a shortfall
 * even though the box COUNT looks right. Only when no scan carries a quantity
 * (legacy scans) does it fall back to the box-count estimate. The "Over" / "Not on
 * bill" rows are defensive and shouldn't normally appear. Shared by the BST scan,
 * review, gate-out, and detail screens.
 *
 * Packaging material (PM) isn't barcode-tracked, so those lines can't be evidenced by
 * scans: a "Sent (manual)" column appears whenever the bill carries a PM line — the
 * sender types the quantity there (`onSaveManualQty`, the scan page), and every other
 * screen shows what was entered, read-only.
 */
export function BSTBillTable({
  items,
  scans,
  manualEntries = [],
  onSaveManualQty,
}: {
  items: BSTTransferItem[];
  scans: BSTBoxScan[];
  /** Typed quantities for the scan-exempt lines (from the transfer detail). */
  manualEntries?: BSTManualEntry[];
  /** Pass to make those quantities editable; omit for a read-only view. */
  onSaveManualQty?: SaveManualQty;
}) {
  const scannedByItem = new Map<string, Tally>();
  for (const s of scans) {
    const cur =
      scannedByItem.get(s.item_code) ?? { qty: 0, boxes: 0, itemName: s.item_name, uom: s.uom };
    cur.qty += Number(s.quantity) || 0;
    cur.boxes += 1;
    scannedByItem.set(s.item_code, cur);
  }

  // Quantity is the ground truth whenever any scan carries one; only legacy /
  // quantity-less loads fall back to the box-count estimate. Mirrors the backend.
  const usesQuantity = scans.some((s) => (Number(s.quantity) || 0) > 0);

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

  // The typed-quantity column only earns its place when the bill has a scan-exempt
  // line — a pure finished-goods transfer keeps the table it always had. Entries are
  // keyed by the code normalized upper-case, the way the backend stores them.
  const manualByItem = new Map(
    manualEntries.map((e) => [e.item_code.trim().toUpperCase(), e]),
  );
  const manualFor = (code: string) => manualByItem.get(code.trim().toUpperCase());
  const hasManualColumn = billLines.some(([code]) => isPmItemCode(code));

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className={cn('w-full text-sm', hasManualColumn ? 'min-w-[900px]' : 'min-w-[760px]')}>
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
            <th className="p-3 text-left font-medium">Item</th>
            <th className="w-[140px] p-3 text-right font-medium">To scan</th>
            <th className="w-[190px] p-3 text-left font-medium">Scanned</th>
            {hasManualColumn && (
              <th className="w-[160px] p-3 text-left font-medium">
                Sent (manual)
                <div className="text-xs font-normal text-muted-foreground">
                  Packaging material
                </div>
              </th>
            )}
            <th className="w-[130px] p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {billLines.map(([code, bill]) => {
            const scanned = scannedByItem.get(code);
            const scannedQty = scanned?.qty ?? 0;
            const boxes = scanned?.boxes ?? 0;
            const expectedBoxes = bill.expected;
            const expectedQty = bill.qty;
            // Packaging material (PM) isn't scanned on a BST — never short, never
            // "Open"; mirrors the backend's requires_scan exemption.
            const requiresScan = !isPmItemCode(code);
            // Completeness on QUANTITY when trustworthy, else the box-count estimate.
            const complete = usesQuantity
              ? expectedQty > 0 && scannedQty >= expectedQty
              : expectedBoxes > 0 && boxes >= expectedBoxes;
            const over = usesQuantity
              ? expectedQty > 0 && scannedQty > expectedQty
              : expectedBoxes > 0 && boxes > expectedBoxes;
            const hasScans = boxes > 0;
            const overBy = usesQuantity ? scannedQty - expectedQty : boxes - expectedBoxes;
            const progress = !requiresScan
              ? null
              : usesQuantity
                ? expectedQty > 0
                  ? Math.min(100, Math.round((scannedQty / expectedQty) * 100))
                  : null
                : expectedBoxes > 0
                  ? Math.min(100, Math.round((boxes / expectedBoxes) * 100))
                  : null;
            return (
              <tr
                key={code}
                className={cn(
                  'border-b last:border-b-0',
                  requiresScan && over && 'bg-orange-50/70',
                  requiresScan && !over && hasScans && !complete && 'bg-amber-50/60',
                  requiresScan && !over && complete && 'bg-emerald-50/60',
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
                    {trimQty(expectedQty)} {bill.uom}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {expectedBoxes} box{expectedBoxes === 1 ? '' : 'es'}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="font-medium">
                    {trimQty(scannedQty)} of {trimQty(expectedQty)} {bill.uom}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {boxes} box{boxes === 1 ? '' : 'es'}
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
                {hasManualColumn && (
                  <td className="p-3 align-top">
                    {requiresScan ? (
                      // Barcode-tracked: the scan is the record, nothing to type.
                      <span className="text-muted-foreground">—</span>
                    ) : onSaveManualQty ? (
                      <ManualQtyCell
                        itemCode={code}
                        entry={manualFor(code)}
                        uom={bill.uom}
                        onSave={onSaveManualQty}
                      />
                    ) : manualFor(code) ? (
                      <div>
                        <div className="font-medium tabular-nums">
                          {trimQty(Number(manualFor(code)!.quantity))} {bill.uom}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {manualFor(code)!.entered_by_name || '—'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not entered</span>
                    )}
                  </td>
                )}
                <td className="p-3 align-top">
                  {!requiresScan ? (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                      Scan not required
                    </Badge>
                  ) : over ? (
                    <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Over +{trimQty(overBy)}
                    </Badge>
                  ) : complete ? (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                    </Badge>
                  ) : hasScans ? (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      Short {trimQty(expectedQty - scannedQty)} {bill.uom}
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
                  {trimQty(tally.qty)} {tally.uom}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tally.boxes} box{tally.boxes === 1 ? '' : 'es'}
                </div>
              </td>
              {hasManualColumn && (
                <td className="p-3 align-top text-muted-foreground">—</td>
              )}
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
