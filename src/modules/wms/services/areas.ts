/**
 * Warehouse areas — per-area numbering.
 *
 * A warehouse can be divided into rectangular areas, each numbered from its own
 * top-left corner (`A-01`) and distinguished by a code prefix. Cells that fall
 * in no area are "outside": they carry no code and are excluded from occupancy,
 * moves, and putaway. When a warehouse has no areas the whole grid is numbered
 * from its origin, exactly as before (legacy behaviour).
 *
 * Pure and side-effect-free so it is trivial to unit-test and cheap to recompute.
 */
import type { Warehouse, WarehouseArea, WarehouseLocation } from '../types';
import { axisLabel, buildLocationCode } from './layout';

/** Whether a grid cell lies within an area (corners inclusive). */
export function areaContains(area: WarehouseArea, column: number, row: number): boolean {
  return (
    column >= area.startColumn &&
    column <= area.endColumn &&
    row >= area.startRow &&
    row <= area.endRow
  );
}

/** The first area covering a cell, or null when none does. */
export function findArea(
  areas: readonly WarehouseArea[],
  column: number,
  row: number,
): WarehouseArea | null {
  return areas.find((area) => areaContains(area, column, row)) ?? null;
}

/** The warehouse's areas (never undefined). */
export function warehouseAreas(warehouse: Pick<Warehouse, 'areas'>): WarehouseArea[] {
  return warehouse.areas ?? [];
}

/** Build the code for a cell inside a specific area, relative to its origin. */
function areaCode(
  warehouse: Warehouse,
  area: WarehouseArea,
  column: number,
  row: number,
  level: number,
): string {
  const naming = warehouse.namingScheme;
  const width = area.endColumn - area.startColumn + 1;
  const height = area.endRow - area.startRow + 1;
  const segments: string[] = [];
  const prefix = (area.prefix || '').trim() || (naming.prefix || '').trim();
  if (prefix) segments.push(prefix);
  segments.push(axisLabel(naming.columnStyle, column - area.startColumn, width));
  segments.push(axisLabel(naming.rowStyle, row - area.startRow, height));
  if (warehouse.levels > 1) segments.push(axisLabel(naming.levelStyle, level, warehouse.levels));
  return segments.join(naming.separator || '-');
}

/**
 * The code for a cell, or null when it is outside every area. With no areas
 * defined the whole grid is numbered from its origin (legacy behaviour).
 */
export function codeForCell(
  warehouse: Warehouse,
  column: number,
  row: number,
  level: number,
): string | null {
  const areas = warehouseAreas(warehouse);
  if (areas.length === 0) {
    return buildLocationCode(
      {
        columns: warehouse.columns,
        rows: warehouse.rows,
        levels: warehouse.levels,
        naming: warehouse.namingScheme,
      },
      column,
      row,
      level,
    );
  }
  const area = findArea(areas, column, row);
  return area ? areaCode(warehouse, area, column, row, level) : null;
}

/** Whether a cell is outside every area (only possible once areas are defined). */
export function isOutside(
  warehouse: Pick<Warehouse, 'areas'>,
  column: number,
  row: number,
): boolean {
  const areas = warehouseAreas(warehouse);
  return areas.length > 0 && findArea(areas, column, row) == null;
}

/** Ids of the locations that fall outside every area (empty when no areas). */
export function outsideLocationIds(
  warehouse: Pick<Warehouse, 'areas'>,
  locations: readonly WarehouseLocation[],
): Set<string> {
  const areas = warehouseAreas(warehouse);
  const ids = new Set<string>();
  if (areas.length === 0) return ids;
  for (const location of locations) {
    if (findArea(areas, location.column, location.row) == null) ids.add(location.id);
  }
  return ids;
}

/** Whether two grid rectangles overlap (corners inclusive). */
export function rectsOverlap(
  a: { startColumn: number; startRow: number; endColumn: number; endRow: number },
  b: { startColumn: number; startRow: number; endColumn: number; endRow: number },
): boolean {
  return !(
    a.endColumn < b.startColumn ||
    b.endColumn < a.startColumn ||
    a.endRow < b.startRow ||
    b.endRow < a.startRow
  );
}

