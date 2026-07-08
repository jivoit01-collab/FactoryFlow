import { describe, expect, it } from 'vitest';

import {
  boundingRect,
  buildAreaCodeMap,
  buildOccupancyIndex,
  codeForCell,
  isOutside,
  makeCellPurpose,
  makePallet,
  makeWarehouseArea,
  makeWarehouseLocation,
  outsideLocationIds,
  rebuildWarehouseCodes,
  rectsOverlap,
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

describe('buildAreaCodeMap — continuous numbering that skips disabled cells', () => {
  it('numbers only enabled cells, so codes stay gapless across a disabled band', () => {
    const area = makeWarehouseArea({
      name: 'Main',
      color: '#000',
      startColumn: 0,
      startRow: 0,
      endColumn: 0,
      endRow: 4,
    });
    const w = wh({ columns: 1, rows: 5, levels: 1, areas: [area] });
    const cells = [
      loc(0, 0),
      loc(0, 1),
      { ...loc(0, 2), enabled: false }, // wall / aisle
      loc(0, 3),
      loc(0, 4),
    ];
    const map = buildAreaCodeMap(w, cells);
    const at = (r: number) => map.get(cells[r]!.id);
    expect(at(0)).toBe('A-01');
    expect(at(1)).toBe('A-02');
    expect(at(2)).toBeNull(); // disabled → no code
    expect(at(3)).toBe('A-03'); // continues from A-02, NOT A-04
    expect(at(4)).toBe('A-04');
  });

  it('leaves cells outside every area uncoded', () => {
    const area = makeWarehouseArea({
      name: 'Main',
      color: '#000',
      startColumn: 1,
      startRow: 1,
      endColumn: 2,
      endRow: 2,
    });
    const inside = loc(1, 1);
    const outside = loc(0, 0);
    const map = buildAreaCodeMap(wh({ areas: [area] }), [inside, outside]);
    expect(map.get(inside.id)).toBe('A-01');
    expect(map.get(outside.id)).toBeNull();
  });

  it('names only stock-holding cells, staying gapless across a non-storage cell', () => {
    const area = makeWarehouseArea({
      name: 'Main',
      color: '#000',
      startColumn: 0,
      startRow: 0,
      endColumn: 0,
      endRow: 4,
    });
    const w = wh({ columns: 1, rows: 5, levels: 1, areas: [area] });
    const path = makeCellPurpose('wh', { name: 'Walkway', color: '#64748b', holdsStock: false });
    const rack = makeCellPurpose('wh', { name: 'Racking', color: '#22c55e', holdsStock: true });
    const purposesById = new Map([
      [path.id, path],
      [rack.id, rack],
    ]);
    const cells = [
      { ...loc(0, 0), purposeId: rack.id },
      { ...loc(0, 1), purposeId: rack.id },
      { ...loc(0, 2), purposeId: path.id }, // walkway — no name
      { ...loc(0, 3), purposeId: rack.id },
      { ...loc(0, 4) }, // no purpose → storage
    ];
    const map = buildAreaCodeMap(w, cells, purposesById);
    const at = (r: number) => map.get(cells[r]!.id);
    expect(at(0)).toBe('A-01');
    expect(at(1)).toBe('A-02');
    expect(at(2)).toBeNull(); // non-storage → no code
    expect(at(3)).toBe('A-03'); // continues from A-02, NOT A-04
    expect(at(4)).toBe('A-04');
  });

  it('numbers blocks that share a groupId continuously (one logical area)', () => {
    const blockA = makeWarehouseArea({
      name: 'FG',
      color: '#000',
      startColumn: 0,
      startRow: 0,
      endColumn: 0,
      endRow: 1,
    });
    // Second block joins the first (same groupId), sitting further down the column.
    const blockB = makeWarehouseArea({
      name: 'FG',
      color: '#000',
      groupId: blockA.groupId,
      startColumn: 0,
      startRow: 3,
      endColumn: 0,
      endRow: 4,
    });
    const w = wh({ columns: 1, rows: 5, levels: 1, areas: [blockA, blockB] });
    const cells = [loc(0, 0), loc(0, 1), loc(0, 3), loc(0, 4)];
    const map = buildAreaCodeMap(w, cells);
    // Numbering flows across both blocks: A-01, A-02, then A-03, A-04 (not restarting).
    expect(map.get(cells[0]!.id)).toBe('A-01');
    expect(map.get(cells[1]!.id)).toBe('A-02');
    expect(map.get(cells[2]!.id)).toBe('A-03');
    expect(map.get(cells[3]!.id)).toBe('A-04');
  });
});

describe('rectsOverlap', () => {
  const a = { startColumn: 0, startRow: 0, endColumn: 2, endRow: 2 };
  it('detects overlapping rectangles (including shared edge)', () => {
    expect(rectsOverlap(a, { startColumn: 2, startRow: 2, endColumn: 4, endRow: 4 })).toBe(true);
  });
  it('detects separated rectangles', () => {
    expect(rectsOverlap(a, { startColumn: 3, startRow: 0, endColumn: 5, endRow: 2 })).toBe(false);
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
