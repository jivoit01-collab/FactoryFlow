/**
 * Warehouse export / import (Step 3 "export for backup, import from file").
 *
 * A backup is a self-contained JSON bundle of one warehouse plus its locations
 * and zones. Import re-keys every record with fresh ids (and re-links zone
 * references) so a bundle can be restored repeatedly without clashing with
 * existing data. The same re-keying powers "clone a warehouse".
 */
import type { Warehouse, WarehouseLocation, Zone } from '../types';
import { createWmsId, nowIso } from '../utils';

export const WAREHOUSE_EXPORT_VERSION = 1;

export interface WarehouseBundle {
  warehouse: Warehouse;
  zones: Zone[];
  locations: WarehouseLocation[];
}

export interface WarehouseExport extends WarehouseBundle {
  version: number;
  exportedAt: string;
}

export function buildWarehouseExport(bundle: WarehouseBundle): WarehouseExport {
  return {
    version: WAREHOUSE_EXPORT_VERSION,
    exportedAt: nowIso(),
    ...bundle,
  };
}

/** Type-guard / parse of an untrusted imported object. Throws on bad shape. */
export function parseWarehouseExport(data: unknown): WarehouseBundle {
  if (!data || typeof data !== 'object') throw new Error('Not a valid warehouse file.');
  const candidate = data as Partial<WarehouseExport>;
  if (!candidate.warehouse || typeof candidate.warehouse !== 'object') {
    throw new Error('Warehouse file is missing its "warehouse" record.');
  }
  if (!Array.isArray(candidate.locations) || !Array.isArray(candidate.zones)) {
    throw new Error('Warehouse file is missing its locations or zones.');
  }
  return {
    warehouse: candidate.warehouse as Warehouse,
    zones: candidate.zones as Zone[],
    locations: candidate.locations as WarehouseLocation[],
  };
}

/**
 * Re-key a bundle onto a brand-new warehouse id, preserving the zone→location
 * links. Used by both clone and import. `rename` adjusts the warehouse name/code
 * so duplicates are distinguishable.
 */
export function rekeyWarehouseBundle(
  bundle: WarehouseBundle,
  rename: { name: string; code: string },
): WarehouseBundle {
  const timestamp = nowIso();
  const warehouseId = createWmsId();

  const warehouse: Warehouse = {
    ...bundle.warehouse,
    id: warehouseId,
    name: rename.name,
    code: rename.code,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const zoneIdMap = new Map<string, string>();
  const zones: Zone[] = bundle.zones.map((zone) => {
    const id = createWmsId();
    zoneIdMap.set(zone.id, id);
    return { ...zone, id, warehouseId, createdAt: timestamp, updatedAt: timestamp };
  });

  const locations: WarehouseLocation[] = bundle.locations.map((location) => ({
    ...location,
    id: createWmsId(),
    warehouseId,
    zoneId: location.zoneId ? zoneIdMap.get(location.zoneId) ?? null : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return { warehouse, zones, locations };
}
