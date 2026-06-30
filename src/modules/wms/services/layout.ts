/**
 * Pure layout-generation helpers for the warehouse designer (Step 3).
 *
 * Turns a grid spec (columns × rows × levels) plus a naming scheme into the set
 * of location payloads the designer persists. No storage / React here — just
 * deterministic functions that are easy to unit-test.
 */
import type { WarehouseNamingScheme } from '../types';

export type AxisStyle = 'LETTERS' | 'NUMBERS';

/** A single generated cell, before it becomes a persisted `WarehouseLocation`. */
export interface GeneratedLocation {
  code: string;
  barcode: string;
  column: number;
  row: number;
  level: number;
}

export interface LayoutParams {
  columns: number;
  rows: number;
  levels: number;
  naming: WarehouseNamingScheme;
}

/** Sensible default naming scheme for a new warehouse. */
export const DEFAULT_NAMING_SCHEME: WarehouseNamingScheme = {
  columnStyle: 'LETTERS',
  rowStyle: 'NUMBERS',
  levelStyle: 'NUMBERS',
  prefix: '',
  separator: '-',
};

/** Bijective base-26 column label: 0→A, 25→Z, 26→AA, 27→AB … */
function letters(index: number): string {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

/** 1-based, zero-padded number label sized to the largest index in the axis. */
function numbers(index: number, count: number): string {
  const width = Math.max(2, String(Math.max(count, 1)).length);
  return String(index + 1).padStart(width, '0');
}

/** Format one axis label (a column, row, or level) for the given style. */
export function axisLabel(style: AxisStyle, index: number, count: number): string {
  return style === 'LETTERS' ? letters(index) : numbers(index, count);
}

/**
 * Build the code for one location from its grid position. The level segment is
 * only appended when the warehouse has more than one level.
 */
export function buildLocationCode(params: LayoutParams, column: number, row: number, level: number): string {
  const { naming, columns, rows, levels } = params;
  const segments: string[] = [];
  if (naming.prefix.trim()) segments.push(naming.prefix.trim());
  segments.push(axisLabel(naming.columnStyle, column, columns));
  segments.push(axisLabel(naming.rowStyle, row, rows));
  if (levels > 1) segments.push(axisLabel(naming.levelStyle, level, levels));
  return segments.join(naming.separator || '-');
}

/** Total number of locations a spec will generate. */
export function countLocations(params: Pick<LayoutParams, 'columns' | 'rows' | 'levels'>): number {
  return Math.max(0, params.columns) * Math.max(0, params.rows) * Math.max(0, params.levels);
}

/**
 * Generate every location for a layout, ordered level → row → column. Codes are
 * de-duplicated defensively so an odd naming scheme can never create clashes.
 */
export function generateLayout(params: LayoutParams): GeneratedLocation[] {
  const columns = Math.max(0, Math.floor(params.columns));
  const rows = Math.max(0, Math.floor(params.rows));
  const levels = Math.max(0, Math.floor(params.levels));

  const result: GeneratedLocation[] = [];
  const seen = new Set<string>();

  for (let level = 0; level < levels; level += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        let code = buildLocationCode(params, column, row, level);
        if (seen.has(code)) {
          let suffix = 2;
          while (seen.has(`${code}#${suffix}`)) suffix += 1;
          code = `${code}#${suffix}`;
        }
        seen.add(code);
        result.push({ code, barcode: code, column, row, level });
      }
    }
  }
  return result;
}

/** Validate a layout spec; returns a human-readable error or null. */
export function validateLayoutParams(params: {
  columns: number;
  rows: number;
  levels: number;
}): string | null {
  if (!Number.isFinite(params.columns) || params.columns < 1) return 'Columns must be at least 1.';
  if (!Number.isFinite(params.rows) || params.rows < 1) return 'Rows must be at least 1.';
  if (!Number.isFinite(params.levels) || params.levels < 1) return 'Levels must be at least 1.';
  if (countLocations(params) > 5000) {
    return 'That is over 5000 locations — reduce the grid size.';
  }
  return null;
}
