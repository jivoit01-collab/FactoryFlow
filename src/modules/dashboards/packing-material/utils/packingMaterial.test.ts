import { describe, expect, it } from 'vitest';

import {
  monthAnchor,
  monthRange,
  monthValue,
  shiftMonth,
  toIsoDate,
} from '../constants/packing-material.constants';
import type { PmStockItem, PmStockWarehouse, PmTopItem } from '../types';
import {
  barWidthPct,
  combineStockItems,
  filterStockItems,
  formatInrCompact,
  formatPct,
  formatQty,
  formatQtyCompact,
  shortWarehouseName,
  sortTopItems,
  sumStockItems,
} from './packingMaterial';

function topItem(overrides: Partial<PmTopItem> = {}): PmTopItem {
  return {
    rank: 1,
    item_code: 'PM0000121',
    item_name: 'PET BOTTLE 1 LTR 52 GMS POMACE',
    sub_group: 'PET BOTTLES',
    uom: 'PCS',
    unit_price: 8.8,
    qty: 603505,
    value: 5311025,
    share_pct: 8.8,
    ...overrides,
  };
}

function stockItem(overrides: Partial<PmStockItem> = {}): PmStockItem {
  return {
    item_code: 'PM0000121',
    item_name: 'PET BOTTLE 1 LTR 52 GMS POMACE',
    sub_group: 'PET BOTTLES',
    uom: 'PCS',
    unit_price: 8.8,
    stock_qty: 1000,
    stock_value: 8800,
    ...overrides,
  };
}

describe('formatQty', () => {
  it('appends the unit, because a bare number on this board is ambiguous', () => {
    // Tape is metres, caps are pieces, film is kilos.
    expect(formatQty(53723, 'MTR')).toBe('53,723 MTR');
    expect(formatQty(53723, 'PCS')).toBe('53,723 PCS');
  });

  it('keeps decimals on a sub-unit quantity', () => {
    // 0.05 kg of ink per bottle rounds to nothing otherwise.
    expect(formatQty(0.05, 'KGS')).toBe('0.05 KGS');
  });

  it('drops decimals once the figure is big enough not to need them', () => {
    expect(formatQty(603505.441)).toBe('6,03,505');
  });
});

describe('compact formatting', () => {
  it('speaks crore and lakh, which is what the factory speaks', () => {
    expect(formatInrCompact(34570445)).toBe('₹3.46 Cr');
    expect(formatInrCompact(814580)).toBe('₹8.15 L');
  });

  it('keeps a small figure in full rupees rather than 0.00 L', () => {
    expect(formatInrCompact(4500)).toBe('₹4,500');
  });

  it('preserves the sign, because a net-negative month is a real answer', () => {
    expect(formatInrCompact(-12500000)).toBe('-₹1.25 Cr');
  });

  it('compacts a piece count the same way', () => {
    // 11,774,803 pieces is a number nobody reads.
    expect(formatQtyCompact(11774803)).toBe('1.18 Cr');
    expect(formatQtyCompact(3050403)).toBe('30.50 L');
    expect(formatQtyCompact(842)).toBe('842');
  });
});

describe('formatPct', () => {
  it('dashes a missing figure rather than printing NaN%', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(undefined)).toBe('—');
    expect(formatPct(Number.NaN)).toBe('—');
  });

  it('prints one decimal by default', () => {
    expect(formatPct(59.77)).toBe('59.8%');
  });
});

describe('sortTopItems', () => {
  const items = [
    topItem({ rank: 1, item_code: 'A', qty: 600, value: 100 }),
    topItem({ rank: 2, item_code: 'B', qty: 500, value: 900 }),
    topItem({ rank: 3, item_code: 'C', qty: 400, value: 500 }),
  ];

  it('leaves the API ordering alone when read by quantity', () => {
    // The API already ranked on quantity; re-sorting would be a chance to
    // disagree with the rank numbers on the rows.
    expect(sortTopItems(items, 'qty')).toBe(items);
  });

  it('re-reads the same rows down the value column', () => {
    expect(sortTopItems(items, 'value').map((item) => item.item_code)).toEqual(['B', 'C', 'A']);
  });

  it('does not change which items are in the list', () => {
    // Sorting by value answers "of the ten biggest by volume, which cost the
    // most" -- not "the ten most expensive", which is a different request.
    const byValue = sortTopItems(items, 'value');
    expect(byValue).toHaveLength(items.length);
    expect(byValue.map((item) => item.item_code).sort()).toEqual(['A', 'B', 'C']);
  });

  it('keeps each row its earned rank, not its position in the table', () => {
    expect(sortTopItems(items, 'value').map((item) => item.rank)).toEqual([2, 3, 1]);
  });

  it('never mutates what it was given', () => {
    const original = [...items];
    sortTopItems(items, 'value');
    expect(items).toEqual(original);
  });

  it('breaks a value tie on item code so the order is stable', () => {
    // Labels come in matched front/back pairs at identical figures.
    const pair = [
      topItem({ item_code: 'PM0000020', qty: 10, value: 3 }),
      topItem({ item_code: 'PM0000019', qty: 10, value: 3 }),
    ];
    expect(sortTopItems(pair, 'value').map((item) => item.item_code)).toEqual([
      'PM0000019',
      'PM0000020',
    ]);
  });
});

