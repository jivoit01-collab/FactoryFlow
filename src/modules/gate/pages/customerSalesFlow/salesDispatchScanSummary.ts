import type { SalesDispatchBoxScan, SalesDispatchItem } from '@/modules/gate/api';

import {
  getExpectedItemBoxes,
  getExpectedItemLoose,
  isLooseItem,
  parsePositiveNumber,
} from './salesDispatchBoxCounts';

export interface ItemScanRow {
  key: string;
  lineNum: number;
  itemCode: string;
  itemName: string;
  expectedQuantity: number;
  uom: string;
  totalWeight: number;
  expectedBoxes: number;
  /** Invoiced pieces not in a full box — the whole line when the item ships loose. */
  expectedLoose: number;
  /** True when the item has no box count at all, so progress is measured in pieces. */
  isLoose: boolean;
  scanCount: number;
  scannedQuantity: number;
  /** Quantity carried by each scanned box, in scan order — e.g. [362, 138]. */
  scannedBoxQuantities: number[];
  progressPercent: number | null;
  isComplete: boolean;
}

export interface BillScanSummary {
  items: ItemScanRow[];
  unplannedScanCount: number;
}

export function normalizeItemCode(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

// Merge a bill's invoice lines that share an item code into one row. A scanned box carries
// only an item CODE (never a line number), and both the backend cap (remaining_invoiced_qty)
// and the completeness gate (has_unscanned_bill_lines) already treat each (bill, item_code)
// as a single unit — so a bill that invoices the same product on two lines (e.g. 1,925 + 385
// of FG0000005) was the only thing showing it as two rows. Collapsing them gives the operator
// one clean row per product, matches the backend's model exactly, and means a scan can never
// overshoot one line while another sits at 0. Quantities/weights are summed; the merged row
// keeps the first line's identity (line number, name, uom). Uncoded lines are left untouched.
export function groupItemsByItemCode(items: SalesDispatchItem[]): SalesDispatchItem[] {
  const order: string[] = [];
  const byKey = new Map<string, SalesDispatchItem>();
  items.forEach((item, index) => {
    const code = normalizeItemCode(item.item_code);
    // Keep uncoded lines separate (a blank code isn't a product identity to merge on).
    const key = code || `__uncoded_${index}`;
    const existing = byKey.get(key);
    if (!existing) {
      order.push(key);
      byKey.set(key, { ...item });
      return;
    }
    const mergedQuantity = parsePositiveNumber(existing.quantity) + parsePositiveNumber(item.quantity);
    existing.quantity = String(mergedQuantity);
    const mergedWeight =
      parsePositiveNumber(existing.total_weight) + parsePositiveNumber(item.total_weight);
    existing.total_weight = mergedWeight > 0 ? String(mergedWeight) : existing.total_weight;
    // Carry the stored box/loose split only when EVERY merged line has one — both halves
    // together, since a line can legitimately be all boxes or all loose. Otherwise clear
    // both so the combined quantity is re-split from sal_factor2 (getItemPacking), which
    // is the more accurate figure anyway: two part-boxes on separate lines make one box.
    const existingBoxes = parsePositiveNumber(existing.total_boxes);
    const existingLoose = parsePositiveNumber(existing.total_loose);
    const itemBoxes = parsePositiveNumber(item.total_boxes);
    const itemLoose = parsePositiveNumber(item.total_loose);
    const bothSplit = existingBoxes + existingLoose > 0 && itemBoxes + itemLoose > 0;
    existing.total_boxes = bothSplit ? String(existingBoxes + itemBoxes) : null;
    existing.total_loose = bothSplit ? String(existingLoose + itemLoose) : null;
  });
  return order.map((key) => byKey.get(key) as SalesDispatchItem);
}

// Tally a single bill's scans against its item lines. Lines are expected to be grouped by
// item code (see groupItemsByItemCode), so each scan maps to exactly one line; a scan whose
// code isn't on the bill is counted as "unplanned". Completion is per line (== per item code
// once grouped), matching the backend's per-(bill, item_code) gate.
export function summarizeItems(
  expectedItems: SalesDispatchItem[],
  scans: SalesDispatchBoxScan[],
): BillScanSummary {
  const indexByCode = new Map<string, number>();
  expectedItems.forEach((item, index) => {
    const code = normalizeItemCode(item.item_code);
    if (code && !indexByCode.has(code)) indexByCode.set(code, index);
  });

  const stats = expectedItems.map(() => ({ count: 0, quantity: 0, boxQuantities: [] as number[] }));
  let unplannedScanCount = 0;
  for (const scan of scans) {
    const code = normalizeItemCode(scan.item_code);
    const index = code ? indexByCode.get(code) : undefined;
    if (index === undefined) {
      unplannedScanCount += 1;
      continue;
    }
    const scanQuantity = parsePositiveNumber(scan.quantity);
    stats[index].count += 1;
    stats[index].quantity += scanQuantity;
    stats[index].boxQuantities.push(scanQuantity);
  }

  const items = expectedItems.map((item, index) => {
    const scanStats = stats[index];
    const expectedQuantity = parsePositiveNumber(item.quantity);
    const isComplete = expectedQuantity > 0 && scanStats.quantity >= expectedQuantity;
    const progressPercent =
      expectedQuantity > 0
        ? Math.min(100, Math.round((scanStats.quantity / expectedQuantity) * 100))
        : null;

    return {
      key: String(item.id || `${item.item_code}-${item.line_num}-${index}`),
      lineNum: Number(item.line_num ?? index),
      itemCode: item.item_code || '',
      itemName: item.item_name || '',
      expectedQuantity,
      uom: item.uom || '',
      totalWeight: parsePositiveNumber(item.total_weight),
      expectedBoxes: getExpectedItemBoxes(item),
      expectedLoose: getExpectedItemLoose(item),
      isLoose: isLooseItem(item),
      scanCount: scanStats.count,
      scannedQuantity: scanStats.quantity,
      scannedBoxQuantities: scanStats.boxQuantities,
      progressPercent,
      isComplete,
    };
  });

  return { items, unplannedScanCount };
}


/**
 * "362 + 138" — what each scanned box carried, in scan order.
 *
 * Boxes of a loose item are whatever the packers made (a 500-piece line can arrive as one
 * 362-piece carton and one 138-piece carton), so the box COUNT alone tells the operator
 * nothing about whether the goods are covered. Long lists are truncated to keep the row
 * readable: "132 + 132 + 132 + 2 more".
 */
export function formatScannedBoxQuantities(quantities: number[], maxShown = 4) {
  if (!quantities.length) return '';
  const shown = quantities.slice(0, maxShown).map((q) => q.toLocaleString('en-IN'));
  const hidden = quantities.length - shown.length;
  return hidden > 0 ? `${shown.join(' + ')} + ${hidden} more` : shown.join(' + ');
}