/**
 * Build the code for every location, area-aware and **skipping disabled cells**.
 *
 * Within each area only enabled cells are numbered, consecutively: fully-disabled
 * rows and columns (walls, aisles) are skipped so codes stay gapless — e.g. the
 * cell after A-15 across a disabled band is A-16, not A-21. Disabled cells and
 * cells outside every area get `null` (no code). Each cell belongs to the first
 * area that contains it, so areas should not overlap.
 *
 * Returns a Map from location id to its code (or null). Empty when no areas are
 * defined — the caller then falls back to whole-grid numbering.
 */
export function buildAreaCodeMap(
  warehouse: Warehouse,
  locations: readonly WarehouseLocation[],
): Map<string, string | null> {
  const areas = warehouseAreas(warehouse);
  const result = new Map<string, string | null>();
  if (areas.length === 0) return result;

  const naming = warehouse.namingScheme;
  const groupKey = (area: WarehouseArea) => area.groupId ?? area.id;
  // Assign each location to the first area that contains it, then group blocks
  // that share a groupId so they number continuously as one area.
  const byGroup = new Map<string, { area: WarehouseArea; cells: WarehouseLocation[] }>();
  for (const location of locations) {
    const area = areas.find((a) => areaContains(a, location.column, location.row));
    if (!area) {
      result.set(location.id, null); // outside every area
      continue;
    }
    const key = groupKey(area);
    const group = byGroup.get(key);
    if (group) group.cells.push(location);
    else byGroup.set(key, { area, cells: [location] });
  }

  const isEnabled = (l: WarehouseLocation) => l.enabled !== false;

  for (const { area, cells } of byGroup.values()) {
    const enabled = cells.filter(isEnabled);
    // Counted rows/columns = those with at least one enabled cell (any level).
    const rows = [...new Set(enabled.map((c) => c.row))].sort((a, b) => a - b);
    const columns = [...new Set(enabled.map((c) => c.column))].sort((a, b) => a - b);
    const rowIndex = new Map(rows.map((r, i) => [r, i]));
    const colIndex = new Map(columns.map((c, i) => [c, i]));
    const prefix = (area.prefix || '').trim() || (naming.prefix || '').trim();

    for (const cell of cells) {
      if (!isEnabled(cell)) {
        result.set(cell.id, null); // disabled → no code
        continue;
      }
      const ci = colIndex.get(cell.column);
      const ri = rowIndex.get(cell.row);
      if (ci === undefined || ri === undefined) {
        result.set(cell.id, null);
        continue;
      }
      const segments: string[] = [];
      if (prefix) segments.push(prefix);
      segments.push(axisLabel(naming.columnStyle, ci, columns.length));
      segments.push(axisLabel(naming.rowStyle, ri, rows.length));
      if (warehouse.levels > 1) {
        segments.push(axisLabel(naming.levelStyle, cell.level, warehouse.levels));
      }
      result.set(cell.id, segments.join(naming.separator || '-'));
    }
  }

  return result;
}

/** Bounding rectangle (0-based inclusive) of a set of grid cells. */
export function boundingRect(
  cells: readonly { column: number; row: number }[],
): { startColumn: number; startRow: number; endColumn: number; endRow: number } | null {
  if (cells.length === 0) return null;
  let startColumn = cells[0]!.column;
  let endColumn = cells[0]!.column;
  let startRow = cells[0]!.row;
  let endRow = cells[0]!.row;
  for (const cell of cells) {
    if (cell.column < startColumn) startColumn = cell.column;
    if (cell.column > endColumn) endColumn = cell.column;
    if (cell.row < startRow) startRow = cell.row;
    if (cell.row > endRow) endRow = cell.row;
  }
  return { startColumn, startRow, endColumn, endRow };
}
