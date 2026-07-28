import type { SalesDispatchBoxScan, SalesDispatchItem } from '@/modules/gate/api';

import { getExpectedItemBoxes, parsePositiveNumber } from './salesDispatchBoxCounts';

export interface ItemScanRow {
  key: string;
  lineNum: number;
  itemCode: string;
  itemName: string;
  expectedQuantity: number;
  uom: string;
  totalWeight: number;
  expectedBoxes: number;
  scanCount: number;
  scannedQuantity: number;
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
    // Only carry a stored box total when every merged line has one; otherwise fall back to
    // the quantity/pack-size estimate (getExpectedItemBoxes) on the combined quantity.
    const existingBoxes = parsePositiveNumber(existing.total_boxes);
    const itemBoxes = parsePositiveNumber(item.total_boxes);
    existing.total_boxes = existingBoxes > 0 && itemBoxes > 0 ? String(existingBoxes + itemBoxes) : null;
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

  const stats = expectedItems.map(() => ({ count: 0, quantity: 0 }));
  let unplannedScanCount = 0;
  for (const scan of scans) {
    const code = normalizeItemCode(scan.item_code);
    const index = code ? indexByCode.get(code) : undefined;
    if (index === undefined) {
      unplannedScanCount += 1;
      continue;
    }
    stats[index].count += 1;
    stats[index].quantity += parsePositiveNumber(scan.quantity);
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
      scanCount: scanStats.count,
      scannedQuantity: scanStats.quantity,
      progressPercent,
      isComplete,
    };
  });

  return { items, unplannedScanCount };
}
