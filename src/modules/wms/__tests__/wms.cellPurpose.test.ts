import { describe, expect, it } from 'vitest';

import {
  buildLocationsCsv,
  buildOccupancyIndex,
  computeOccupancy,
  locationHoldsStock,
  makeCellPurpose,
  makeInventoryRecord,
  makePallet,
  makeWarehouseLocation,
  parseWarehouseCsv,
  suggestPutaway,
  validatePalletMove,
} from '../services';
import { DEFAULT_WMS_SETTINGS } from '../types';
import type { CellPurpose, MoveItem, Pallet, Warehouse, WarehouseLocation, WmsSettings } from '../types';

const settings: WmsSettings = { ...DEFAULT_WMS_SETTINGS, masterEnabled: true, updatedAt: 'x' };

function loc(code: string, overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code, barcode: code, column: 0, row: 0, level: 0 });
  return { ...base, ...overrides };
}

function pallet(overrides: Partial<Pallet> = {}): Pallet {
  return { ...makePallet({ licensePlate: 'PLT-1', itemCode: 'SKU1', boxCount: 4, totalUnits: 40 }), ...overrides };
}

const path: CellPurpose = makeCellPurpose('wh', { name: 'Walkway', color: '#64748b', holdsStock: false });
const damaged: CellPurpose = makeCellPurpose('wh', { name: 'Damaged goods', color: '#dc2626', holdsStock: true });
const purposesById = new Map<string, CellPurpose>([
  [path.id, path],
  [damaged.id, damaged],
]);

describe('locationHoldsStock', () => {
  it('treats a location with no purpose as storage', () => {
    expect(locationHoldsStock(loc('A-01'), purposesById)).toBe(true);
  });

  it('honours a non-storage purpose', () => {
    expect(locationHoldsStock(loc('A-02', { purposeId: path.id }), purposesById)).toBe(false);
    expect(locationHoldsStock(loc('A-03', { purposeId: damaged.id }), purposesById)).toBe(true);
  });

  it('falls back to storage when the purpose is missing', () => {
    expect(locationHoldsStock(loc('A-04', { purposeId: 'gone' }), purposesById)).toBe(true);
  });
});

describe('computeOccupancy with non-storage cells', () => {
  it('excludes a non-storage cell from occupancy even if stock lingers', () => {
    const cell = loc('A-01', { capacity: { maxPallets: 1, maxUnits: 10, maxWeight: null, maxVolume: null } });
    const occ = computeOccupancy(cell, [makeInventoryRecord({ locationId: cell.id, itemCode: 'SKU1', quantity: 8 })], [], false);
    expect(occ.isStorage).toBe(false);
    expect(occ.occupancyPct).toBe(0);
    expect(occ.status).toBe('EMPTY');
  });

  it('buildOccupancyIndex uses the purpose lookup', () => {
    const walk = loc('A-01', { purposeId: path.id });
    const rack = loc('A-02');
    const index = buildOccupancyIndex(
      [walk, rack],
      [makeInventoryRecord({ locationId: walk.id, itemCode: 'SKU1', quantity: 100 })],
      [],
      purposesById,
    );
    expect(index.get(walk.id)?.isStorage).toBe(false);
    expect(index.get(rack.id)?.isStorage).toBe(true);
  });
});

describe('validatePalletMove into non-storage cells', () => {
  it('rejects a move into a walkable path', () => {
    const result = validatePalletMove({
      settings,
      pallet: pallet(),
      destination: loc('A-01', { purposeId: path.id }),
      inventory: [],
      pallets: [],
      purposesById,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'not_storage')).toBe(true);
  });

  it('allows a move into a stock-holding purpose', () => {
    const result = validatePalletMove({
      settings,
      pallet: pallet(),
      destination: loc('A-02', { purposeId: damaged.id }),
      inventory: [],
      pallets: [],
      purposesById,
    });
    expect(result.ok).toBe(true);
  });
});

describe('suggestPutaway skips non-storage cells', () => {
  it('never suggests a walkable path', () => {
    const item: MoveItem = {
      itemCode: 'SKU1',
      materialType: '',
      temperatureClass: null,
      hazmatClass: '',
      lotNumber: '',
      serialNumber: '',
      expiryDate: null,
    };
    const walk = loc('A-01', { purposeId: path.id });
    const rack = loc('A-02');
    const suggestions = suggestPutaway({
      settings,
      item,
      quantity: 10,
      added: { pallets: 1, units: 10, weight: 0, volume: 0 },
      locations: [walk, rack],
      inventory: [],
      pallets: [],
      purposesById,
    });
    const ids = suggestions.map((s) => s.location.id);
    expect(ids).toContain(rack.id);
    expect(ids).not.toContain(walk.id);
  });
});

describe('CSV round-trip preserves purposes', () => {
  it('exports and re-imports a cell purpose with its holds-stock flag', () => {
    const walk = loc('A-01', { column: 0, row: 0, purposeId: path.id });
    const rack = loc('A-02', { column: 1, row: 0 });
    const warehouse: Warehouse = {
      id: 'wh',
      code: 'WH',
      name: 'Main',
      description: '',
      enabled: true,
      columns: 2,
      rows: 1,
      levels: 1,
      namingScheme: { columnStyle: 'LETTERS', rowStyle: 'NUMBERS', levelStyle: 'NUMBERS', prefix: '', separator: '-' },
      createdAt: 'x',
      updatedAt: 'x',
    };
    const csv = buildLocationsCsv({ warehouse, zones: [], purposes: [path], locations: [walk, rack] });

    const bundle = parseWarehouseCsv(csv, { name: 'Reimport' });
    const reimportedWalk = bundle.locations.find((l) => l.code === 'A-01');
    expect(bundle.purposes).toHaveLength(1);
    expect(bundle.purposes[0]?.name).toBe('Walkway');
    expect(bundle.purposes[0]?.holdsStock).toBe(false);
    expect(reimportedWalk?.purposeId).toBe(bundle.purposes[0]?.id);
  });
});
