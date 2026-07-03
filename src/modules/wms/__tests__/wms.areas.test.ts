import { describe, expect, it } from 'vitest';

import {
  boundingRect,
  buildOccupancyIndex,
  codeForCell,
  isOutside,
  makePallet,
  makeWarehouseArea,
  makeWarehouseLocation,
  outsideLocationIds,
  rebuildWarehouseCodes,
  validatePalletMove,
} from '../services';
import { DEFAULT_WMS_SETTINGS } from '../types';
import type { Warehouse, WarehouseLocation, WmsSettings } from '../types';

function wh(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 'wh',
    code: 'WH',
    name: 'W',
    description: '',
    enabled: true,
    columns: 5,
    rows: 5,
    levels: 1,
    namingScheme: {
      columnStyle: 'LETTERS',
      rowStyle: 'NUMBERS',
      levelStyle: 'NUMBERS',
      prefix: '',
      separator: '-',
    },
    createdAt: 'x',
    updatedAt: 'x',
    ...overrides,
  };
}

function loc(column: number, row: number, level = 0): WarehouseLocation {
  return makeWarehouseLocation('wh', { code: '', barcode: '', column, row, level });
}

describe('codeForCell', () => {
  it('numbers the whole grid from its origin when no areas are defined', () => {
    const w = wh();
    expect(codeForCell(w, 0, 0, 0)).toBe('A-01');
    expect(codeForCell(w, 4, 1, 0)).toBe('E-02');
  });

  it('numbers each area from its own corner', () => {
    const main = makeWarehouseArea({
      name: 'Main',
      color: '#000',
      startColumn: 4,
      startRow: 1,
      endColumn: 4,
      endRow: 4,
    });
    const w = wh({ areas: [main] });
    // The area's top-left (grid E-02) becomes A-01.
    expect(codeForCell(w, 4, 1, 0)).toBe('A-01');
    expect(codeForCell(w, 4, 2, 0)).toBe('A-02');
    // Cells outside every area have no code.
    expect(codeForCell(w, 0, 0, 0)).toBeNull();
  });

  it('prefixes a secondary area so its codes are distinct', () => {
    const side = makeWarehouseArea({
      name: 'Side',
      prefix: 'S',
      color: '#000',
      startColumn: 0,
      startRow: 0,
      endColumn: 2,
      endRow: 2,
    });
    expect(codeForCell(wh({ areas: [side] }), 0, 0, 0)).toBe('S-A-01');
    expect(codeForCell(wh({ areas: [side] }), 1, 0, 0)).toBe('S-B-01');
  });
});

describe('isOutside / outsideLocationIds', () => {
  const w = wh({
    areas: [
      makeWarehouseArea({ name: 'M', color: '#000', startColumn: 1, startRow: 1, endColumn: 3, endRow: 3 }),
    ],
  });

  it('flags cells that fall in no area', () => {
    expect(isOutside(w, 0, 0)).toBe(true);
    expect(isOutside(w, 2, 2)).toBe(false);
  });

  it('is empty when no areas are defined (legacy)', () => {
    expect(isOutside(wh(), 0, 0)).toBe(false);
    expect(outsideLocationIds(wh(), [loc(0, 0)]).size).toBe(0);
  });

  it('collects the outside location ids', () => {
    const inside = loc(2, 2);
    const outside = loc(0, 0);
    const ids = outsideLocationIds(w, [inside, outside]);
    expect(ids.has(outside.id)).toBe(true);
    expect(ids.has(inside.id)).toBe(false);
  });
});

describe('rebuildWarehouseCodes', () => {
  it('applies per-area codes and blanks cells outside every area', () => {
    const area = makeWarehouseArea({
      name: 'M',
      color: '#000',
      startColumn: 1,
      startRow: 0,
      endColumn: 2,
      endRow: 1,
    });
    const w = wh({ columns: 3, rows: 2, levels: 1, areas: [area] });
    const locations = [loc(0, 0), loc(1, 0), loc(2, 1)];
    const rebuilt = rebuildWarehouseCodes({ warehouse: w, zones: [], purposes: [], locations });
    const at = (c: number, r: number) => rebuilt.locations.find((l) => l.column === c && l.row === r)!;
    expect(at(0, 0).code).toBe(''); // outside
    expect(at(1, 0).code).toBe('A-01'); // area origin
    expect(at(2, 1).code).toBe('B-02');
    expect(at(1, 0).barcode).toBe('A-01');
  });
});

describe('occupancy excludes outside cells', () => {
  it('marks outside cells as not counted', () => {
    const w = wh({
      areas: [
        makeWarehouseArea({ name: 'M', color: '#000', startColumn: 1, startRow: 1, endColumn: 3, endRow: 3 }),
      ],
    });
    const inside = loc(2, 2);
    const outside = loc(0, 0);
    const outsideIds = outsideLocationIds(w, [inside, outside]);
    const index = buildOccupancyIndex([inside, outside], [], [], undefined, outsideIds);
    expect(index.get(outside.id)?.counted).toBe(false);
    expect(index.get(outside.id)?.occupancyPct).toBe(0);
    expect(index.get(inside.id)?.counted).toBe(true);
  });
});

describe('validatePalletMove rejects outside destinations', () => {
  const settings: WmsSettings = { ...DEFAULT_WMS_SETTINGS, masterEnabled: true, updatedAt: 'x' };

  it('fails when the destination is outside every area', () => {
    const result = validatePalletMove({
      settings,
      pallet: makePallet({ licensePlate: 'PLT-1', itemCode: 'SKU1', boxCount: 1 }),
      destination: loc(0, 0),
      inventory: [],
      pallets: [],
      destinationOutside: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'outside_area')).toBe(true);
  });
});

describe('boundingRect', () => {
  it('computes the inclusive rectangle of a set of cells', () => {
    expect(
      boundingRect([
        { column: 2, row: 5 },
        { column: 1, row: 3 },
        { column: 4, row: 4 },
      ]),
    ).toEqual({ startColumn: 1, startRow: 3, endColumn: 4, endRow: 5 });
  });

  it('returns null for an empty selection', () => {
    expect(boundingRect([])).toBeNull();
  });
});
