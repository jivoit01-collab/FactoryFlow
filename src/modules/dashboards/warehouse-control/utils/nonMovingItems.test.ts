import { describe, expect, it } from 'vitest';

import type { NonMovingItem, WarehouseGroup } from '@/modules/dashboards/non-moving/types';

import { rollUpNonMovingItems } from './nonMovingItems';

function makeItem(overrides: Partial<NonMovingItem> = {}): NonMovingItem {
  return {
    branch: 'OIL',
    item_code: 'PM0001',
    item_name: 'Carton 1 LTR 16 PCS',
    item_group_name: 'PACKAGING MATERIAL',
    sub_group: 'CARTON',
    warehouse: 'BH-BT',
    quantity: 10,
    value: 1_000,
    last_movement_date: null,
    days_since_last_movement: 60,
    consumption_ratio: 0,
    ...overrides,
  };
}

function makeWarehouse(warehouse: string, items: NonMovingItem[]): WarehouseGroup {
  return {
    warehouse,
    warehouse_name: warehouse,
    item_count: items.length,
    total_value: items.reduce((sum, item) => sum + item.value, 0),
    total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}

describe('rollUpNonMovingItems', () => {
  it('orders by days standing still, before value', () => {
    const rows = rollUpNonMovingItems([
      makeWarehouse('BH-BT', [
        makeItem({ item_code: 'RICH', value: 500_000, days_since_last_movement: 40 }),
        makeItem({ item_code: 'OLD', value: 900, days_since_last_movement: 400 }),
      ]),
    ]);

    expect(rows.map((row) => row.itemCode)).toEqual(['OLD', 'RICH']);
  });

  it('breaks an equal age on value', () => {
    const rows = rollUpNonMovingItems([
      makeWarehouse('BH-BT', [
        makeItem({ item_code: 'CHEAP', value: 100, days_since_last_movement: 90 }),
        makeItem({ item_code: 'DEAR', value: 8_000, days_since_last_movement: 90 }),
      ]),
    ]);

    expect(rows.map((row) => row.itemCode)).toEqual(['DEAR', 'CHEAP']);
  });

  it('adds quantity and value across warehouses but takes the worst age', () => {
    const rows = rollUpNonMovingItems([
      makeWarehouse('BH-BT', [
        makeItem({ quantity: 10, value: 1_000, days_since_last_movement: 70 }),
      ]),
      makeWarehouse('BH-PM', [
        makeItem({
          warehouse: 'BH-PM',
          quantity: 4,
          value: 400,
          days_since_last_movement: 250,
        }),
      ]),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      itemCode: 'PM0001',
      quantity: 14,
      value: 1_400,
      days: 250,
      warehouses: 2,
      warehouse: '',
    });
  });

  it('names the warehouse when only one holds the item', () => {
    const rows = rollUpNonMovingItems([makeWarehouse('BH-BT', [makeItem()])]);

    expect(rows[0]).toMatchObject({ warehouses: 1, warehouse: 'BH-BT' });
  });

  it('keeps unnamed lines apart instead of collapsing them onto a blank code', () => {
    const rows = rollUpNonMovingItems([
      makeWarehouse('BH-BT', [
        makeItem({ item_code: '', item_name: 'Loose shrink film' }),
        makeItem({ item_code: '', item_name: 'Broken pallet' }),
      ]),
    ]);

    expect(rows).toHaveLength(2);
  });

  it('drops a row that has neither a code nor a name', () => {
    const rows = rollUpNonMovingItems([
      makeWarehouse('BH-BT', [makeItem({ item_code: '  ', item_name: '' })]),
    ]);

    expect(rows).toEqual([]);
  });

  it('fills a missing name or sub-group from another warehouse holding the item', () => {
    const rows = rollUpNonMovingItems([
      makeWarehouse('BH-BT', [makeItem({ item_name: '', sub_group: '' })]),
      makeWarehouse('BH-PM', [makeItem({ item_name: 'Carton 1 LTR', sub_group: 'CARTON' })]),
    ]);

    expect(rows[0]).toMatchObject({ itemName: 'Carton 1 LTR', subGroup: 'CARTON' });
  });

  it('returns nothing for warehouses with no resolved items', () => {
    expect(rollUpNonMovingItems([makeWarehouse('BH-BT', [])])).toEqual([]);
    expect(rollUpNonMovingItems([])).toEqual([]);
  });
});
