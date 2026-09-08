import { describe, expect, it } from 'vitest';

import type { CellPurpose, Pallet, Warehouse, WarehouseLocation } from '@/modules/wms';

import { summarisePalletSpace } from './palletSpace';

function makeWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 'wh-1',
    code: 'BH',
    name: 'Bhakharpur',
    description: '',
    enabled: true,
    columns: 10,
    rows: 10,
    levels: 1,
    namingScheme: {} as Warehouse['namingScheme'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Warehouse;
}

function makeLocation(overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  return {
    id: 'loc-1',
    warehouseId: 'wh-1',
    zoneId: null,
    purposeId: null,
    code: 'A-01-01',
    barcode: 'A-01-01',
    column: 0,
    row: 0,
    level: 0,
    type: 'RACK',
    capacity: { maxPallets: 2, maxUnits: null, maxWeight: null, maxVolume: null },
    dimensions: { length: null, width: null, height: null },
    materialRules: {} as WarehouseLocation['materialRules'],
    replenishment: {} as WarehouseLocation['replenishment'],
    reservation: { isReserved: false } as WarehouseLocation['reservation'],
    status: 'ACTIVE',
    enabled: true,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as WarehouseLocation;
}

function makePallet(overrides: Partial<Pallet> = {}): Pallet {
  return {
    id: 'plt-1',
    licensePlate: 'LP0001',
    currentLocationId: 'loc-1',
    itemCode: 'FG001',
    itemName: 'Mustard 1L',
    boxCount: 40,
    unitsPerBox: 12,
    totalUnits: 480,
    lotNumber: '',
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Pallet;
}

function makePurpose(overrides: Partial<CellPurpose> = {}): CellPurpose {
  return {
    id: 'purpose-path',
    warehouseId: 'wh-1',
    name: 'Aisle',
    color: '#ccc',
    holdsStock: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as CellPurpose;
}

describe('summarisePalletSpace', () => {
  it('sums configured pallet capacity and counts placed pallets as used', () => {
    const summary = summarisePalletSpace({
      warehouses: [makeWarehouse()],
      locations: [
        makeLocation({ id: 'loc-1', capacity: { maxPallets: 2, maxUnits: null, maxWeight: null, maxVolume: null } }),
        makeLocation({ id: 'loc-2', capacity: { maxPallets: 3, maxUnits: null, maxWeight: null, maxVolume: null } }),
      ],
      pallets: [
        makePallet({ id: 'plt-1', currentLocationId: 'loc-1' }),
        makePallet({ id: 'plt-2', currentLocationId: 'loc-2' }),
      ],
      purposes: [],
    });

    expect(summary.totalSpace).toBe(5);
    expect(summary.usedSpace).toBe(2);
    expect(summary.freeSpace).toBe(3);
    expect(summary.utilisationPct).toBe(40);
    expect(summary.warehouses).toHaveLength(1);
    expect(summary.warehouses[0]?.code).toBe('BH');
  });

  it('counts a cell with no configured capacity as one slot and reports how many', () => {
    const summary = summarisePalletSpace({
      warehouses: [makeWarehouse()],
      locations: [
        makeLocation({
          id: 'loc-1',
          capacity: { maxPallets: null, maxUnits: null, maxWeight: null, maxVolume: null },
        }),
        makeLocation({
          id: 'loc-2',
          capacity: { maxPallets: null, maxUnits: null, maxWeight: null, maxVolume: null },
        }),
      ],
      pallets: [],
      purposes: [],
    });

    expect(summary.totalSpace).toBe(2);
    expect(summary.locationsWithoutCapacity).toBe(2);
  });

  it('excludes disabled cells and cells whose purpose holds no stock', () => {
    const summary = summarisePalletSpace({
      warehouses: [makeWarehouse()],
      locations: [
        makeLocation({ id: 'loc-1' }),
        makeLocation({ id: 'loc-2', enabled: false }),
        makeLocation({ id: 'loc-3', purposeId: 'purpose-path' }),
      ],
      pallets: [],
      purposes: [makePurpose()],
    });

    // Only loc-1 counts: 2 slots.
    expect(summary.totalSpace).toBe(2);
    expect(summary.warehouses[0]?.storageLocations).toBe(1);
  });

  it('holds blocked space out of free without pretending it does not exist', () => {
    const summary = summarisePalletSpace({
      warehouses: [makeWarehouse()],
      locations: [
        makeLocation({ id: 'loc-1' }),
        makeLocation({ id: 'loc-2', status: 'BLOCKED' }),
        makeLocation({ id: 'loc-3', status: 'MAINTENANCE' }),
      ],
      pallets: [],
      purposes: [],
    });

    expect(summary.totalSpace).toBe(6);
    expect(summary.unavailableSpace).toBe(4);
    expect(summary.freeSpace).toBe(2);
  });

  it('ignores shipped and removed pallets, and counts unplaced ones separately', () => {
    const summary = summarisePalletSpace({
      warehouses: [makeWarehouse()],
      locations: [makeLocation({ id: 'loc-1' })],
      pallets: [
        makePallet({ id: 'plt-1', currentLocationId: 'loc-1' }),
        makePallet({ id: 'plt-2', currentLocationId: 'loc-1', status: 'SHIPPED' }),
        makePallet({ id: 'plt-3', currentLocationId: null, status: 'REMOVED' }),
        makePallet({ id: 'plt-4', currentLocationId: null }),
      ],
      purposes: [],
    });

    expect(summary.usedSpace).toBe(1);
    expect(summary.unplacedPallets).toBe(1);
  });

  it('does not count a pallet parked on a non-storage cell as filling a slot', () => {
    const summary = summarisePalletSpace({
      warehouses: [makeWarehouse()],
      locations: [
        makeLocation({ id: 'loc-1' }),
        makeLocation({ id: 'loc-aisle', purposeId: 'purpose-path' }),
      ],
      pallets: [makePallet({ id: 'plt-1', currentLocationId: 'loc-aisle' })],
      purposes: [makePurpose()],
    });

    expect(summary.usedSpace).toBe(0);
    expect(summary.unplacedPallets).toBe(0);
  });

  it('splits the totals per warehouse, largest first', () => {
    const summary = summarisePalletSpace({
      warehouses: [
        makeWarehouse({ id: 'wh-1', code: 'BH', name: 'Bhakharpur' }),
        makeWarehouse({ id: 'wh-2', code: 'GP', name: 'Gupta' }),
      ],
      locations: [
        makeLocation({ id: 'loc-1', warehouseId: 'wh-1' }),
        makeLocation({
          id: 'loc-2',
          warehouseId: 'wh-2',
          capacity: { maxPallets: 10, maxUnits: null, maxWeight: null, maxVolume: null },
        }),
      ],
      pallets: [makePallet({ id: 'plt-1', currentLocationId: 'loc-2' })],
      purposes: [],
    });

    expect(summary.warehouses.map((row) => row.code)).toEqual(['GP', 'BH']);
    expect(summary.warehouses[0]?.usedSpace).toBe(1);
    expect(summary.warehouses[1]?.usedSpace).toBe(0);
    expect(summary.totalSpace).toBe(12);
  });

  it('reports zero utilisation rather than dividing by zero when there is no space', () => {
    const summary = summarisePalletSpace({
      warehouses: [],
      locations: [],
      pallets: [],
      purposes: [],
    });

    expect(summary.totalSpace).toBe(0);
    expect(summary.utilisationPct).toBe(0);
    expect(summary.warehouses).toEqual([]);
  });
});
