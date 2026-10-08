import { describe, expect, it } from 'vitest';

import type { WarehouseOccupancyItem } from '../../production-control/types';
import { featuredSkuStock, packMillilitres } from './featuredSkus';

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
  { label: '1 L', name: 'Arshdeep', ml: 1000 },
  { label: '500 ml', name: 'Arshdeep', ml: 500 },
  { label: '250 ml', name: 'Arshdeep', ml: 250 },
];

describe('packMillilitres', () => {
  it('reads the size off the name in its common spellings', () => {
    expect(packMillilitres(row({ item_name: 'ARSHDEEP 1 LTR' }))).toBe(1000);
    expect(packMillilitres(row({ item_name: 'Arshdeep 1L x 12' }))).toBe(1000);
    expect(packMillilitres(row({ item_name: 'ARSHDEEP 500ML' }))).toBe(500);
    expect(packMillilitres(row({ item_name: 'ARSHDEEP 250 ml PET' }))).toBe(250);
  });

  it('falls back to the litres SAP holds per piece', () => {
    expect(packMillilitres(row({ item_name: 'ARSHDEEP', litres_per_piece: 0.5 }))).toBe(500);
    expect(packMillilitres(row({ item_name: 'ARSHDEEP' }))).toBeNull();
  });
});

describe('featuredSkuStock', () => {
  it('adds the rows of each size and keeps the sizes apart', () => {
    const result = featuredSkuStock(
      [
        row({ item_code: 'A1', item_name: 'ARSHDEEP 1 LTR', on_hand: 120, warehouse: 'BH-FG' }),
        row({ item_code: 'A1', item_name: 'ARSHDEEP 1 LTR', on_hand: 24, warehouse: 'BH-PF' }),
        row({ item_code: 'A5', item_name: 'Arsh Deep 500 ML', on_hand: 48, pieces_per_box: 24 }),
        row({ item_code: 'B1', item_name: 'OTHER 1 LTR', on_hand: 999 }),
      ],
      SKUS,
    );
    expect(result).toEqual([
      { label: '1 L', itemCodes: ['A1'], pieces: 144, cases: 12 },
      { label: '500 ml', itemCodes: ['A5'], pieces: 48, cases: 2 },
      { label: '250 ml', itemCodes: [], pieces: 0, cases: 0 },
    ]);
  });

  it('withholds cases when a row has no pack factor', () => {
    const [one] = featuredSkuStock(
      [row({ item_name: 'ARSHDEEP 1L', on_hand: 10, pieces_per_box: null })],
      SKUS,
    );
    expect(one.cases).toBeNull();
    expect(one.pieces).toBe(10);
  });
});
