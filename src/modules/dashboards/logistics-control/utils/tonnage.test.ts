import { describe, expect, it } from 'vitest';

import type { WarehouseOccupancyItem } from '../../production-control/types';
import { isPieceUom, rollUpTonnage, rowKilograms } from './tonnage';

function makeRow(overrides: Partial<WarehouseOccupancyItem> = {}): WarehouseOccupancyItem {
  return {
    item_code: 'ITEM-1',
    item_name: 'Jivo Olive 1 L',
    on_hand: 1200,
    pieces_per_box: 12,
    litres_per_piece: 1,
    stock_value: 100000,
    sub_group: 'OLIVE',
    uom: 'PCS',
    gross_weight_per_case: 11.4,
    ...overrides,
  };
}

describe('isPieceUom', () => {
  it('accepts countable units, including the drum SKU', () => {
    for (const uom of ['PCS', 'pcs', ' PCS ', 'DRM', 'BOX', 'NOS']) {
      expect(isPieceUom(uom), uom).toBe(true);
    }
  });

  it('rejects mass and volume units', () => {
    for (const uom of ['KG', 'kg', 'KGS', 'LTR', 'litres', 'MT', 'ML']) {
      expect(isPieceUom(uom), uom).toBe(false);
    }
  });

  it('treats an unknown unit as unweighable rather than guessing pieces', () => {
    expect(isPieceUom('')).toBe(false);
    expect(isPieceUom('   ')).toBe(false);
    expect(isPieceUom(null)).toBe(false);
    expect(isPieceUom(undefined)).toBe(false);
  });
});

describe('rowKilograms', () => {
  it('divides the case weight across the pieces in a case', () => {
    // 1200 pieces = 100 cases at 12 per case; 100 × 11.4 kg = 1140 kg.
    expect(rowKilograms(makeRow())).toBeCloseTo(1140);
  });

  it('applies the case weight directly to a piece-sold SKU', () => {
    // pieces_per_box of 1 is not an error — one piece is one case.
    const row = makeRow({ on_hand: 50, pieces_per_box: 1, gross_weight_per_case: 13 });
    expect(rowKilograms(row)).toBeCloseTo(650);
  });

  it('returns null rather than zero when SAP records no case weight', () => {
    expect(rowKilograms(makeRow({ gross_weight_per_case: null }))).toBeNull();
    expect(rowKilograms(makeRow({ gross_weight_per_case: 0 }))).toBeNull();
  });

  it('returns null when the pack factor is missing, never dividing by zero', () => {
    expect(rowKilograms(makeRow({ pieces_per_box: null }))).toBeNull();
    expect(rowKilograms(makeRow({ pieces_per_box: 0 }))).toBeNull();
  });

  it('refuses a row stocked in a mass or volume unit', () => {
    // The on-hand figure is already kilograms; dividing it by a pack factor
    // would be meaningless.
    expect(rowKilograms(makeRow({ uom: 'KG' }))).toBeNull();
    expect(rowKilograms(makeRow({ uom: 'LTR' }))).toBeNull();
  });

  it('passes a negative on-hand through rather than clamping it', () => {
    expect(rowKilograms(makeRow({ on_hand: -120 }))).toBeCloseTo(-114);
  });
});

describe('rollUpTonnage', () => {
  it('totals the weighable rows and counts what it could not see', () => {
    const result = rollUpTonnage([
      makeRow(),
      makeRow({ item_code: 'ITEM-2', gross_weight_per_case: null }),
      makeRow({ item_code: 'ITEM-3', uom: 'KG' }),
    ]);

    expect(result.tonnes).toBeCloseTo(1.14);
    expect(result.weighedItems).toBe(1);
    expect(result.unweighedItems).toBe(1);
    expect(result.nonPieceItems).toBe(1);
    expect(result.coverage).toBeCloseTo(1 / 3);
  });

  it('counts a non-piece row once, not as unweighed as well', () => {
    // A KG row with no case weight is one problem, not two — otherwise the
    // caveats under the tile add up to more rows than the warehouse holds.
    const result = rollUpTonnage([makeRow({ uom: 'KG', gross_weight_per_case: null })]);

    expect(result.nonPieceItems).toBe(1);
    expect(result.unweighedItems).toBe(0);
  });

  it('reports no coverage for an empty warehouse instead of a false 100%', () => {
    const result = rollUpTonnage([]);

    expect(result.tonnes).toBe(0);
    expect(result.coverage).toBeNull();
  });

  it('reports zero coverage when nothing at all can be weighed', () => {
    const result = rollUpTonnage([
      makeRow({ gross_weight_per_case: null }),
      makeRow({ item_code: 'ITEM-2', gross_weight_per_case: null }),
    ]);

    expect(result.tonnes).toBe(0);
    expect(result.coverage).toBe(0);
  });
});
