import { describe, expect, it } from 'vitest';

import { isProductionAged, wasRestacked } from './movementStatus';

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
