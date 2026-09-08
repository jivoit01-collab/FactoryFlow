import { describe, expect, it } from 'vitest';

import type { NonMovingItem } from '@/modules/dashboards/non-moving/types';

import { oldestDays } from './nonMovingAge';

function makeItem(days: number): NonMovingItem {
  return {
    branch: 'OIL',
    item_code: `PM${days}`,
    item_name: 'Some material',
    item_group_name: 'PACKAGING MATERIAL',
    sub_group: 'CARTON',
    warehouse: 'BH-BT',
    quantity: 1,
    value: 1,
    last_movement_date: null,
    days_since_last_movement: days,
    consumption_ratio: 0,
  };
}

describe('oldestDays', () => {
  it('returns the longest a single item has stood still', () => {
    expect(oldestDays([makeItem(12), makeItem(187), makeItem(45)])).toBe(187);
  });

  it('returns zero for a warehouse with no resolved items', () => {
    expect(oldestDays([])).toBe(0);
  });
});
