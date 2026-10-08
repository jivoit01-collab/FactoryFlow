import { describe, expect, it } from 'vitest';

import type { WarehouseOccupancyItem } from '../../production-control/types';
import { featuredSkuStock } from './featuredSkus';

const row = (over: Partial<WarehouseOccupancyItem>): WarehouseOccupancyItem => ({
  item_code: 'X',
  item_name: '',
  on_hand: 0,
  pieces_per_box: 12,
  litres_per_piece: null,
  stock_value: 0,
  sub_group: '',
  uom: 'PCS',
  gross_weight_per_case: null,
  ...over,
});

const SKUS = [
  { label: '1 L', itemCode: 'FG0000323' },
  { label: '500 ml', itemCode: 'FG0000324' },
  { label: '250 ml', itemCode: 'FG0000328' },
];

describe('featuredSkuStock', () => {
  it('adds each code across warehouses and ignores every other item', () => {
    const result = featuredSkuStock(
      [
        row({ item_code: 'FG0000323', on_hand: 120, warehouse: 'BH-FG' }),
        row({ item_code: 'fg0000323 ', on_hand: 24, warehouse: 'BH-PF' }),
        row({ item_code: 'FG0000324', on_hand: 48, pieces_per_box: 24 }),
        row({
          item_code: 'FG0000333',
          item_name: 'SAFE SHOP NATURAL MINERAL ARSHDEEP',
          on_hand: 999,
        }),
      ],
      SKUS,
    );
    expect(result).toEqual([
      { label: '1 L', found: true, pieces: 144, cases: 12 },
      { label: '500 ml', found: true, pieces: 48, cases: 2 },
      { label: '250 ml', found: false, pieces: 0, cases: 0 },
    ]);
  });

  it('withholds cases when a row has no pack factor', () => {
    const [one] = featuredSkuStock(
      [row({ item_code: 'FG0000323', on_hand: 10, pieces_per_box: null })],
      SKUS,
    );
    expect(one.cases).toBeNull();
    expect(one.pieces).toBe(10);
  });
});
