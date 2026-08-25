import { describe, expect, it } from 'vitest';

import type { SalesDispatchBoxScan, SalesDispatchItem } from '@/modules/gate/api';

import {
  getExpectedItemBoxes,
  getExpectedItemLoose,
  getExpectedItemsBoxes,
  getExpectedItemsLoose,
  isFullBox,
  isLooseItem,
} from '../salesDispatchBoxCounts';
import {
  formatLooseScanNote,
  formatScannedBoxQuantities,
  getScanTargetPacking,
  groupItemsByItemCode,
  mergeScanProgress,
  summarizeItems,
  summarizeScanProgress,
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


// Bill 608260260 (1,860 PCS of a 16-PCS item) prints 116 boxes + 4 loose. The 4 arrive in
// a part box; counting that box as a full one read "116 / 116 boxes" with 16 PCS unshipped.
describe('a part box covers the printed loose remainder, not a box slot', () => {
  const line = item({ item_code: 'FG0000142', quantity: '1860', sal_factor2: '16' });

  it('splits the line into boxes plus a loose remainder', () => {
    expect(getExpectedItemBoxes(line)).toBe(116);
    expect(getExpectedItemLoose(line)).toBe(4);
  });

  it('knows a short box from a full one', () => {
    expect(isFullBox(line, 16)).toBe(true);
    expect(isFullBox(line, 4)).toBe(false);
    // No pack size (loose) or CSD stock: every box of theirs is whole.
    expect(isFullBox(item({ sal_factor2: '1', item_name: 'OLIVE OIL 10ML' }), 4)).toBe(true);
    expect(isFullBox(item({ sal_factor2: '1', item_name: 'MUSTARD 20 PCS(CSD)' }), 1)).toBe(true);
  });

  it('counts 115 full boxes + one 4-piece box as 115 boxes and 4 loose pieces', () => {
    const summary = summarizeItems([line], [
      ...scans(115, { item_code: 'FG0000142', quantity: '16' }),
      scan({ item_code: 'FG0000142', quantity: '4' }),
    ]);
    const row = summary.items[0];
    expect(row.scanCount).toBe(116); // physical boxes on the truck
    expect(row.fullBoxCount).toBe(115); // ...but only 115 full boxes
    expect(row.looseBoxCount).toBe(1);
    expect(row.loosePieces).toBe(4);
    expect(row.scannedQuantity).toBe(1844);
    expect(row.isComplete).toBe(false); // 16 PCS still to load
  });

  it('completes once the missing full box is scanned too', () => {
    const summary = summarizeItems([line], [
      ...scans(116, { item_code: 'FG0000142', quantity: '16' }),
      scan({ item_code: 'FG0000142', quantity: '4' }),
    ]);
    const row = summary.items[0];
    expect(row.fullBoxCount).toBe(116);
    expect(row.looseBoxCount).toBe(1);
    expect(row.scannedQuantity).toBe(1860);
    expect(row.isComplete).toBe(true);
  });
});

// Docking 1244 (HR67C4904, gatepass DCK/JIVO_OIL/2026-27/000290) read "376 / 375 boxes"
// on the detail screen while every bill showed its quantity fully scanned. Bill 626080466
// invoices FG0000005 on two lines, 100 + 80 pcs of a 16-PCS item = 11 boxes + 4 loose, and
// those 4 pieces rode out in a 12th carton with its own barcode.
describe('summarizeScanProgress — the extra label is the printed loose remainder', () => {
  const lines = [
    item({ id: 1, line_num: 0, quantity: '100', total_boxes: '6', total_loose: '4' }),
    item({ id: 2, line_num: 1, quantity: '80', total_boxes: '5', total_loose: '0' }),
  ];
  const loadScans = [...scans(11, { quantity: '16' }), scan({ quantity: '4' })];

  it('counts 12 labels as 11 full boxes + 1 part box', () => {
    const progress = summarizeScanProgress(lines, loadScans);
    expect(progress.scanCount).toBe(12); // labels physically scanned
    expect(progress.fullBoxes).toBe(11); // ...against 11 printed boxes
    expect(progress.looseBoxes).toBe(1);
    expect(progress.loosePieces).toBe(4);
    expect(progress.unplannedScanCount).toBe(0);
  });

  it('names both halves of the printed load so the box count reads as complete', () => {
    const progress = summarizeScanProgress(lines, loadScans);
    expect(formatLooseScanNote(progress, 4)).toBe('+ 4 / 4 pcs loose (in 1 box)');
  });

  it('flags the loose pieces as still on the floor when no part box is scanned', () => {
    const progress = summarizeScanProgress(lines, scans(11, { quantity: '16' }));
    expect(progress.fullBoxes).toBe(11);
    expect(progress.looseBoxes).toBe(0);
    expect(formatLooseScanNote(progress, 4)).toBe('+ 0 / 4 pcs loose');
  });

  it('says nothing about loose goods for a bill that prints none', () => {
    const boxedOnly = [item({ id: 3, quantity: '1200', sal_factor2: '12' })];
    const progress = summarizeScanProgress(boxedOnly, scans(100, { quantity: '12' }));
    expect(progress.fullBoxes).toBe(100);
    expect(formatLooseScanNote(progress, 0)).toBe('');
  });

  it('keeps a box matched to no line visible as a box', () => {
    const progress = summarizeScanProgress(lines, [
      ...scans(11, { quantity: '16' }),
      scan({ item_code: 'FG9999999', quantity: '16' }),
    ]);
    expect(progress.fullBoxes).toBe(12);
    expect(progress.unplannedScanCount).toBe(1);
  });

  // The whole truck, exactly as production held it: 376 labels scanned, 5,060 of 5,060
  // pieces loaded, and three bills printing 375 boxes + 4 loose between them.
  it('reads the whole load as complete instead of one box over', () => {
    const bills = [
      {
        // 626080466 — 146 boxes + 4 loose
        lines: [
          item({ id: 11, item_code: 'FG0000004', quantity: '100', sal_factor2: '4' }),
          item({ id: 12, item_code: 'FG0000005', quantity: '100', sal_factor2: '16' }),
          item({ id: 13, item_code: 'FG0000005', quantity: '80', sal_factor2: '16' }),
          item({ id: 14, item_code: 'FG0000009', quantity: '20', sal_factor2: '4' }),
          item({ id: 15, item_code: 'FG0000032', quantity: '100', sal_factor2: '20' }),
          item({ id: 16, item_code: 'FG0000142', quantity: '1280', sal_factor2: '16' }),
          item({ id: 17, item_code: 'FG0000143', quantity: '80', sal_factor2: '4' }),
        ],
        scans: [
          ...scans(25, { item_code: 'FG0000004', quantity: '4' }),
          ...scans(11, { item_code: 'FG0000005', quantity: '16' }),
          scan({ item_code: 'FG0000005', quantity: '4' }), // the 4 printed loose pieces
          ...scans(5, { item_code: 'FG0000009', quantity: '4' }),
          ...scans(5, { item_code: 'FG0000032', quantity: '20' }),
          ...scans(80, { item_code: 'FG0000142', quantity: '16' }),
          ...scans(20, { item_code: 'FG0000143', quantity: '4' }),
        ],
      },
      {
        // 626080468 — 100 boxes
        lines: [item({ id: 18, item_code: 'FG0000299', quantity: '1200', sal_factor2: '12' })],
        scans: scans(100, { item_code: 'FG0000299', quantity: '12' }),
      },
      {
        // 626080476 — 129 boxes
        lines: [
          item({ id: 19, item_code: 'FG0000053', quantity: '120', sal_factor2: '4' }),
          item({ id: 20, item_code: 'FG0000081', quantity: '1980', sal_factor2: '20' }),
        ],
        scans: [
          ...scans(30, { item_code: 'FG0000053', quantity: '4' }),
          ...scans(99, { item_code: 'FG0000081', quantity: '20' }),
        ],
      },
    ];

    const expectedBoxes = bills.reduce(
      (total, bill) => total + getExpectedItemsBoxes(groupItemsByItemCode(bill.lines)),
      0,
    );
    const expectedLoose = bills.reduce(
      (total, bill) => total + getExpectedItemsLoose(groupItemsByItemCode(bill.lines)),
      0,
    );
    const load = mergeScanProgress(
      bills.map((bill) => summarizeScanProgress(bill.lines, bill.scans)),
    );

    expect(expectedBoxes).toBe(375);
    expect(expectedLoose).toBe(4);
    expect(load.scanCount).toBe(376); // labels the loader actually scanned
    expect(load.fullBoxes).toBe(375); // ...against 375 printed boxes: complete
    expect(load.looseBoxes).toBe(1);
    expect(load.unplannedScanCount).toBe(0);
    expect(formatLooseScanNote(load, expectedLoose)).toBe('+ 4 / 4 pcs loose (in 1 box)');
  });
});

// Docking 1250 (HR67D9270, DOCK-20260824-0018) read "452 / 435 boxes" with the printed
// loose remainder looking 52 pieces short. Two causes, both in the expected figures:
//  - bill 626080435 invoices FG0000142 as 1600 + 13 + 67 pcs of a 16-PCS item. Split per
//    line that prints 104 boxes + 16 loose; the 13 + 3 leftover pieces are one more WHOLE
//    box, so the floor packs 105.
//  - bill 626080439 invoices 16 pcs of MUSTARD KACHI GHANI 15 KGS (SalFactor2 = 1, not
//    CSD). The bill prints "0 Box / 16 PCS"; the goods ship as 16 labelled tins.
describe('the box count matches what the floor packs', () => {
  it('re-splits a product invoiced on several lines as one quantity', () => {
    const lines = [
      item({ id: 1, item_code: 'FG0000142', quantity: '1600', total_boxes: '100', total_loose: '0' }),
      item({ id: 2, item_code: 'FG0000142', quantity: '13', total_boxes: '0', total_loose: '13' }),
      item({ id: 3, item_code: 'FG0000142', quantity: '67', total_boxes: '4', total_loose: '3' }),
    ];
    // Summing the printed splits gives 104 boxes + 16 loose. The goods are 105 whole boxes.
    const target = getScanTargetPacking(lines);
    expect(target.boxes).toBe(105);
    expect(target.loose).toBe(0);

    const progress = summarizeScanProgress(lines, scans(105, { item_code: 'FG0000142', quantity: '16' }));
    expect(progress.fullBoxes).toBe(105);
    expect(progress.looseBoxes).toBe(0);
    expect(formatLooseScanNote(progress, target.loose)).toBe('');
  });

  it('counts the tins of an unboxed item as loose pieces, not boxes', () => {
    const tins = [
      item({
        id: 4,
        item_code: 'FG0000178',
        item_name: 'MUSTARD KACHI GHANI 15 KGS',
        quantity: '16',
        sal_factor2: '1',
      }),
    ];
    const target = getScanTargetPacking(tins);
    expect(target.boxes).toBe(0);
    expect(target.loose).toBe(16);

    const progress = summarizeScanProgress(
      tins,
      scans(16, { item_code: 'FG0000178', quantity: '1' }),
    );
    expect(progress.scanCount).toBe(16); // 16 labels on the truck
    expect(progress.fullBoxes).toBe(0); // ...against a bill printing 0 boxes
    expect(progress.looseBoxes).toBe(16);
    expect(progress.loosePieces).toBe(16);
    expect(formatLooseScanNote(progress, target.loose)).toBe('+ 16 / 16 pcs loose (in 16 boxes)');
  });

  // The whole truck as production held it: 453 labels, 6,516 of 6,536 pcs loaded.
  it('reads the load as boxes-complete while naming the 20 pieces still missing', () => {
    const bills = [
      {
        // 626080435 — prints 174 boxes + 16 loose; packs 175 whole boxes
        lines: [
          item({ id: 11, item_code: 'FG0000081', quantity: '1000', sal_factor2: '20' }),
          item({ id: 12, item_code: 'FG0000142', quantity: '1600', total_boxes: '100', total_loose: '0' }),
          item({ id: 13, item_code: 'FG0000142', quantity: '13', total_boxes: '0', total_loose: '13' }),
          item({ id: 14, item_code: 'FG0000142', quantity: '67', total_boxes: '4', total_loose: '3' }),
          item({ id: 15, item_code: 'FG0000143', quantity: '80', sal_factor2: '4' }),
        ],
        scans: [
          ...scans(50, { item_code: 'FG0000081', quantity: '20' }),
          ...scans(105, { item_code: 'FG0000142', quantity: '16' }),
          ...scans(20, { item_code: 'FG0000143', quantity: '4' }),
        ],
      },
      {
        // 626080439 — 16 unboxed tins
        lines: [
          item({
            id: 16,
            item_code: 'FG0000178',
            item_name: 'MUSTARD KACHI GHANI 15 KGS',
            quantity: '16',
            sal_factor2: '1',
          }),
        ],
        scans: scans(16, { item_code: 'FG0000178', quantity: '1' }),
      },
      {
        // 626080443 — 125 boxes
        lines: [
          item({ id: 17, item_code: 'FG0000142', quantity: '1920', total_boxes: '120', total_loose: '0' }),
          item({ id: 18, item_code: 'FG0000142', quantity: '80', total_boxes: '5', total_loose: '0' }),
        ],
        scans: scans(125, { item_code: 'FG0000142', quantity: '16' }),
      },
      {
        // 626080453 — 76 boxes + 14 loose; only 4 of those pieces were scanned
        lines: [
          item({ id: 19, item_code: 'FG0000081', quantity: '400', sal_factor2: '20' }),
          item({ id: 20, item_code: 'FG0000142', quantity: '480', total_boxes: '30', total_loose: '0' }),
          item({ id: 21, item_code: 'FG0000142', quantity: '20', total_boxes: '1', total_loose: '4' }),
          item({ id: 22, item_code: 'FG0000227', quantity: '240', sal_factor2: '16' }),
          item({ id: 23, item_code: 'FG0000306', quantity: '10', sal_factor2: '20' }),
          item({ id: 24, item_code: 'FG0000306', quantity: '200', sal_factor2: '20' }),
        ],
        scans: [
          ...scans(20, { item_code: 'FG0000081', quantity: '20' }),
          ...scans(31, { item_code: 'FG0000142', quantity: '16' }),
          scan({ item_code: 'FG0000142', quantity: '4' }),
          ...scans(15, { item_code: 'FG0000227', quantity: '16' }),
          ...scans(10, { item_code: 'FG0000306', quantity: '20' }),
        ],
      },
      {
        // 626080454 — 10 boxes + 10 loose; the 10 loose pieces never came
        lines: [
          item({ id: 25, item_code: 'FG0000306', quantity: '200', sal_factor2: '20' }),
          item({ id: 26, item_code: 'FG0000306', quantity: '10', sal_factor2: '20' }),
        ],
        scans: scans(10, { item_code: 'FG0000306', quantity: '20' }),
      },
      {
        // 626080455 — 50 boxes
        lines: [item({ id: 27, item_code: 'FG0000012', quantity: '200', sal_factor2: '4' })],
        scans: scans(50, { item_code: 'FG0000012', quantity: '4' }),
      },
    ];

    const targets = bills.map((bill) => getScanTargetPacking(bill.lines));
    const expectedBoxes = targets.reduce((total, target) => total + target.boxes, 0);
    const expectedLoose = targets.reduce((total, target) => total + target.loose, 0);
    const load = mergeScanProgress(
      bills.map((bill) => summarizeScanProgress(bill.lines, bill.scans)),
    );

    expect(expectedBoxes).toBe(436); // not the printed 435
    expect(expectedLoose).toBe(40); // not the printed 56: 16 of them are whole boxes now
    expect(load.scanCount).toBe(453); // labels the loader actually scanned
    expect(load.fullBoxes).toBe(436); // every box the load can hold: complete
    expect(load.looseBoxes).toBe(17);
    expect(load.loosePieces).toBe(20);
    // The two unscanned 10-piece remainders of FG0000306 — the only real shortfall.
    expect(expectedLoose - load.loosePieces).toBe(20);
    expect(formatLooseScanNote(load, expectedLoose)).toBe('+ 20 / 40 pcs loose (in 17 boxes)');
  });
});

describe('getScanTargetPacking keys on (bill, item)', () => {
  it('never merges two bills into a box neither of them packs', () => {
    // 8 pcs of a 16-PCS item on each of two bills: each ships its own part box. Merging
    // the quantities would claim one whole box and no loose pieces at all.
    const target = getScanTargetPacking([
      item({ id: 1, document: 100, item_code: 'FG0000142', quantity: '8' }),
      item({ id: 2, document: 200, item_code: 'FG0000142', quantity: '8' }),
    ]);
    expect(target.boxes).toBe(0);
    expect(target.loose).toBe(16);
  });

  it('still merges lines of one product within a single bill', () => {
    const target = getScanTargetPacking([
      item({ id: 1, document: 100, item_code: 'FG0000142', quantity: '8' }),
      item({ id: 2, document: 100, item_code: 'FG0000142', quantity: '8' }),
    ]);
    expect(target.boxes).toBe(1);
    expect(target.loose).toBe(0);
  });
});
