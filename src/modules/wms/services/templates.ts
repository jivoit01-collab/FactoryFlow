/**
 * Reusable layout templates (Step 3).
 *
 * `buildTemplate` snapshots a warehouse's grid + naming + zones (as cell sets)
 * into a portable blueprint; `instantiateTemplate` spawns a fresh warehouse
 * bundle from one. Zones are matched back onto generated locations by grid cell.
 */
import type {
  LayoutTemplate,
  Warehouse,
  WarehouseLocation,
  Zone,
  ZoneTemplate,
} from '../types';
import { createWmsId, nowIso } from '../utils';
import { generateLayout } from './layout';
import { makeWarehouseLocation, makeZone } from './factories';
import type { WarehouseBundle } from './warehouseIO';

const cellKey = (cell: { column: number; row: number; level: number }) =>
  `${cell.column}:${cell.row}:${cell.level}`;

/** Snapshot a warehouse bundle into a reusable template record. */
export function buildTemplate(name: string, bundle: WarehouseBundle): LayoutTemplate {
  const timestamp = nowIso();
  const zones: ZoneTemplate[] = bundle.zones.map((zone) => ({
    name: zone.name,
    type: zone.type,
    temperatureClass: zone.temperatureClass,
    color: zone.color,
    cells: bundle.locations
      .filter((location) => location.zoneId === zone.id)
      .map((location) => ({ column: location.column, row: location.row, level: location.level })),
  }));

  return {
    id: createWmsId(),
    name: name.trim(),
    columns: bundle.warehouse.columns,
    rows: bundle.warehouse.rows,
    levels: bundle.warehouse.levels,
    namingScheme: bundle.warehouse.namingScheme,
    zones,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Spawn a brand-new warehouse bundle from a template. */
export function instantiateTemplate(
  template: LayoutTemplate,
  opts: { name: string; code?: string },
): WarehouseBundle {
  const warehouseId = createWmsId();
  const timestamp = nowIso();

  const warehouse: Warehouse = {
    id: warehouseId,
    code: opts.code?.trim() || opts.name.trim().toUpperCase().replace(/\s+/g, '-'),
    name: opts.name.trim(),
    description: '',
    enabled: true,
    columns: template.columns,
    rows: template.rows,
    levels: template.levels,
    namingScheme: template.namingScheme,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Create zones and a cell → zoneId lookup.
  const zones: Zone[] = [];
  const cellToZone = new Map<string, string>();
  for (const zoneTemplate of template.zones) {
    const zone = makeZone(warehouseId, {
      name: zoneTemplate.name,
      type: zoneTemplate.type,
      temperatureClass: zoneTemplate.temperatureClass,
      color: zoneTemplate.color,
    });
    zones.push(zone);
    for (const cell of zoneTemplate.cells) cellToZone.set(cellKey(cell), zone.id);
  }

  const generated = generateLayout({
    columns: template.columns,
    rows: template.rows,
    levels: template.levels,
    naming: template.namingScheme,
  });
  const locations: WarehouseLocation[] = generated.map((cell) =>
    makeWarehouseLocation(warehouseId, cell, cellToZone.get(cellKey(cell)) ?? null),
  );

  return { warehouse, zones, locations };
}
