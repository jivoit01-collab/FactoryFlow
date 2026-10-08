import { describe, expect, it } from 'vitest';

import type { WarehouseOccupancyItem } from '../../../production-control/types';
import { varietyTotals } from './varieties';

/**
 * Stock by variety, in boxes as well as tonnes.
 *
 * The Beverages board reads its panels in boxes, so a variety's boxes have to
 * be the tile's own count — `rowBoxes`, row by row — and an item with no box
 * size has to be disclosed rather than counted as a box a piece.
 */

function row(over: Partial<WarehouseOccupancyItem>): WarehouseOccupancyItem {
  return {
    item_code: 'I1',
    item_name: 'Item',
    on_hand: 0,
    pieces_per_box: null,
    litres_per_piece: null,
    stock_value: 0,
    sub_group: 'JUICE',
    uom: 'PCS',
    gross_weight_per_case: null,
    ...over,
  };
}

describe('varietyTotals in boxes', () => {
  it('counts a variety in boxes and discloses the items it could not box', () => {
    const [juice] = varietyTotals(
      [
        row({ item_code: 'A', on_hand: 240, pieces_per_box: 24 }),
        row({ item_code: 'B', on_hand: 120, pieces_per_box: 12 }),
        // Sold loose: a factor of 1 is not a box.
        row({ item_code: 'C', on_hand: 50, pieces_per_box: 1 }),
        // Stocked by volume, where a pack factor means nothing.
        row({ item_code: 'D', on_hand: 500, pieces_per_box: 20, uom: 'LTR' }),
      ],
      'boxes',
    );

    expect(juice.boxes).toBe(20);
    expect(juice.unboxed).toBe(2);
    expect(juice.items).toBe(4);
  });

  it('orders varieties by boxes on a boxes board and by tonnes otherwise', () => {
    const rows = [
      // Few heavy boxes.
      row({ sub_group: 'OIL', on_hand: 100, pieces_per_box: 10, gross_weight_per_case: 20 }),
      // Many light ones.
      row({ sub_group: 'WATER', on_hand: 600, pieces_per_box: 12, gross_weight_per_case: 3 }),
    ];

    expect(varietyTotals(rows, 'boxes').map((group) => group.variety)).toEqual(['WATER', 'OIL']);
    expect(varietyTotals(rows).map((group) => group.variety)).toEqual(['OIL', 'WATER']);
  });
});
