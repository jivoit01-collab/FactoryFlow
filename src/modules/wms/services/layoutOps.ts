/**
 * Structural editing operations for a saved warehouse (Step 3).
 *
 * Each function is a pure transform of a `WarehouseBundle` → a new bundle, so
 * they compose cleanly with the editor's undo/redo history (every edit is just
 * "replace the bundle with this next one"). Location codes are kept in sync with
 * the naming scheme after any structural change; a per-location manual rename
 * (`renameLocation`) is the one edit that sets a custom code and is therefore
 * NOT a structural op.
 */
import type { WmsId } from '../types';
import { nowIso } from '../utils';
import { buildAreaCodeMap, codeForCell, warehouseAreas } from './areas';
import { makeWarehouseLocation } from './factories';
import { locationHoldsStock } from './occupancy';
import type { WarehouseBundle } from './warehouseIO';

type Axis = 'column' | 'row' | 'level';

/** Which end of an axis a new slice is inserted on. */
export type AxisSide = 'start' | 'end';

/**
 * Recompute every location's code/barcode.
 *
 * Only cells that hold stock are named. With areas defined, each area is
 * numbered from its corner, skipping disabled and non-storage cells so codes are
 * gapless (see `buildAreaCodeMap`); cells outside every area get a blank code.
 * With no areas, the whole grid is numbered from its origin (legacy behaviour),
 * still blanking non-storage cells (paths, gates, cabins).
 */
function rebuildCodes(bundle: WarehouseBundle): WarehouseBundle {
  const { warehouse } = bundle;
  const timestamp = nowIso();
  const seen = new Set<string>();
  const purposesById = new Map(bundle.purposes.map((purpose) => [purpose.id, purpose]));
  const codeMap = warehouseAreas(warehouse).length
    ? buildAreaCodeMap(warehouse, bundle.locations, purposesById)
    : null;
  const locations = bundle.locations.map((location) => {
    const generated = codeMap
      ? codeMap.get(location.id) ?? null
      : locationHoldsStock(location, purposesById)
        ? codeForCell(warehouse, location.column, location.row, location.level)
        : null; // non-storage cell with no areas → no code
    if (generated == null) {
      return { ...location, code: '', barcode: '', updatedAt: timestamp };
    }
    let code = generated;
    if (seen.has(code)) {
      let suffix = 2;
      while (seen.has(`${code}#${suffix}`)) suffix += 1;
      code = `${code}#${suffix}`;
    }
    seen.add(code);
    return { ...location, code, barcode: code, updatedAt: timestamp };
  });
  return { ...bundle, locations };
}

/** Rebuild every code (public entry for area edits that change numbering). */
export function rebuildWarehouseCodes(bundle: WarehouseBundle): WarehouseBundle {
  return rebuildCodes(bundle);
}

function axisCount(bundle: WarehouseBundle, axis: Axis): number {
  if (axis === 'column') return bundle.warehouse.columns;
  if (axis === 'row') return bundle.warehouse.rows;
  return bundle.warehouse.levels;
}

function withAxisCount(bundle: WarehouseBundle, axis: Axis, count: number): WarehouseBundle['warehouse'] {
  const key = axis === 'column' ? 'columns' : axis === 'row' ? 'rows' : 'levels';
  return { ...bundle.warehouse, [key]: count, updatedAt: nowIso() };
}

/**
 * Insert a new column / row / level of fresh locations. `side` picks which end
 * of the axis the new slice lands on: 'end' (default) appends after the last
 * slice; 'start' prepends before the first, shifting every existing cell — and
 * any area that references a column/row index — up by one to make room. Grid
 * index 0 is the top-left, so 'start' means left (columns) / top (rows).
 */
