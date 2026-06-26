import { describe, expect, it } from 'vitest';

import { makeWarehouseLocation } from '../services';
import { buildOccupancyIndex, computeOccupancy } from '../services/occupancy';
import type { InventoryRecord, Pallet, WarehouseLocation } from '../types';
import { createWmsId, nowIso } from '../utils';

function location(overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code: 'A-01', barcode: 'A-01', column: 0, row: 0, level: 0 });
  return {
    ...base,
    capacity: { maxPallets: 2, maxUnits: 100, maxWeight: 1000, maxVolume: 10 },
    ...overrides,
  };
}

function inv(locationId: string, overrides: Partial<InventoryRecord> = {}): InventoryRecord {
  const timestamp = nowIso();
  return {
    id: createWmsId(),
    locationId,
    itemCode: 'SKU1',
    itemName: 'Item 1',
    palletId: null,
    lotNumber: '',
    serialNumber: '',
    quantity: 0,
    uom: 'EA',
    boxCount: null,
    weight: null,
    volume: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiryDate: null,
    ...overrides,
  };
}

describe('computeOccupancy', () => {
  it('is empty with no stock', () => {
    const occ = computeOccupancy(location(), [], []);
    expect(occ.occupancyPct).toBe(0);
    expect(occ.status).toBe('EMPTY');
  });

  it('uses the highest ratio across dimensions', () => {
    const loc = location();
    // units 50/100 = 50%, weight 900/1000 = 90% → 90% wins → NEARLY_FULL
    const occ = computeOccupancy(loc, [inv(loc.id, { quantity: 50, weight: 900 })], []);
    expect(Math.round(occ.occupancyPct)).toBe(90);
    expect(occ.status).toBe('NEARLY_FULL');
  });

  it('marks full at or above 100%', () => {
    const loc = location();
    const occ = computeOccupancy(loc, [inv(loc.id, { quantity: 120 })], []);
    expect(occ.status).toBe('FULL');
  });

  it('counts pallets from pallets parked at the location', () => {
    const loc = location();
    const pallet: Pallet = {
      id: createWmsId(),
      licensePlate: 'LP1',
      currentLocationId: loc.id,
      itemCode: 'SKU1',
      itemName: 'Item 1',
      boxCount: 10,
      unitsPerBox: null,
      totalUnits: null,
      lotNumber: '',
      expiryDate: null,
      status: 'ACTIVE',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const occ = computeOccupancy(loc, [], [pallet]);
    expect(occ.pallets).toBe(1);
    expect(occ.palletRatio).toBe(0.5);
  });

  it('lifecycle and reservation override the occupancy colour', () => {
    expect(computeOccupancy(location({ enabled: false }), [], []).status).toBe('DISABLED');
    expect(computeOccupancy(location({ status: 'DAMAGED' }), [], []).status).toBe('BLOCKED');
    expect(computeOccupancy(location({ status: 'MAINTENANCE' }), [], []).status).toBe('MAINTENANCE');
    expect(
      computeOccupancy(location({ reservation: { isReserved: true, reference: 'X' } }), [], []).status,
    ).toBe('RESERVED');
  });
});

describe('buildOccupancyIndex', () => {
  it('groups stock by location', () => {
    const a = location({ id: 'a' } as Partial<WarehouseLocation>);
    const b = location({ id: 'b' } as Partial<WarehouseLocation>);
    const index = buildOccupancyIndex(
      [a, b],
      [inv('a', { quantity: 100 }), inv('b', { quantity: 0 })],
      [],
    );
    expect(index.get('a')?.status).toBe('FULL');
    expect(index.get('b')?.status).toBe('EMPTY');
  });
});
