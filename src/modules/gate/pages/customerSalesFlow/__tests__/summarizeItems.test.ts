import { describe, expect, it } from 'vitest';

import type { SalesDispatchBoxScan, SalesDispatchItem } from '@/modules/gate/api';

import {
  getExpectedItemBoxes,
  getExpectedItemLoose,
  getExpectedItemsBoxes,
  getExpectedItemsLoose,
  isLooseItem,
} from '../salesDispatchBoxCounts';
import {
  formatScannedBoxQuantities,
  groupItemsByItemCode,
  summarizeItems,
} from '../salesDispatchScanSummary';

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
    total_loose: null,
    // OITM.SalFactor2 — the only pack size the box count is allowed to use.
    sal_factor2: '16',
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

  it('derives expected boxes from the combined quantity, not per-line splits', () => {
    // Per-line splits would be floor(1925/16) + floor(385/16) = 120 + 24 = 144 boxes with
    // 5 + 1 loose. Combined is the true figure: floor(2310/16) = 144 boxes + 6 loose.
    const grouped = groupItemsByItemCode(rawLines);
    expect(getExpectedItemsBoxes(grouped)).toBe(144);
    expect(getExpectedItemsLoose(grouped)).toBe(6);
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
    // 144 full boxes + a 6-piece remainder; the 145th scan is that part box.
    expect(summary.items[0].expectedBoxes).toBe(144);
    expect(summary.items[0].expectedLoose).toBe(6);
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


// The rule SAP's own bill prints: SalFactor2 = 1 means the item is not transacted in
// boxes, so it ships loose — except CSD stock, where one box IS the billed piece.
describe('SalFactor2 drives the box/loose split', () => {
  it('counts a loose SKU in pieces, not one box per piece', () => {
    // FG0000381: the invoice prints "0 Box  500.00 PCS".
    const loose = item({
      item_code: 'FG0000381',
      item_name: 'EXTRA VIRGIN OLIVE OIL 10ML',
      quantity: '500',
      sal_factor2: '1',
    });
    expect(getExpectedItemBoxes(loose)).toBe(0);
    expect(getExpectedItemLoose(loose)).toBe(500);
    expect(isLooseItem(loose)).toBe(true);
  });

  it('keeps CSD stock box-counted at one piece per box', () => {
    const csd = item({
      item_code: 'FG0000400',
      item_name: 'JIVO KACHI GHANI COLD PRESSED MUSTARD OIL 1 LTR 20 PCS(CSD)',
      quantity: '99',
      sal_factor2: '1',
    });
    expect(getExpectedItemBoxes(csd)).toBe(99);
    expect(getExpectedItemLoose(csd)).toBe(0);
    expect(isLooseItem(csd)).toBe(false);
  });

  it('ignores the "N PCS" token in the item name', () => {
    // The name says 20 PCS; SalFactor2 says the box is the billed piece. Dividing by the
    // name would under-count these boxes 20x.
    const csd = item({
      item_name: 'MUSTARD OIL 100 MLS 20 PCS(CSD)',
      quantity: '40',
      sal_factor2: '1',
    });
    expect(getExpectedItemBoxes(csd)).toBe(40);
  });

  it('prefers the split the backend stored over re-deriving it', () => {
    const stored = item({ quantity: '2310', sal_factor2: '16', total_boxes: '144', total_loose: '6' });
    expect(getExpectedItemBoxes(stored)).toBe(144);
    expect(getExpectedItemLoose(stored)).toBe(6);
  });

  it('treats an unconfigured item as loose rather than inventing boxes', () => {
    const unknown = item({ item_name: 'SOYABEAN OIL 12 KGS', quantity: '12', sal_factor2: null });
    expect(getExpectedItemBoxes(unknown)).toBe(0);
    expect(getExpectedItemLoose(unknown)).toBe(12);
  });
});


// A loose line's cartons are whatever the packers packed, so the operator needs to see
// what each scanned box carried — not just how many boxes.
describe('per-box quantities on a loose line', () => {
  const loose = item({
    item_code: 'FG0000381',
    item_name: 'EXTRA VIRGIN OLIVE OIL 10ML',
    quantity: '500',
    sal_factor2: '1',
  });

  it('records each scanned box quantity and completes on quantity, not box count', () => {
    const summary = summarizeItems(
      [loose],
      [
        scan({ item_code: 'FG0000381', quantity: '362' }),
        scan({ item_code: 'FG0000381', quantity: '138' }),
      ],
    );
    const row = summary.items[0];
    expect(row.expectedBoxes).toBe(0);
    expect(row.isLoose).toBe(true);
    expect(row.scanCount).toBe(2);
    expect(row.scannedBoxQuantities).toEqual([362, 138]);
    expect(row.scannedQuantity).toBe(500);
    expect(row.isComplete).toBe(true);
  });

  it('is still incomplete while the pieces are short, however many boxes were scanned', () => {
    const summary = summarizeItems(
      [loose],
      [scan({ item_code: 'FG0000381', quantity: '362' })],
    );
    expect(summary.items[0].isComplete).toBe(false);
    expect(summary.items[0].progressPercent).toBe(72);
  });

  it('formats the box quantities, truncating a long list', () => {
    expect(formatScannedBoxQuantities([362, 138])).toBe('362 + 138');
    expect(formatScannedBoxQuantities([132, 132, 132, 98, 6, 1])).toBe(
      '132 + 132 + 132 + 98 + 2 more',
    );
    expect(formatScannedBoxQuantities([])).toBe('');
  });
});


// A CSD bill counts BOXES: a line reading 4 means four cartons, even though each carton
// holds 20 bottles and its label declares qty = 20.
describe('CSD lines are measured in boxes, not the pieces each box declares', () => {
  const csd = item({
    item_code: 'FG0000154',
    item_name: 'MUSTARD OIL 100 MLS 20 PCS(CSD)',
    quantity: '4',
    sal_factor2: '1',
  });

  it('counts one carton as 1 against the invoice, whatever its label says', () => {
    const summary = summarizeItems([csd], [scan({ item_code: 'FG0000154', quantity: '20' })]);
    const row = summary.items[0];
    expect(row.isBoxCounted).toBe(true);
    expect(row.scannedQuantity).toBe(1); // one carton, not 20 pieces
    expect(row.expectedQuantity).toBe(4);
    expect(row.isComplete).toBe(false); // 1 of 4 cartons
    expect(row.progressPercent).toBe(25);
  });

  it('completes only once every carton is scanned', () => {
    const summary = summarizeItems(
      [csd],
      scans(4, { item_code: 'FG0000154', quantity: '20' }),
    );
    expect(summary.items[0].scannedQuantity).toBe(4);
    expect(summary.items[0].isComplete).toBe(true);
    // The physical pieces are still reported per box, since they are what shipped.
    expect(summary.items[0].scannedBoxQuantities).toEqual([20, 20, 20, 20]);
  });

  it('still counts a piece-billed item in pieces', () => {
    const boxed = item({ item_name: 'OIL 1 LTR 20 PCS', quantity: '40', sal_factor2: '20' });
    const summary = summarizeItems([boxed], scans(2, { quantity: '20' }));
    expect(summary.items[0].isBoxCounted).toBe(false);
    expect(summary.items[0].scannedQuantity).toBe(40);
    expect(summary.items[0].isComplete).toBe(true);
  });
});