describe('filterStockItems', () => {
  const items = [
    stockItem({
      item_code: 'PM0000019',
      item_name: 'LABEL 1 LTR BACK',
      sub_group: 'LABEL',
      stock_qty: 2500,
      stock_value: 750,
    }),
    stockItem({
      item_code: 'PM0000085',
      item_name: 'CAPS 1 OR 2 LTR',
      sub_group: 'CAPS',
      stock_qty: 4000,
      stock_value: 5160,
    }),
    stockItem({ item_code: 'PM0000121', stock_qty: 1000, stock_value: 8800 }),
  ];

  it('ranks by quantity by default', () => {
    expect(filterStockItems(items, '', 'qty').map((item) => item.item_code)).toEqual([
      'PM0000085',
      'PM0000019',
      'PM0000121',
    ]);
  });

  it('ranks by value when asked', () => {
    expect(filterStockItems(items, '', 'value').map((item) => item.item_code)).toEqual([
      'PM0000121',
      'PM0000085',
      'PM0000019',
    ]);
  });

  it('matches a code, a name or a family', () => {
    // A storekeeper searches "label", a buyer searches "PM0000019", and both
    // have to find the same row.
    expect(filterStockItems(items, 'label', 'qty')).toHaveLength(1);
    expect(filterStockItems(items, 'pm0000019', 'qty')).toHaveLength(1);
    expect(filterStockItems(items, 'CAPS', 'qty')).toHaveLength(1);
  });

  it('ignores case and surrounding space', () => {
    expect(filterStockItems(items, '  CaPs  ', 'qty')).toHaveLength(1);
  });

  it('returns nothing rather than everything when nothing matches', () => {
    expect(filterStockItems(items, 'shrink', 'qty')).toEqual([]);
  });

  it('never mutates what it was given', () => {
    const original = [...items];
    filterStockItems(items, '', 'value');
    expect(items).toEqual(original);
  });
});

describe('shortWarehouseName', () => {
  it('drops the site, which is on every Oil store and so distinguishes none', () => {
    expect(shortWarehouseName('Bhakharpur Production Consumption')).toBe('Production Consumption');
    expect(shortWarehouseName('Bhakharpur Basement')).toBe('Basement');
  });

  it('handles the other spelling SAP uses for the same site', () => {
    expect(shortWarehouseName('BHAKARPUR SIDEL')).toBe('SIDEL');
  });

  it('leaves a name that does not start with the site whole', () => {
    expect(shortWarehouseName('Gupta Godown Packaging Material')).toBe(
      'Gupta Godown Packaging Material',
    );
  });

  it('never strips a name down to nothing', () => {
    // A store called only "Bhakharpur" keeps its name rather than losing it.
    expect(shortWarehouseName('Bhakharpur')).toBe('Bhakharpur');
    expect(shortWarehouseName('')).toBe('');
  });
});

function warehouse(
  code: string,
  items: PmStockItem[],
  overrides: Partial<PmStockWarehouse> = {},
): PmStockWarehouse {
  return {
    code,
    name: code,
    inactive: false,
    exists: true,
    item_count: items.length,
    total_qty: items.reduce((sum, item) => sum + item.stock_qty, 0),
    total_value: items.reduce((sum, item) => sum + item.stock_value, 0),
    share_pct: 0,
    items,
    ...overrides,
  };
}

