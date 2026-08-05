import { describe, expect, it } from 'vitest';

import type { NonMovingItem, WarehouseSummary } from '../types';
import { buildNonMovingWarehouseGroups, groupNonMovingItemsBySku } from './nonMovingGrouping';

function makeItem(overrides: Partial<NonMovingItem>): NonMovingItem {
  return {
    branch: 'OIL',
    item_code: 'PM0000817',
    item_name: 'PREFORM 21/23 GMS',
    item_group_name: 'PACKAGING MATERIAL',
    sub_group: 'PREFORM',
    warehouse: 'BH-BS',
    quantity: 0,
    value: 0,
    last_movement_date: null,
    days_since_last_movement: 187,
    consumption_ratio: 0,
    ...overrides,
  };
}

describe('groupNonMovingItemsBySku', () => {
  it('sums quantity and value across warehouses for the same item', () => {
    const [grouped] = groupNonMovingItemsBySku([
      makeItem({ warehouse: 'BH-BS', quantity: 463104, value: 1478822.4 }),
      makeItem({ warehouse: 'BH-PM', quantity: 0, value: 0 }),
    ]);

    expect(grouped.quantity).toBe(463104);
    expect(grouped.value).toBe(1478822.4);
    expect(grouped.warehouse).toBe('2 warehouses');
  });

  it('uses the lowest idle days and matching movement details', () => {
    const [grouped] = groupNonMovingItemsBySku([
      makeItem({ warehouse: 'BH-BS', days_since_last_movement: 187, last_movement_date: null }),
      makeItem({
        warehouse: 'BH-PM',
        days_since_last_movement: 35,
        last_movement_date: '2026-04-15 00:00:00',
        consumption_ratio: 0.12,
      }),
    ]);

    expect(grouped.days_since_last_movement).toBe(35);
    expect(grouped.last_movement_date).toBe('2026-04-15 00:00:00');
    expect(grouped.consumption_ratio).toBe(0.12);
  });

  it('keeps the warehouse code when only one warehouse contributes', () => {
    const [grouped] = groupNonMovingItemsBySku([
      makeItem({ warehouse: 'BH-PM', days_since_last_movement: 35 }),
    ]);

    expect(grouped.warehouse).toBe('BH-PM');
  });
});

function makeWarehouse(overrides: Partial<WarehouseSummary>): WarehouseSummary {
  return {
    warehouse: 'BH-BS',
    warehouse_name: 'Blowing Section',
    item_count: 0,
    total_quantity: 0,
    total_value: 0,
    ...overrides,
  };
}

describe('buildNonMovingWarehouseGroups', () => {
  it('resolves each warehouse item code against the visible rows', () => {
    const [group] = buildNonMovingWarehouseGroups(
      [
        makeWarehouse({
          items: [
            { item_code: 'PM0000817', quantity: 100, value: 400 },
            { item_code: 'PM0000622', quantity: 50, value: 250 },
          ],
        }),
      ],
      [
        makeItem({ item_code: 'PM0000817', item_name: 'PREFORM 21/23 GMS' }),
        makeItem({ item_code: 'PM0000622', item_name: 'POUCH 889 GMS', sub_group: 'POUCH' }),
      ],
    );

    expect(group.items.map((item) => item.item_code)).toEqual(['PM0000817', 'PM0000622']);
    expect(group.items[0].warehouse).toBe('BH-BS');
    expect(group.items[1].item_name).toBe('POUCH 889 GMS');
  });

  it('recomputes totals from the items that survive the active filters', () => {
    const [group] = buildNonMovingWarehouseGroups(
      [
        makeWarehouse({
          item_count: 2,
          total_quantity: 150,
          total_value: 650,
          items: [
            { item_code: 'PM0000817', quantity: 100, value: 400 },
            { item_code: 'PM0000622', quantity: 50, value: 250 },
          ],
        }),
      ],
      [makeItem({ item_code: 'PM0000817' })],
    );

    expect(group.item_count).toBe(1);
    expect(group.total_quantity).toBe(100);
    expect(group.total_value).toBe(400);
  });

  it('drops a warehouse whose items are all filtered out', () => {
    const groups = buildNonMovingWarehouseGroups(
      [makeWarehouse({ items: [{ item_code: 'PM0000817', quantity: 100, value: 400 }] })],
      [makeItem({ item_code: 'PM0000622' })],
    );

    expect(groups).toEqual([]);
  });

  it('keeps a warehouse without an item breakdown, just not expandable', () => {
    const [group] = buildNonMovingWarehouseGroups(
      [makeWarehouse({ item_count: 3, total_quantity: 12, total_value: 99 })],
      [makeItem({ item_code: 'PM0000817' })],
    );

    expect(group.items).toEqual([]);
    expect(group.item_count).toBe(3);
    expect(group.total_value).toBe(99);
  });

  it('keeps only factory warehouses (BH / GP)', () => {
    const items = [{ item_code: 'PM0000817', quantity: 10, value: 100 }];
    const groups = buildNonMovingWarehouseGroups(
      [
        makeWarehouse({ warehouse: 'BH-WST', items }),
        makeWarehouse({ warehouse: 'GP-NM', items }),
        makeWarehouse({ warehouse: 'PB-ST', items }),
        makeWarehouse({ warehouse: 'DL-PS', items }),
        makeWarehouse({ warehouse: 'Unassigned', items }),
      ],
      [makeItem({ item_code: 'PM0000817' })],
    );

    expect(groups.map((group) => group.warehouse)).toEqual(['BH-WST', 'GP-NM']);
  });

  it('drops non-factory warehouses that have no item breakdown', () => {
    const groups = buildNonMovingWarehouseGroups(
      [makeWarehouse({ warehouse: 'PB-JP', item_count: 2, total_value: 512 })],
      [makeItem({ item_code: 'PM0000817' })],
    );

    expect(groups).toEqual([]);
  });

  it('sorts items by value, highest first', () => {
    const [group] = buildNonMovingWarehouseGroups(
      [
        makeWarehouse({
          items: [
            { item_code: 'PM0000622', quantity: 50, value: 250 },
            { item_code: 'PM0000817', quantity: 100, value: 400 },
          ],
        }),
      ],
      [makeItem({ item_code: 'PM0000817' }), makeItem({ item_code: 'PM0000622' })],
    );

    expect(group.items.map((item) => item.value)).toEqual([400, 250]);
  });
});
