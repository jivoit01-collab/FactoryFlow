import { describe, expect, it } from 'vitest';

import { makeInventoryRecord, makePallet, makeWarehouseLocation, validatePalletMove } from '../services';
import { DEFAULT_WMS_SETTINGS } from '../types';
import type { Pallet, WarehouseLocation, WmsSettings } from '../types';

const settings: WmsSettings = { ...DEFAULT_WMS_SETTINGS, masterEnabled: true, updatedAt: 'x' };

function loc(code: string, overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code, barcode: code, column: 0, row: 0, level: 0 });
  return { ...base, ...overrides };
}

function pallet(overrides: Partial<Pallet> = {}): Pallet {
  return { ...makePallet({ licensePlate: 'PLT-1', itemCode: 'SKU1', boxCount: 4, totalUnits: 40 }), ...overrides };
}

describe('validatePalletMove', () => {
  it('accepts a move into an enabled, empty location', () => {
    const result = validatePalletMove({
      settings,
      pallet: pallet(),
      destination: loc('A-01'),
      inventory: [],
      pallets: [],
    });
    expect(result.ok).toBe(true);
  });

  it('blocks a move into a blocked location', () => {
    const result = validatePalletMove({
      settings,
      pallet: pallet(),
      destination: loc('A-02', { status: 'BLOCKED' }),
      inventory: [],
      pallets: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'location_blocked')).toBe(true);
  });

  it('does not count the pallet against its own destination capacity', () => {
    const destination = loc('A-03', {
      capacity: { maxPallets: 1, maxUnits: null, maxWeight: null, maxVolume: null },
    });
    const moving = pallet({ currentLocationId: destination.id });
    // The only pallet at the destination is the one being moved, so a maxPallets=1
    // cap must not be treated as already full.
    const result = validatePalletMove({
      settings: { ...settings, capacityViolation: 'BLOCK' },
      pallet: moving,
      destination,
      inventory: [],
      pallets: [moving],
    });
    expect(result.ok).toBe(true);
  });

  it('flags a capacity overflow when configured to block', () => {
    const destination = loc('A-04', {
      capacity: { maxPallets: 1, maxUnits: null, maxWeight: null, maxVolume: null },
    });
    const occupant = pallet({ licensePlate: 'PLT-OTHER', currentLocationId: destination.id });
    const result = validatePalletMove({
      settings: { ...settings, capacityViolation: 'BLOCK' },
      pallet: pallet({ licensePlate: 'PLT-2' }),
      destination,
      inventory: [makeInventoryRecord({ locationId: destination.id, itemCode: 'SKU1', quantity: 1 })],
      pallets: [occupant],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'capacity')).toBe(true);
  });
});