describe('combineStockItems', () => {
  // The case that prompted this: one pet bottle, spread over three stores.
  const bottle = (qty: number, value: number) =>
    stockItem({ item_code: 'PM0000121', stock_qty: qty, stock_value: value });

  const stores = [
    warehouse('BH-PC', [bottle(3, 26.4)]),
    warehouse('BH-BS', [bottle(5, 44)]),
    warehouse('BH-PM', [bottle(2, 17.6)]),
  ];

  it('adds the quantities up: 3 + 5 + 2 is ten bottles', () => {
    const combined = combineStockItems(stores);
    expect(combined).toHaveLength(1);
    expect(combined[0].stock_qty).toBe(10);
  });

  it('is one item, not three', () => {
    // Which is exactly what the Total card's distinct item count says.
    expect(combineStockItems(stores)).toHaveLength(1);
  });

  it('adds the value up as SAP valued it per store', () => {
    // Never recomputed from a unit price: a store's own moving average can
    // differ from another's for the same item.
    expect(combineStockItems(stores)[0].stock_value).toBeCloseTo(88, 6);
  });

  it('keeps the split, so the ten can be traced back to where the ten are', () => {
    expect(combineStockItems(stores)[0].splits).toEqual([
      { code: 'BH-PC', stock_qty: 3, stock_value: 26.4 },
      { code: 'BH-BS', stock_qty: 5, stock_value: 44 },
      { code: 'BH-PM', stock_qty: 2, stock_value: 17.6 },
    ]);
  });

  it('keeps the split in card order, whichever store holds the most', () => {
    const [row] = combineStockItems(stores);
    expect(row.splits.map((split) => split.code)).toEqual(['BH-PC', 'BH-BS', 'BH-PM']);
  });

  it('lists only the stores actually holding some', () => {
    // A row padded with zeroes for stores that hold none is noise.
    const combined = combineStockItems([
      warehouse('BH-PC', [bottle(3, 26.4)]),
      warehouse('BH-BS', []),
      warehouse('BH-PM', [bottle(2, 17.6)]),
    ]);
    expect(combined[0].splits.map((split) => split.code)).toEqual(['BH-PC', 'BH-PM']);
  });

  it('sums to the same figure the Total card shows', () => {
    // The two must never disagree about what "total" means.
    const combined = combineStockItems(stores);
    const cardTotal = stores.reduce((sum, store) => sum + store.total_qty, 0);
    expect(sumStockItems(combined).qty).toBe(cardTotal);
  });

  it('ranks the combined rows by quantity', () => {
    const combined = combineStockItems([
      warehouse('BH-PC', [
        stockItem({ item_code: 'PM0000019', stock_qty: 100, stock_value: 30 }),
        bottle(3, 26.4),
      ]),
      warehouse('BH-BS', [bottle(5, 44)]),
    ]);
    expect(combined.map((item) => item.item_code)).toEqual(['PM0000019', 'PM0000121']);
  });

  it('carries the unit and family through from the item master', () => {
    expect(combineStockItems(stores)[0]).toMatchObject({
      uom: 'PCS',
      sub_group: 'PET BOTTLES',
      item_name: 'PET BOTTLE 1 LTR 52 GMS POMACE',
    });
  });

  it('never mutates the warehouse rows it was given', () => {
    const before = JSON.stringify(stores);
    combineStockItems(stores);
    expect(JSON.stringify(stores)).toBe(before);
  });

  it('is empty for stores holding nothing, rather than a row of zeroes', () => {
    expect(combineStockItems([warehouse('BH-PC', []), warehouse('BH-BS', [])])).toEqual([]);
  });
});

describe('sumStockItems', () => {
  it('foots what is on screen, so a search cannot show three rows over a total for three hundred', () => {
    const totals = sumStockItems([
      stockItem({ stock_qty: 1000, stock_value: 8800 }),
      stockItem({ item_code: 'PM0000085', stock_qty: 4000, stock_value: 5160 }),
    ]);
    expect(totals).toEqual({ qty: 5000, value: 13960 });
  });

  it('is zero for an empty list rather than undefined', () => {
    expect(sumStockItems([])).toEqual({ qty: 0, value: 0 });
  });
});

describe('barWidthPct', () => {
  it('scales to the leading row, not to the period', () => {
    // With a top item on 8% of the month, bars drawn against the period total
    // would every one of them be a stub.
    expect(barWidthPct(50, 100)).toBe(50);
    expect(barWidthPct(100, 100)).toBe(100);
  });

  it('does not divide by a leader of zero', () => {
    expect(barWidthPct(0, 0)).toBe(0);
  });

  it('clamps, so a negative row draws nothing instead of inverting the bar', () => {
    expect(barWidthPct(-40, 100)).toBe(0);
    expect(barWidthPct(140, 100)).toBe(100);
  });
});

describe('the month', () => {
  it('runs first to last day of the month a date falls in', () => {
    expect(monthRange(new Date(Date.UTC(2026, 8, 9)))).toEqual({
      date_from: '2026-09-01',
      date_to: '2026-09-30',
    });
  });

  it('gets February right, leap year included', () => {
    expect(monthRange(new Date(Date.UTC(2028, 1, 15))).date_to).toBe('2028-02-29');
    expect(monthRange(new Date(Date.UTC(2026, 1, 15))).date_to).toBe('2026-02-28');
  });

  it('steps back off day 1, so a 31-day month cannot skip February', () => {
    // From 31 March, a naive month subtraction lands on 31 February and rolls
    // into March again.
    const march = new Date(Date.UTC(2026, 2, 31));
    expect(monthRange(shiftMonth(march, -1))).toEqual({
      date_from: '2026-02-01',
      date_to: '2026-02-28',
    });
  });

  it('crosses a year boundary in both directions', () => {
    expect(monthValue(shiftMonth(new Date(Date.UTC(2026, 0, 1)), -1))).toBe('2025-12');
    expect(monthValue(shiftMonth(new Date(Date.UTC(2026, 11, 1)), 1))).toBe('2027-01');
  });

  it('round-trips through the value the month input speaks', () => {
    const anchor = new Date(Date.UTC(2026, 8, 1));
    expect(monthAnchor(monthValue(anchor)).getTime()).toBe(anchor.getTime());
    expect(monthValue(anchor)).toBe('2026-09');
  });

  it('builds the range in UTC, so a local offset cannot shift the month', () => {
    // A local-time month boundary can hand the API the 31st of the month
    // before, which reports the wrong month rather than failing.
    expect(toIsoDate(monthAnchor('2026-09'))).toBe('2026-09-01');
  });
});
