/**
 * Empty destination locations, grouped by section.
 *
 * Several flows (transfer, put-away) let the operator choose *where to place* an
 * item. This builds the pool they pick from: locations that are enabled, hold
 * stock, and are currently empty — grouped by their section (the warehouse area
 * they sit in) so the dropdown reads like the physical layout.
 *
 * Pure and side-effect-free so it is trivial to unit-test and shared by every
 * screen that needs a destination picker.
 */
import type { CellPurpose, Warehouse, WarehouseLocation } from '../types';
import { findArea, warehouseAreas } from './areas';
import type { LocationOccupancy } from './occupancy';
import { locationHoldsStock } from './occupancy';

/** One section (area) of the warehouse with its empty locations. */
export interface LocationSection {
  /** Stable key for React lists (`warehouseId:areaKey`). */
  key: string;
  /** Human label — the area name, or "Unassigned" when outside every area. */
  label: string;
  locations: WarehouseLocation[];
}

export interface EmptyLocationsInput {
  locations: readonly WarehouseLocation[];
  warehouses: readonly Warehouse[];
  /** Occupancy per location id (see `buildOccupancyIndex`). */
  occupancy: ReadonlyMap<string, LocationOccupancy>;
  purposesById?: Map<string, CellPurpose>;
  /** Never offer this location (e.g. the move's source). */
  excludeLocationId?: string | null;
}

/**
 * Whether a location can currently receive stock: enabled, storage, and holding
 * nothing at all.
 *
 * Emptiness is measured from the stock actually present — NOT from
 * `occupancyPct`. A percentage can read 0 while stock sits there: it is the max
 * of the ratios that have a configured maximum, so a bin with `maxPallets: 1`,
 * no `maxUnits`, and loose units on the floor reports 0%.
 */
export function isEmptyDestination(
  location: WarehouseLocation,
  occupancy: ReadonlyMap<string, LocationOccupancy>,
  purposesById?: Map<string, CellPurpose>,
): boolean {
  if (location.enabled === false) return false;
  if (!locationHoldsStock(location, purposesById)) return false;
  const here = occupancy.get(location.id);
  if (!here) return true; // nothing recorded against this location
  return here.units === 0 && here.pallets === 0 && here.weight === 0 && here.volume === 0;
}

/**
 * Group every empty destination by its section, sections and codes sorted so the
 * dropdown is stable and reads naturally (A-2 before A-10).
 */
export function groupEmptyLocationsBySection({
  locations,
  warehouses,
  occupancy,
  purposesById,
  excludeLocationId,
}: EmptyLocationsInput): LocationSection[] {
  const areasByWarehouse = new Map(
    warehouses.map((warehouse) => [warehouse.id, warehouseAreas(warehouse)]),
  );
  const groups = new Map<string, LocationSection>();

  for (const location of locations) {
    if (excludeLocationId && location.id === excludeLocationId) continue;
    if (!isEmptyDestination(location, occupancy, purposesById)) continue;

    const areas = areasByWarehouse.get(location.warehouseId) ?? [];
    const area = findArea(areas, location.column, location.row);
    const key = area
      ? `${location.warehouseId}:${area.groupId ?? area.id}`
      : `${location.warehouseId}:unassigned`;
    const existing = groups.get(key);
    if (existing) existing.locations.push(location);
    else groups.set(key, { key, label: area?.name ?? 'Unassigned', locations: [location] });
  }

  const sections = [...groups.values()];
  for (const section of sections) {
    section.locations.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }
  return sections.sort((a, b) => a.label.localeCompare(b.label));
}

/** Total empty locations across all sections. */
export function countEmptyLocations(sections: readonly LocationSection[]): number {
  return sections.reduce((sum, section) => sum + section.locations.length, 0);
}
