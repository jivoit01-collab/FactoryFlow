import {
  matchesScanSearch,
  ScannedBoxesSheet,
  type ScannedBoxSheetRow,
  type ScanSheetFilter,
} from '@/shared/components/scanReview';
import { cn } from '@/shared/utils';

import type { BSTBoxScan, BSTReceiveStatus, BSTTransferDoc, BSTTransferItem } from '../../types';
import { expectedBstItemBoxes } from './bstBoxCounts';
import { formatBstDateTime } from './bstFormat';
import { formatBstNumber } from './bstScanSummary';

export type BstScanSheetFilter = ScanSheetFilter;

function normalizeCode(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

type ScanTone = 'complete' | 'partial' | 'none' | 'unknown';

// Same tone classes as the docking detail page's scan pill.
const SCAN_TONE_CLASSES: Record<ScanTone, string> = {
  complete: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  none: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  unknown: 'bg-muted text-muted-foreground',
};

function getScanTone(scanned: number, expected: number): ScanTone {
  if (expected <= 0) return scanned > 0 ? 'partial' : 'unknown';
  if (scanned >= expected) return 'complete';
  if (scanned > 0) return 'partial';
  return 'none';
}

/** "657 / 657 boxes" pill, colour-coded like the docking page's scan progress. */
export function BSTScanProgressPill({
  scanned,
  expected,
  className,
}: {
  scanned: number;
  expected: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        SCAN_TONE_CLASSES[getScanTone(scanned, expected)],
        className,
      )}
    >
      {formatBstNumber(scanned)}
      {expected > 0 ? ` / ${formatBstNumber(expected)}` : ''} box
      {scanned === 1 && expected <= 1 ? '' : 'es'}
    </span>
  );
}

export function ReceiveBadge({ status }: { status: BSTReceiveStatus }) {
  const cfg: Record<BSTReceiveStatus, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${cfg[status]}`}>
      {status}
    </span>
  );
}

/**
 * The BST flavour of the shared Scanned Boxes panel. BST scans carry no
 * SAP-document reference, so the Bill filter scopes by that document's item
 * codes: an item invoiced on two documents shows its boxes under both. The
 * Receive column is BST-only — the destination's accept/reject verdict per box.
 */
export function BSTScannedBoxesSheet({
  items,
  scans,
  docs,
  open,
  onOpenChange,
  filter,
  onFilterChange,
}: {
  items: BSTTransferItem[];
  scans: BSTBoxScan[];
  docs: BSTTransferDoc[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Owned by the page so an item row can open the sheet pre-filtered to itself. */
  filter: BstScanSheetFilter;
  onFilterChange: (filter: BstScanSheetFilter) => void;
}) {
  const scopedItems =
    filter.document !== 'ALL'
      ? items.filter((item) => item.sap_doc_num === filter.document)
      : items;
  const scopedCodes = new Set(scopedItems.map((item) => normalizeCode(item.item_code)));

  const scopedScans = scans.filter((scan) => {
    if (filter.document !== 'ALL' && !scopedCodes.has(normalizeCode(scan.item_code))) return false;
    if (filter.item !== 'ALL' && normalizeCode(scan.item_code) !== normalizeCode(filter.item)) {
      return false;
    }
    return matchesScanSearch(filter.query, [
      scan.box_barcode,
      scan.pallet_code,
      scan.item_code,
      scan.item_name,
      scan.batch_number,
      scan.scanned_by_name,
    ]);
  });

  // Expected stays governed by the dropdowns only — free text has no "expected" side.
  const expectedItems =
    filter.item !== 'ALL'
      ? scopedItems.filter((item) => normalizeCode(item.item_code) === normalizeCode(filter.item))
      : scopedItems;
  const expectedBoxes = expectedItems.reduce((n, item) => n + expectedBstItemBoxes(item), 0);
  const totalQty = scopedScans.reduce((n, scan) => n + (Number(scan.quantity) || 0), 0);
  // The destination's side: of the visible boxes, how many it has accepted/rejected.
  const acceptedCount = scopedScans.filter((s) => s.receive_status === 'ACCEPTED').length;
  const rejectedCount = scopedScans.filter((s) => s.receive_status === 'REJECTED').length;
  const uom = scopedScans[0]?.uom || expectedItems[0]?.uom || '';
  const lastScanAt = scans.reduce<string | null>(
    (latest, scan) => (!latest || scan.scanned_at > latest ? scan.scanned_at : latest),
    null,
  );

  const billOptions = docs
    .filter((doc) => doc.sap_doc_num)
    .map((doc) => ({
      value: doc.sap_doc_num,
      label: `${doc.sap_doc_num}${doc.invoice_no ? ` · ${doc.invoice_no}` : ''}`,
    }));
  const itemOptions = (() => {
    const seen = new Map<string, { code: string; name: string }>();
    const add = (code?: string | null, name?: string | null) => {
      const normalized = normalizeCode(code);
      if (normalized && !seen.has(normalized)) {
        seen.set(normalized, { code: code || '', name: name || '' });
      }
    };
    scopedItems.forEach((item) => add(item.item_code, item.item_name));
    // Off-bill scans carry codes on no bill line; without them a pre-filtered
    // off-bill item would render an empty Select.
    if (filter.document === 'ALL') scans.forEach((scan) => add(scan.item_code, scan.item_name));
    return Array.from(seen.values()).map((option) => ({
      value: option.code,
      label: `${option.code}${option.name ? ` · ${option.name}` : ''}`,
    }));
  })();

  const rows: ScannedBoxSheetRow[] = scopedScans.map((scan) => ({
    key: scan.id,
    barcode: scan.box_barcode || '—',
    item: scan.item_name || scan.item_code || '—',
    batch: scan.batch_number,
    quantity: [scan.quantity, scan.uom].filter(Boolean).join(' ') || '—',
    pallet: scan.pallet_code || '—',
    scannedAt: formatBstDateTime(scan.scanned_at),
    scannedBy: scan.scanned_by_name || '—',
    extra: (
      <>
        <ReceiveBadge status={scan.receive_status} />
        {scan.reject_reason ? (
          <span className="ml-1 text-xs text-muted-foreground">({scan.reject_reason})</span>
        ) : null}
      </>
    ),
  }));

  return (
    <ScannedBoxesSheet
      open={open}
      onOpenChange={onOpenChange}
      filter={filter}
      onFilterChange={onFilterChange}
      billOptions={billOptions}
      itemOptions={itemOptions}
      badge={<BSTScanProgressPill scanned={scopedScans.length} expected={expectedBoxes} />}
      stats={[
        { label: 'Scanned Boxes', value: formatBstNumber(scopedScans.length) },
        { label: 'Expected Boxes', value: formatBstNumber(expectedBoxes) },
        {
          label: 'Total Scanned Quantity',
          value: totalQty > 0 ? `${formatBstNumber(totalQty)} ${uom}`.trim() : '—',
        },
        {
          label: 'Received by destination',
          value: `${formatBstNumber(acceptedCount)} of ${formatBstNumber(scopedScans.length)}${
            rejectedCount > 0 ? ` · ${formatBstNumber(rejectedCount)} rejected` : ''
          }`,
        },
        { label: 'Last Scan', value: lastScanAt ? formatBstDateTime(lastScanAt) : '—' },
      ]}
      rows={rows}
      extraColumn="Receive"
    />
  );
}
