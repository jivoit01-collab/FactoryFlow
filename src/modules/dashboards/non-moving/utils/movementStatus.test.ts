import { describe, expect, it } from 'vitest';

import {
  agedOnLabel,
  isNeverPurchased,
  isProductionAged,
  isPurchaseAged,
  movementWarehouseElsewhere,
  wasRestacked,
} from './movementStatus';

describe('isProductionAged', () => {
  it('is true only for the packing-material basis', () => {
    expect(isProductionAged({ movement_basis: 'production' })).toBe(true);
    expect(isProductionAged({ movement_basis: 'any' })).toBe(false);
    // An older backend sends neither field.
    expect(isProductionAged({})).toBe(false);
  });
});

describe('isPurchaseAged', () => {
  it('is true for both clocks the production switch turns on', () => {
    expect(isPurchaseAged({ movement_basis: 'grpo' })).toBe(true);
    expect(isPurchaseAged({ movement_basis: 'none' })).toBe(true);
    expect(isPurchaseAged({ movement_basis: 'production' })).toBe(false);
    expect(isPurchaseAged({ movement_basis: 'any' })).toBe(false);
    expect(isPurchaseAged({})).toBe(false);
  });
});

describe('isNeverPurchased', () => {
  it('singles out the rows with no GRPO to age from', () => {
    // 89 of 231 stocked packing items in Beverages land here: bottles the
    // factory blows itself, and stock that only ever arrived by transfer.
    expect(isNeverPurchased({ movement_basis: 'none' })).toBe(true);
    expect(isNeverPurchased({ movement_basis: 'grpo' })).toBe(false);
    expect(isNeverPurchased({})).toBe(false);
  });
});

describe('agedOnLabel', () => {
  it('names the clock that produced the age on a row', () => {
    expect(agedOnLabel({ movement_basis: 'production' })).toBe('Production');
    expect(agedOnLabel({ movement_basis: 'grpo' })).toBe('Last GRPO');
    expect(agedOnLabel({ movement_basis: 'none' })).toBe('Never purchased');
    expect(agedOnLabel({ movement_basis: 'any' })).toBe('Any movement');
    // An older backend sends no basis at all.
    expect(agedOnLabel({})).toBe('Any movement');
  });
});

describe('wasRestacked', () => {
  it('flags packing material moved between godowns since it was last consumed', () => {
    expect(
      wasRestacked({
        movement_basis: 'production',
        days_since_last_movement: 711,
        days_since_warehouse_movement: 5,
      }),
    ).toBe(true);
  });

  it('stays quiet when the two clocks agree', () => {
    expect(
      wasRestacked({
        movement_basis: 'production',
        days_since_last_movement: 711,
        days_since_warehouse_movement: 711,
      }),
    ).toBe(false);
  });

  it('never fires on an item group aged on movement anyway', () => {
    expect(
      wasRestacked({
        movement_basis: 'any',
        days_since_last_movement: 711,
        days_since_warehouse_movement: 5,
      }),
    ).toBe(false);
  });

  it('says nothing when the backend sent no warehouse clock', () => {
    expect(wasRestacked({ movement_basis: 'production', days_since_last_movement: 711 })).toBe(
      false,
    );
  });

  it('flags the gap on a purchase-aged row too', () => {
    // The whole reason somebody switches the rule off: bought 272 days ago,
    // issued to the line last week.
    expect(
      wasRestacked({
        movement_basis: 'grpo',
        days_since_last_movement: 272,
        days_since_warehouse_movement: 8,
      }),
    ).toBe(true);
  });

  it('flags it on a never-purchased row as well', () => {
    expect(
      wasRestacked({
        movement_basis: 'none',
        days_since_last_movement: 738,
        days_since_warehouse_movement: 42,
      }),
    ).toBe(true);
  });
});

describe('movementWarehouseElsewhere', () => {
  it('names the store the age was earned in when it is not this row', () => {
    // The glass bottle sitting in BH-PM was issued to production out of BH-PP.
    expect(
      movementWarehouseElsewhere({ warehouse: 'BH-PM', last_movement_warehouse: 'BH-PP' }),
    ).toBe('BH-PP');
  });

  it('stays quiet when the movement happened in this very warehouse', () => {
    expect(
      movementWarehouseElsewhere({ warehouse: 'BH-PP', last_movement_warehouse: 'BH-PP' }),
    ).toBe('');
  });

  it('stays quiet when the folded line already covers that warehouse', () => {
    expect(
      movementWarehouseElsewhere({
        warehouse: '3 warehouses',
        warehouses: ['BH-PM', 'BH-PP', 'GP-NM'],
        last_movement_warehouse: 'BH-PP',
      }),
    ).toBe('');
  });

  it('names it on a folded line that leaves that warehouse out', () => {
    expect(
      movementWarehouseElsewhere({
        warehouse: '2 warehouses',
        warehouses: ['BH-PM', 'GP-NM'],
        last_movement_warehouse: 'BH-PP',
      }),
    ).toBe('BH-PP');
  });

  it('has nothing to say when SAP never moved the stock', () => {
    expect(movementWarehouseElsewhere({ warehouse: 'BH-PM' })).toBe('');
  });
});
