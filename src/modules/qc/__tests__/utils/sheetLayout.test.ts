import { describe, expect, it } from 'vitest';

import type { CellFields } from '../../types/qcRecord.types';
import {
  buildSheetGrid,
  cellCss,
  columnLetter,
  describeRefs,
  parseRef,
  printScale,
  refsInRect,
  signature,
  toDDMMYYYY,
  toRef,
} from '../../utils/sheetLayout';
import { sampleFields, sampleLayout } from './sheetFixtures';

describe('cell references', () => {
  it('converts between refs and coordinates', () => {
    expect(columnLetter(1)).toBe('A');
    expect(columnLetter(26)).toBe('Z');
    expect(columnLetter(27)).toBe('AA');
    expect(toRef(10, 4)).toBe('D10');
    expect(parseRef('AA7')).toEqual({ row: 7, col: 27 });
    expect(() => parseRef('nope')).toThrow();
  });
});

describe('buildSheetGrid', () => {
  it('turns merges into spans and skips the covered cells', () => {
    const grid = buildSheetGrid(sampleLayout(), sampleFields);
    const top = grid.rows[0].cells;
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({ ref: 'A1', colSpan: 4, rowSpan: 1 });
    expect(grid.width).toBe(250);
    expect(grid.height).toBe(100);
  });

  it('keeps boxed readings to their own cell', () => {
    const grid = buildSheetGrid(sampleLayout(), sampleFields);
    const readings = grid.rows[2].cells;
    expect(readings.map((cell) => [cell.ref, cell.colSpan])).toEqual([
      ['A3', 1],
      ['B3', 1],
      ['C3', 1],
      ['D3', 1],
    ]);
  });

  it('runs a loose field on over the empty cells to its right', () => {
    const grid = buildSheetGrid(sampleLayout(), sampleFields);
    const remarksRow = grid.rows[3].cells;
    expect(remarksRow.map((cell) => [cell.ref, cell.colSpan])).toEqual([
      ['A4', 1],
      ['B4', 3],
    ]);
  });

  it('stops the run at another field', () => {
    const fields: CellFields = { ...sampleFields, D4: { type: 'SIGN_APPROVED' } };
    const grid = buildSheetGrid(sampleLayout(), fields);
    expect(grid.rows[3].cells.map((cell) => [cell.ref, cell.colSpan])).toEqual([
      ['A4', 1],
      ['B4', 2],
      ['D4', 1],
    ]);
  });

  it('leaves hidden columns out of the drawing', () => {
    const layout = sampleLayout();
    layout.cols[2].hidden = true;
    const grid = buildSheetGrid(layout, {});
    expect(grid.cols.map((col) => col.col)).toEqual([1, 2, 4]);
    expect(grid.rows[0].cells[0].colSpan).toBe(3);
    expect(grid.rows[2].cells.map((cell) => cell.ref)).toEqual(['A3', 'B3', 'D3']);
    expect(grid.width).toBe(200);
  });

  it('lets a left-aligned label spill only into an empty neighbour', () => {
    const grid = buildSheetGrid(sampleLayout(), {});
    const remarks = grid.rows[3].cells.find((cell) => cell.ref === 'A4');
    expect(remarks?.spills).toBe(true);
    const param = grid.rows[1].cells.find((cell) => cell.ref === 'A2');
    expect(param?.spills).toBe(false);
  });
});

describe('cellCss', () => {
  it('maps the Excel look onto CSS at a zoom', () => {
    const grid = buildSheetGrid(sampleLayout(), sampleFields);
    const title = cellCss(grid.rows[0].cells[0], 0.5);
    expect(title.fontSize).toBe('16px'); // 24pt at 50%
    expect(title.fontWeight).toBe(700);
    expect(title.textAlign).toBe('center');
    expect(title.verticalAlign).toBe('middle');
    expect(title.fontFamily).toContain('Times New Roman');

    const box = cellCss(grid.rows[2].cells[1], 1);
    expect(box.borderLeft).toBe('1px solid #000');
    expect(box.borderBottom).toBe('1px solid #000');
    // Excel's defaults: bottom-aligned, text on the left.
    expect(box.verticalAlign).toBe('bottom');
    expect(box.textAlign).toBe('left');
  });
});

describe('selection helpers', () => {
  it('collects the drawn cells inside a rectangle', () => {
    const grid = buildSheetGrid(sampleLayout(), sampleFields);
    expect(refsInRect(grid, 'D3', 'B2')).toEqual(['B2', 'C2', 'D2', 'B3', 'C3', 'D3']);
    expect(describeRefs(['C3', 'B3', 'D3'])).toBe('B3:D3');
    expect(describeRefs(['B3'])).toBe('B3');
    expect(describeRefs([])).toBe('');
  });
});

describe('printing', () => {
  it('fills the page, stretching no more than 1.6x out of proportion', () => {
    // 250 x 50: the width fits 4.25x, the height 13.2x -> rows capped at 1.6x.
    const grid = { ...buildSheetGrid(sampleLayout(), {}), height: 50 };
    const scale = printScale(grid, 'landscape');
    expect(scale.x).toBeCloseTo(1062 / 250);
    expect(scale.y).toBeCloseTo((1062 / 250) * 1.6);
  });

  it('fills a tall sheet to both edges of one page', () => {
    // The oil plant record: 6960 x 6469 px at 100%.
    const grid = { ...buildSheetGrid(sampleLayout(), {}), width: 6960, height: 6469 };
    const scale = printScale(grid, 'landscape');
    expect(scale.y).toBeCloseTo(660 / 6469);
    expect(scale.x).toBeCloseTo(1062 / 6960);
  });

  it('lets a sheet far taller than the page run over pages instead', () => {
    const grid = { ...buildSheetGrid(sampleLayout(), {}), width: 1062, height: 2000 };
    expect(printScale(grid, 'landscape')).toEqual({ x: 1, y: 1 });
  });

  it('formats dates and signatures the way the forms write them', () => {
    expect(toDDMMYYYY('2026-09-26')).toBe('26-09-2026');
    expect(toDDMMYYYY(null)).toBe('');
    expect(signature('', '2026-09-26T08:10:00')).toBe('');
    expect(signature('Rajesh Kumar', null)).toBe('Rajesh Kumar');
    expect(signature('Rajesh Kumar', '2026-09-26T08:10:00')).toBe('Rajesh Kumar\n26-09-2026 08:10');
  });
});