export function addAxis(bundle: WarehouseBundle, axis: Axis, side: AxisSide = 'end'): WarehouseBundle {
  const count = axisCount(bundle, axis);
  const warehouse = withAxisCount(bundle, axis, count + 1);
  const insertAt = side === 'start' ? 0 : count;
  // Anything at/after the insertion point moves up one slice; earlier cells stay.
  const shift = (value: number) => (value >= insertAt ? value + 1 : value);

  const columns = warehouse.columns;
  const rows = warehouse.rows;
  const levels = warehouse.levels;

  // Slide the existing cells to make room for the inserted slice (a no-op when
  // appending, since nothing sits at/after the end index).
  const existing = bundle.locations.map((location) => {
    if (axis === 'column') return { ...location, column: shift(location.column) };
    if (axis === 'row') return { ...location, row: shift(location.row) };
    return { ...location, level: shift(location.level) };
  });

  const newLocations = [];
  for (let level = 0; level < levels; level += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const onNewAxis =
          (axis === 'column' && column === insertAt) ||
          (axis === 'row' && row === insertAt) ||
          (axis === 'level' && level === insertAt);
        if (!onNewAxis) continue;
        newLocations.push(
          makeWarehouseLocation(warehouse.id, { code: '', barcode: '', column, row, level }),
        );
      }
    }
  }

  // Keep areas aligned with their cells when prepending. Levels don't affect
  // areas (an area spans every level), so only column/row bounds shift.
  const areas = (warehouse.areas ?? []).map((area) => {
    if (axis === 'column') return { ...area, startColumn: shift(area.startColumn), endColumn: shift(area.endColumn) };
    if (axis === 'row') return { ...area, startRow: shift(area.startRow), endRow: shift(area.endRow) };
    return area;
  });

  return rebuildCodes({
    warehouse: { ...warehouse, areas },
    zones: bundle.zones,
    purposes: bundle.purposes,
    locations: [...existing, ...newLocations],
  });
}

/**
 * Remove a column / row / level at `index`, then compact the remaining cells so
 * the grid stays contiguous (cells beyond the removed slice shift down by one).
 * The last remaining slice on an axis cannot be removed.
 */
export function removeAxis(bundle: WarehouseBundle, axis: Axis, index: number): WarehouseBundle {
  const count = axisCount(bundle, axis);
  if (count <= 1) return bundle; // never delete the final column/row/level

  const warehouse = withAxisCount(bundle, axis, count - 1);
  const pos = (location: { column: number; row: number; level: number }) => location[axis];

  const locations = bundle.locations
    .filter((location) => pos(location) !== index)
    .map((location) => {
      if (pos(location) <= index) return location;
      const shifted = pos(location) - 1;
      if (axis === 'column') return { ...location, column: shifted };
      if (axis === 'row') return { ...location, row: shifted };
      return { ...location, level: shifted };
    });

  return rebuildCodes({ warehouse, zones: bundle.zones, purposes: bundle.purposes, locations });
}

export const addColumn = (bundle: WarehouseBundle, side: AxisSide = 'end') => addAxis(bundle, 'column', side);
export const addRow = (bundle: WarehouseBundle, side: AxisSide = 'end') => addAxis(bundle, 'row', side);
export const addLevel = (bundle: WarehouseBundle, side: AxisSide = 'end') => addAxis(bundle, 'level', side);
export const removeColumn = (bundle: WarehouseBundle, index: number) => removeAxis(bundle, 'column', index);
export const removeRow = (bundle: WarehouseBundle, index: number) => removeAxis(bundle, 'row', index);
export const removeLevel = (bundle: WarehouseBundle, index: number) => removeAxis(bundle, 'level', index);

/** Set a custom code/barcode on a single location (manual rename). */
export function renameLocation(
  bundle: WarehouseBundle,
  locationId: WmsId,
  code: string,
): WarehouseBundle {
  const trimmed = code.trim();
  const timestamp = nowIso();
  const locations = bundle.locations.map((location) =>
    location.id === locationId
      ? { ...location, code: trimmed, barcode: trimmed, updatedAt: timestamp }
      : location,
  );
  return { ...bundle, locations };
}
