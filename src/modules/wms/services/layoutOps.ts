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
import type { WarehouseBundle } from './warehouseIO';

type Axis = 'column' | 'row' | 'level';

/**
 * Recompute every location's code/barcode.
 *
 * With areas defined, each area is numbered from its corner, skipping disabled
 * cells so codes are gapless (see `buildAreaCodeMap`); cells outside every area
 * or disabled get a blank code. With no areas, the whole grid is numbered from
 * its origin (legacy behaviour).
 */
function rebuildCodes(bundle: WarehouseBundle): WarehouseBundle {
  const { warehouse } = bundle;
  const timestamp = nowIso();
  const seen = new Set<string>();
  const codeMap = warehouseAreas(warehouse).length
    ? buildAreaCodeMap(warehouse, bundle.locations)
    : null;
  const locations = bundle.locations.map((location) => {
    const generated = codeMap
      ? codeMap.get(location.id) ?? null
      : codeForCell(warehouse, location.column, location.row, location.level);
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

/** Append a new column / row / level of fresh locations at the end of the axis. */
export function addAxis(bundle: WarehouseBundle, axis: Axis): WarehouseBundle {
  const index = axisCount(bundle, axis);
  const warehouse = withAxisCount(bundle, axis, index + 1);

  const columns = warehouse.columns;
  const rows = warehouse.rows;
  const levels = warehouse.levels;

  const newLocations = [];
  for (let level = 0; level < levels; level += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const onNewAxis =
          (axis === 'column' && column === index) ||
          (axis === 'row' && row === index) ||
          (axis === 'level' && level === index);
        if (!onNewAxis) continue;
        newLocations.push(
          makeWarehouseLocation(warehouse.id, { code: '', barcode: '', column, row, level }),
        );
      }
    }
  }

  return rebuildCodes({
    warehouse,
    zones: bundle.zones,
    purposes: bundle.purposes,
    locations: [...bundle.locations, ...newLocations],
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

export const addColumn = (bundle: WarehouseBundle) => addAxis(bundle, 'column');
export const addRow = (bundle: WarehouseBundle) => addAxis(bundle, 'row');
export const addLevel = (bundle: WarehouseBundle) => addAxis(bundle, 'level');
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
