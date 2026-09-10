import { describe, expect, it } from 'vitest';

import type { NonMovingItem } from '../types';
import { groupNonMovingRowsBySku } from './nonMovingGrouping';
import {
  filterNonMovingItems,
  filterRowsByStatus,
  pageOf,
  sortNonMovingRows,
  statusTotals,
  totalPagesOf,
  warehouseRowsForItem,
} from './nonMovingRows';

function makeItem(overrides: Partial<NonMovingItem>): NonMovingItem {
  return {
    branch: 'OIL',
    item_code: 'PM0000817',
    item_name: 'PREFORM 21/23 GMS',
    item_group_name: 'PACKAGING MATERIAL',
    sub_group: 'PREFORM',
    warehouse: 'BH-BS',
    quantity: 10,
    value: 100,
    last_movement_date: null,
    days_since_last_movement: 187,
    consumption_ratio: 0,
    ...overrides,
  };
}

describe('filterNonMovingItems', () => {
  const items = [
    makeItem({ item_code: 'A', warehouse: 'BH-BS', days_since_last_movement: 10 }),
    makeItem({ item_code: 'B', warehouse: 'BH-PM', days_since_last_movement: 60 }),
    makeItem({ item_code: 'C', warehouse: 'GP-RM', sub_group: 'CAP', days_since_last_movement: 90 }),
  ];

  it('keeps only stock idle longer than the age filter', () => {
    const kept = filterNonMovingItems(items, { age: 45 }).map((i) => i.item_code);
    expect(kept).toEqual(['B', 'C']);
  });

  it('keeps everything when the age filter is off', () => {
    expect(filterNonMovingItems(items, { age: 0 })).toHaveLength(3);
  });

  it('narrows to the selected warehouses and sub groups', () => {
    expect(filterNonMovingItems(items, { warehouse: ['BH-PM'] })).toHaveLength(1);
    expect(filterNonMovingItems(items, { sub_group: ['CAP'] })[0].item_code).toBe('C');
  });

  it('searches code, name and warehouse', () => {
    expect(filterNonMovingItems(items, { search: 'bh-pm' })[0].item_code).toBe('B');
    expect(filterNonMovingItems(items, { search: 'preform' })).toHaveLength(3);
  });
});

describe('filterRowsByStatus', () => {
  const rows = groupNonMovingRowsBySku([
    makeItem({ item_code: 'A', days_since_last_movement: 5 }),
    makeItem({ item_code: 'B', days_since_last_movement: 35 }),
    makeItem({ item_code: 'C', days_since_last_movement: 200 }),
  ]);

  it('keeps the rows whose movement status was asked for', () => {
    expect(filterRowsByStatus(rows, ['non-moving']).map((r) => r.item_code)).toEqual(['C']);
    expect(filterRowsByStatus(rows, ['slow-moving', 'non-moving']).map((r) => r.item_code)).toEqual([
      'B',
      'C',
    ]);
  });

  it('treats an empty status list as no filter', () => {
    expect(filterRowsByStatus(rows, [])).toHaveLength(3);
  });
});

describe('sortNonMovingRows', () => {
  const rows = groupNonMovingRowsBySku([
    makeItem({ item_code: 'B', value: 300 }),
    makeItem({ item_code: 'A', value: 100 }),
    makeItem({ item_code: 'C', value: 300 }),
  ]);

  it('sorts numerically in the requested direction', () => {
    expect(sortNonMovingRows(rows, 'value', 'desc').map((r) => r.item_code)).toEqual([
      'B',
      'C',
      'A',
    ]);
  });

  it('breaks ties on item code so paging stays stable', () => {
    const [first, second] = sortNonMovingRows(rows, 'value', 'desc');
    expect([first.item_code, second.item_code]).toEqual(['B', 'C']);
  });

  it('sorts text with a locale compare', () => {
    expect(sortNonMovingRows(rows, 'item_code', 'asc').map((r) => r.item_code)).toEqual([
      'A',
      'B',
      'C',
    ]);
  });
});

describe('statusTotals', () => {
  it('buckets rows by movement status with their value', () => {
    const rows = groupNonMovingRowsBySku([
      makeItem({ item_code: 'A', days_since_last_movement: 5, value: 10 }),
      makeItem({ item_code: 'B', days_since_last_movement: 35, value: 20 }),
      makeItem({ item_code: 'C', days_since_last_movement: 200, value: 30 }),
    ]);

    const totals = statusTotals(rows);
    expect(totals.recent.item_count).toBe(1);
    expect(totals['slow-moving'].total_value).toBe(20);
    expect(totals['non-moving'].total_value).toBe(30);
  });
});

describe('warehouseRowsForItem', () => {
  it('returns every warehouse behind a folded line, worst idle first', () => {
    const items = [
      makeItem({ warehouse: 'BH-BS', days_since_last_movement: 20 }),
      makeItem({ warehouse: 'BH-PM', days_since_last_movement: 300 }),
      makeItem({ item_code: 'OTHER', warehouse: 'BH-PC' }),
    ];
    const [row] = groupNonMovingRowsBySku(items.slice(0, 2));

    expect(warehouseRowsForItem(items, row).map((i) => i.warehouse)).toEqual(['BH-PM', 'BH-BS']);
  });
});

describe('paging', () => {
  it('slices the requested page and counts pages', () => {
    const rows = Array.from({ length: 12 }, (_, i) => i);
    expect(pageOf(rows, 2, 5)).toEqual([5, 6, 7, 8, 9]);
    expect(totalPagesOf(12, 5)).toBe(3);
    expect(totalPagesOf(0, 5)).toBe(1);
  });
});
