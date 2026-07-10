import { describe, expect, it } from 'vitest';

import {
  buildOccupancyIndex,
  countEmptyLocations,
  groupEmptyLocationsBySection,
  isEmptyDestination,
  makeCellPurpose,
  makeInventoryRecord,
  makeWarehouseArea,
  makeWarehouseLocation,
} from '../services';
import type { CellPurpose, Warehouse, WarehouseLocation } from '../types';

const rack = makeCellPurpose('wh', { name: 'Racking', color: '#22c55e', holdsStock: true });
const aisle = makeCellPurpose('wh', { name: 'Aisle', color: '#64748b', holdsStock: false });
const purposesById = new Map<string, CellPurpose>([
  [rack.id, rack],
  [aisle.id, aisle],
]);

/** Area "Bulk" covers columns 0-1; column 2 sits outside every area. */
const bulk = makeWarehouseArea({
  name: 'Bulk',
  color: '#000',
  startColumn: 0,
  startRow: 0,
  endColumn: 1,
  endRow: 1,
});

function wh(): Warehouse {
  return {
    id: 'wh',
    code: 'WH',
    name: 'Main',
    description: '',
    enabled: true,
    columns: 3,
    rows: 2,
    levels: 1,
    namingScheme: { columnStyle: 'LETTERS', rowStyle: 'NUMBERS', levelStyle: 'NUMBERS', prefix: '', separator: '-' },
    areas: [bulk],
    createdAt: 'x',
    updatedAt: 'x',
  };
}

function loc(code: string, column: number, row: number, overrides: Partial<WarehouseLocation> = {}) {
  return {
    ...makeWarehouseLocation('wh', { code, barcode: code, column, row, level: 0 }),
    purposeId: rack.id,
    ...overrides,
  };
}

describe('isEmptyDestination', () => {
  const empty = loc('A-01', 0, 0);
  const occupancy = buildOccupancyIndex([empty], [], [], purposesById);

  it('accepts an enabled, stock-holding, empty location', () => {
    expect(isEmptyDestination(empty, occupancy, purposesById)).toBe(true);
  });

  it('rejects a disabled location', () => {
    const off = { ...empty, enabled: false };
    expect(isEmptyDestination(off, occupancy, purposesById)).toBe(false);
  });

  it('rejects a non-storage location (aisle)', () => {
    const path = { ...empty, purposeId: aisle.id };
    expect(isEmptyDestination(path, occupancy, purposesById)).toBe(false);
  });

  it('rejects a location that already holds stock', () => {
    const full = loc('A-02', 0, 1);
    const occ = buildOccupancyIndex(
      [full],
      [makeInventoryRecord({ locationId: full.id, itemCode: 'SKU1', quantity: 5 })],
      [],
      purposesById,
    );
    expect(isEmptyDestination(full, occ, purposesById)).toBe(false);
  });
});

describe('groupEmptyLocationsBySection', () => {
  it('groups empty locations by their area, and outside cells as "Unassigned"', () => {
    const inArea1 = loc('A-01', 0, 0);
    const inArea2 = loc('B-01', 1, 0);
    const outside = loc('C-01', 2, 0);
    const locations = [outside, inArea2, inArea1]; // deliberately unsorted
    const occupancy = buildOccupancyIndex(locations, [], [], purposesById);

    const sections = groupEmptyLocationsBySection({
      locations,
      warehouses: [wh()],
      occupancy,
      purposesById,
    });

    expect(sections.map((s) => s.label)).toEqual(['Bulk', 'Unassigned']);
    expect(sections[0]!.locations.map((l) => l.code)).toEqual(['A-01', 'B-01']); // sorted
    expect(sections[1]!.locations.map((l) => l.code)).toEqual(['C-01']);
    expect(countEmptyLocations(sections)).toBe(3);
  });

  it('omits occupied, disabled, and non-storage locations', () => {
    const empty = loc('A-01', 0, 0);
    const occupied = loc('B-01', 1, 0);
    const disabled = loc('A-02', 0, 1, { enabled: false });
    const path = loc('B-02', 1, 1, { purposeId: aisle.id });
    const locations = [empty, occupied, disabled, path];
    const occupancy = buildOccupancyIndex(
      locations,
      [makeInventoryRecord({ locationId: occupied.id, itemCode: 'SKU1', quantity: 3 })],
      [],
      purposesById,
    );

    const sections = groupEmptyLocationsBySection({
      locations,
      warehouses: [wh()],
      occupancy,
      purposesById,
    });

    expect(countEmptyLocations(sections)).toBe(1);
    expect(sections[0]!.locations[0]!.code).toBe('A-01');
  });

  it('excludes the source location (never offer a move onto itself)', () => {
    const a = loc('A-01', 0, 0);
    const b = loc('B-01', 1, 0);
    const locations = [a, b];
    const occupancy = buildOccupancyIndex(locations, [], [], purposesById);

    const sections = groupEmptyLocationsBySection({
      locations,
      warehouses: [wh()],
      occupancy,
      purposesById,
      excludeLocationId: a.id,
    });

    expect(countEmptyLocations(sections)).toBe(1);
    expect(sections[0]!.locations[0]!.code).toBe('B-01');
  });

  it('sorts codes naturally (A-2 before A-10)', () => {
    const locations = [loc('A-10', 0, 0), loc('A-2', 1, 0)];
    const occupancy = buildOccupancyIndex(locations, [], [], purposesById);
    const sections = groupEmptyLocationsBySection({
      locations,
      warehouses: [wh()],
      occupancy,
      purposesById,
    });
    expect(sections[0]!.locations.map((l) => l.code)).toEqual(['A-2', 'A-10']);
  });
});
