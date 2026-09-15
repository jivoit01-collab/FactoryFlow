import { describe, expect, it } from 'vitest';

import { isProductionAged, movementWarehouseElsewhere, wasRestacked } from './movementStatus';

describe('isProductionAged', () => {
  it('is true only for the packing-material basis', () => {
    expect(isProductionAged({ movement_basis: 'production' })).toBe(true);
    expect(isProductionAged({ movement_basis: 'any' })).toBe(false);
    // An older backend sends neither field.
    expect(isProductionAged({})).toBe(false);
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
