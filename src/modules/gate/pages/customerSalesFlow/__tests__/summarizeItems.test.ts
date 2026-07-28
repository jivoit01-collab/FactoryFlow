import { describe, expect, it } from 'vitest';

import type { SalesDispatchBoxScan, SalesDispatchItem } from '@/modules/gate/api';

import { getExpectedItemsBoxes } from '../salesDispatchBoxCounts';
import { groupItemsByItemCode, summarizeItems } from '../salesDispatchScanSummary';

function item(overrides: Partial<SalesDispatchItem>): SalesDispatchItem {
  return {
    id: 1,
    document: 100,
    item_code: 'FG0000005',
    item_name: 'EXTRA LIGHT OLIVE 1 LTR 16 PCS',
    quantity: '0',
    uom: 'PCS',
    line_num: 0,
    total_boxes: null,
    total_weight: null,
    ...overrides,
  } as unknown as SalesDispatchItem;
}

let seq = 0;
// Each scanned box carries only a document + item code + per-box quantity — never a line
// number — exactly like a real barcode box scan.
function scan(overrides: Partial<SalesDispatchBoxScan>): SalesDispatchBoxScan {
  seq += 1;
  return {
    id: seq,
    document: 100,
    item_code: 'FG0000005',
    item_name: 'EXTRA LIGHT OLIVE 1 LTR 16 PCS',
    quantity: '16',
    box_barcode: `BOX-${seq}`,
    barcode_raw: `BOX-${seq}`,
    ...overrides,
  } as unknown as SalesDispatchBoxScan;
}

function scans(count: number, overrides: Partial<SalesDispatchBoxScan> = {}) {
  return Array.from({ length: count }, () => scan(overrides));
}

describe('groupItemsByItemCode — same product on two invoice lines', () => {
  const rawLines = [
    item({ id: 1, line_num: 0, quantity: '1925', total_weight: '1925' }), // Line 1
    item({ id: 2, line_num: 1, quantity: '385', total_weight: '385' }), // Line 2
  ];

  it('collapses duplicate item codes into one row with summed quantity/weight', () => {
    const grouped = groupItemsByItemCode(rawLines);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].item_code).toBe('FG0000005');
    expect(grouped[0].quantity).toBe('2310');
    expect(grouped[0].total_weight).toBe('2310');
    // Keeps the first line's identity.
    expect(grouped[0].line_num).toBe(0);
  });

  it('derives expected boxes from the combined quantity, not per-line ceilings', () => {
    // Per-line ceilings would be ceil(1925/16) + ceil(385/16) = 121 + 25 = 146.
    // Combined is the true figure: ceil(2310/16) = 145.
    expect(getExpectedItemsBoxes(groupItemsByItemCode(rawLines))).toBe(145);
  });

  it('keeps distinct item codes as separate rows in original order', () => {
    const grouped = groupItemsByItemCode([
      item({ id: 1, line_num: 0, item_code: 'FG0000150', quantity: '400' }),
      item({ id: 2, line_num: 1, item_code: 'FG0000151', quantity: '120' }),
      item({ id: 3, line_num: 2, item_code: 'FG0000150', quantity: '80' }), // merges into row 0
    ]);
    expect(grouped.map((g) => g.item_code)).toEqual(['FG0000150', 'FG0000151']);
    expect(grouped[0].quantity).toBe('480');
  });
});

describe('summarizeItems on grouped lines', () => {
  const grouped = groupItemsByItemCode([
    item({ id: 1, line_num: 0, quantity: '1925' }),
    item({ id: 2, line_num: 1, quantity: '385' }),
  ]);

  it('tallies every scan of the product against its single row — no overshoot to a 2nd line', () => {
    // 145 boxes × 16 = 2,320 PCS ≥ 2,310 combined invoiced.
    const summary = summarizeItems(grouped, scans(145));
    expect(summary.items).toHaveLength(1);
    expect(summary.items[0].scanCount).toBe(145);
    expect(summary.items[0].expectedBoxes).toBe(145);
    expect(summary.items[0].isComplete).toBe(true);
    expect(summary.items[0].progressPercent).toBe(100);
    expect(summary.unplannedScanCount).toBe(0);
  });

  it('stays Partial while the product is genuinely short', () => {
    const summary = summarizeItems(grouped, scans(100)); // 1,600 < 2,310
    expect(summary.items[0].isComplete).toBe(false);
    expect(summary.items[0].scanCount).toBe(100);
  });

  it('flags a scanned code that is not invoiced on the bill', () => {
    const summary = summarizeItems(grouped, scans(2, { item_code: 'FG9999999' }));
    expect(summary.items[0].scanCount).toBe(0);
    expect(summary.unplannedScanCount).toBe(2);
  });
});
