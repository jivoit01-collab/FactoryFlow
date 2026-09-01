import { Loader2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useState } from 'react';

import {
  type ScanItemCell,
  ScanItemsTable,
  type ScanItemsTableRow,
} from '@/shared/components/scanReview';
import { Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BSTBoxScan, BSTManualEntry, BSTTransferItem } from '../../types';
import { isPmItemCode } from './bstBoxCounts';
import { summarizeBstBill, trimBstQty } from './bstScanSummary';

/** Save a scan-exempt line's typed quantity; `null` clears it. Rejects surface as a throw. */
export type SaveManualQty = (itemCode: string, quantity: string | null) => Promise<unknown>;

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
  const saved = entry ? trimBstQty(Number(entry.quantity)) : '';
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
        <p className="text-xs text-muted-foreground">by {entry.entered_by_name || '—'}</p>
      ) : null}
    </div>
  );
}

/**
 * The transfer's combined SAP bill with live scanned progress per item, rendered
 * on the shared scan-review table so it reads exactly like the dispatch docking
 * review. The tallying (quantity-first completeness, PM exemption, box-count
 * fallback) lives in bstScanSummary. Shared by the BST scan, review, gate-out,
 * and detail screens.
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
  onOpenItem,
}: {
  items: BSTTransferItem[];
  scans: BSTBoxScan[];
  /** Typed quantities for the scan-exempt lines (from the transfer detail). */
  manualEntries?: BSTManualEntry[];
  /** Pass to make those quantities editable; omit for a read-only view. */
  onSaveManualQty?: SaveManualQty;
  /** Makes barcode-tracked rows clickable (e.g. open the scanned-boxes panel). */
  onOpenItem?: (itemCode: string) => void;
}) {
  const bill = summarizeBstBill(items, scans);

  // The typed-quantity column only earns its place when the bill has a scan-exempt
  // line — a pure finished-goods transfer keeps the table it always had. Entries are
  // keyed by the code normalized upper-case, the way the backend stores them.
  const manualByItem = new Map(manualEntries.map((e) => [e.item_code.trim().toUpperCase(), e]));
  const manualFor = (code: string) => manualByItem.get(code.trim().toUpperCase());
  const hasManualColumn = bill.lines.some((line) => isPmItemCode(line.itemCode));

  const manualCell = (itemCode: string, uom: string, requiresScan: boolean): ScanItemCell => ({
    primary: requiresScan ? (
      // Barcode-tracked: the scan is the record, nothing to type.
      <span className="font-normal text-muted-foreground">—</span>
    ) : onSaveManualQty ? (
      <ManualQtyCell
        itemCode={itemCode}
        entry={manualFor(itemCode)}
        uom={uom}
        onSave={onSaveManualQty}
      />
    ) : manualFor(itemCode) ? (
      <>
        <span className="tabular-nums">
          {trimBstQty(Number(manualFor(itemCode)!.quantity))} {uom}
        </span>
        <div className="text-xs font-normal text-muted-foreground">
          by {manualFor(itemCode)!.entered_by_name || '—'}
        </div>
      </>
    ) : (
      <span className="text-xs font-normal text-muted-foreground">Not entered</span>
    ),
  });

  const rows: ScanItemsTableRow[] = bill.lines.map((line) => ({
    key: line.itemCode,
    itemCode: line.itemCode,
    itemName: line.itemName,
    // PM rows keep their manual-entry input, so only barcode-tracked rows click through.
    onClick: onOpenItem && line.requiresScan ? () => onOpenItem(line.itemCode) : undefined,
    status: !line.requiresScan
      ? 'exempt'
      : line.over
        ? 'over'
        : line.complete
          ? 'complete'
          : line.hasScans
            ? 'partial'
            : 'open',
    statusLabel: !line.requiresScan
      ? undefined
      : line.over
        ? `Over +${trimBstQty(line.overBy)}`
        : line.complete
          ? 'Complete'
          : line.hasScans
            ? `Short ${trimBstQty(line.expectedQty - line.scannedQty)} ${line.uom}`
            : 'Open',
    cells: [
      {
        align: 'right',
        primary: `${trimBstQty(line.expectedQty)} ${line.uom}`,
        lines: [`${line.expectedBoxes} box${line.expectedBoxes === 1 ? '' : 'es'}`],
      },
      {
        primary: `${trimBstQty(line.scannedQty)} of ${trimBstQty(line.expectedQty)} ${line.uom}`,
        lines: [`${line.scannedBoxes} box${line.scannedBoxes === 1 ? '' : 'es'}`],
        progress:
          line.progressPercent !== null
            ? { percent: line.progressPercent, tone: line.over ? 'over' : 'ok' }
            : null,
      },
      ...(hasManualColumn ? [manualCell(line.itemCode, line.uom, line.requiresScan)] : []),
    ],
  }));

  // Items scanned that are NOT on the SAP bill (defensive — blocked on scan).
  const offBillRows: ScanItemsTableRow[] = bill.offBill.map((line) => ({
    key: `off-${line.itemCode}`,
    itemCode: line.itemCode,
    itemName: line.itemName || '—',
    onClick: onOpenItem ? () => onOpenItem(line.itemCode) : undefined,
    itemNote: <span className="text-red-600">Not on this transfer&apos;s bill</span>,
    status: 'offBill',
    cells: [
      { align: 'right', primary: <span className="font-normal text-muted-foreground">—</span> },
      {
        primary: `${trimBstQty(line.qty)} ${line.uom}`,
        lines: [`${line.boxes} box${line.boxes === 1 ? '' : 'es'}`],
      },
      ...(hasManualColumn
        ? [{ primary: <span className="font-normal text-muted-foreground">—</span> }]
        : []),
    ],
  }));

  return (
    <ScanItemsTable
      columns={[
        { header: 'To scan', align: 'right', className: 'w-[140px]' },
        { header: 'Scanned', className: 'w-[190px]' },
        ...(hasManualColumn
          ? [
              {
                header: (
                  <>
                    Sent (manual)
                    <div className="text-xs font-normal text-muted-foreground">
                      Packaging material
                    </div>
                  </>
                ),
                className: 'w-[160px]',
              },
            ]
          : []),
      ]}
      minWidthClassName={hasManualColumn ? 'min-w-[900px]' : 'min-w-[760px]'}
      rows={[...rows, ...offBillRows]}
      emptyMessage="No item lines on this transfer."
      footnote={
        bill.offBillBoxes > 0
          ? `${bill.offBillBoxes} scanned box${bill.offBillBoxes === 1 ? '' : 'es'} outside this transfer's bill.`
          : undefined
      }
    />
  );
}
