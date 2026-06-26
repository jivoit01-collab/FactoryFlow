import { describe, expect, it } from 'vitest';

import {
  buildOccupancyIndex,
  expiryReport,
  filterMovements,
  findItemLocations,
  locationByStock,
  makeInventoryRecord,
  makeMovement,
  makeWarehouseLocation,
  replenishmentList,
  stockByLocation,
  utilizationByZone,
} from '../services';
import type { WarehouseLocation } from '../types';

function loc(code: string, overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code, barcode: code, column: 0, row: 0, level: 0 });
  return { ...base, ...overrides };
}

describe('findItemLocations', () => {
  it('matches by item/lot and groups quantities by location', () => {
    const a = loc('A-01');
    const b = loc('A-02');
    const inventory = [
      makeInventoryRecord({ locationId: a.id, itemCode: 'SKU1', quantity: 5, lotNumber: 'L1' }),
      makeInventoryRecord({ locationId: a.id, itemCode: 'SKU1', quantity: 3, lotNumber: 'L2' }),
      makeInventoryRecord({ locationId: b.id, itemCode: 'SKU2', quantity: 9 }),
    ];
    const hits = findItemLocations({ query: 'SKU1', inventory, locations: [a, b] });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.quantity).toBe(8);
    expect(hits[0]?.lots.sort()).toEqual(['L1', 'L2']);
  });
});

describe('utilization & stock', () => {
  it('summarises utilization and stock views', () => {
    const full = loc('A-01', { capacity: { maxPallets: null, maxUnits: 10, maxWeight: null, maxVolume: null } });
    const empty = loc('A-02');
    const inventory = [makeInventoryRecord({ locationId: full.id, itemCode: 'SKU1', quantity: 10 })];
    const occupancy = buildOccupancyIndex([full, empty], inventory, []);

    const util = utilizationByZone([full, empty], [], occupancy);
    expect(util[0]?.total).toBe(2);
    expect(util[0]?.full).toBe(1);
    expect(util[0]?.empty).toBe(1);

    expect(stockByLocation([full, empty], inventory)).toHaveLength(1);
    expect(locationByStock(inventory, [full, empty])[0]?.totalQuantity).toBe(10);
  });
});

describe('filterMovements', () => {
  const movements = [
    makeMovement({ type: 'PUTAWAY', itemCode: 'SKU1' }),
    makeMovement({ type: 'OUTBOUND', itemCode: 'SKU2', discrepancy: true }),
    makeMovement({ type: 'TRANSFER', itemCode: 'SKU1' }),
  ];

  it('filters by type, item, and discrepancy', () => {
    expect(filterMovements(movements, { type: 'PUTAWAY' })).toHaveLength(1);
    expect(filterMovements(movements, { itemCode: 'sku1' })).toHaveLength(2);
    expect(filterMovements(movements, { onlyDiscrepancies: true })).toHaveLength(1);
  });
});

describe('replenishment & expiry', () => {
  it('lists locations below minimum stock', () => {
    const low = loc('A-01', { replenishment: { minStock: 50, maxStock: null } });
    const ok = loc('A-02', { replenishment: { minStock: 5, maxStock: null } });
    const inventory = [
      makeInventoryRecord({ locationId: low.id, itemCode: 'SKU1', quantity: 10 }),
      makeInventoryRecord({ locationId: ok.id, itemCode: 'SKU1', quantity: 10 }),
    ];
    const rows = replenishmentList([low, ok], inventory);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.location.code).toBe('A-01');
  });

  it('reports stock expiring within a window, including overdue', () => {
    const a = loc('A-01');
    const inventory = [
      makeInventoryRecord({ locationId: a.id, itemCode: 'SKU1', quantity: 1, expiryDate: '2026-07-01T00:00:00.000Z' }),
      makeInventoryRecord({ locationId: a.id, itemCode: 'SKU2', quantity: 1, expiryDate: '2026-12-01T00:00:00.000Z' }),
    ];
    const rows = expiryReport({ inventory, locations: [a], withinDays: 30, today: '2026-06-26T00:00:00.000Z' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.record.itemCode).toBe('SKU1');
  });
});
