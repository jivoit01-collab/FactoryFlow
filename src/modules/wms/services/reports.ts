/**
 * Reporting + search functions (Step 9).
 *
 * Pure, side-effect-free queries over the WMS records that power the report
 * screens: where-is-item search, utilization, stock-by-location and the inverse,
 * movement/audit history filtering, replenishment, and expiry. ("Find space"
 * reuses the putaway engine, so it is not duplicated here.)
 */
import type {
  InventoryRecord,
  MovementLogEntry,
  MovementType,
  WarehouseLocation,
  Zone,
} from '../types';
import type { LocationOccupancy } from './occupancy';

// -- Where is an item / lot --------------------------------------------------

export interface ItemLocationHit {
  location: WarehouseLocation;
  quantity: number;
  lots: string[];
}

export function findItemLocations(params: {
  query: string;
  inventory: InventoryRecord[];
  locations: WarehouseLocation[];
}): ItemLocationHit[] {
  const query = params.query.trim().toLowerCase();
  if (!query) return [];
  const locationById = new Map(params.locations.map((location) => [location.id, location]));

  const byLocation = new Map<string, { quantity: number; lots: Set<string> }>();
  for (const record of params.inventory) {
    const matches =
      record.itemCode.toLowerCase().includes(query) ||
      record.itemName.toLowerCase().includes(query) ||
      (record.lotNumber && record.lotNumber.toLowerCase().includes(query));
    if (!matches) continue;
    const entry = byLocation.get(record.locationId) ?? { quantity: 0, lots: new Set<string>() };
    entry.quantity += record.quantity;
    if (record.lotNumber) entry.lots.add(record.lotNumber);
    byLocation.set(record.locationId, entry);
  }

  const hits: ItemLocationHit[] = [];
  for (const [locationId, entry] of byLocation) {
    const location = locationById.get(locationId);
    if (location) hits.push({ location, quantity: entry.quantity, lots: [...entry.lots] });
  }
  return hits.sort((a, b) => b.quantity - a.quantity);
}

// -- Utilization -------------------------------------------------------------

export interface UtilizationRow {
  key: string;
  label: string;
  total: number;
  empty: number;
  occupied: number;
  full: number;
  avgOccupancy: number;
}

function summarise(
  key: string,
  label: string,
  locations: WarehouseLocation[],
  occupancy: Map<string, LocationOccupancy>,
): UtilizationRow {
  let empty = 0;
  let full = 0;
  let sum = 0;
  for (const location of locations) {
    const occ = occupancy.get(location.id);
    const pct = occ?.occupancyPct ?? 0;
    sum += pct;
    if (occ?.status === 'EMPTY') empty += 1;
    if (occ?.status === 'FULL') full += 1;
  }
  return {
    key,
    label,
    total: locations.length,
    empty,
    occupied: locations.length - empty,
    full,
    avgOccupancy: locations.length ? sum / locations.length : 0,
  };
}

export function utilizationByZone(
  locations: WarehouseLocation[],
  zones: Zone[],
  occupancy: Map<string, LocationOccupancy>,
): UtilizationRow[] {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const groups = new Map<string, WarehouseLocation[]>();
  for (const location of locations) {
    const key = location.zoneId ?? '__none__';
    const list = groups.get(key);
    if (list) list.push(location);
    else groups.set(key, [location]);
  }
  const rows: UtilizationRow[] = [];
  for (const [key, group] of groups) {
    const label = key === '__none__' ? 'No zone' : zoneById.get(key)?.name ?? 'Unknown zone';
    rows.push(summarise(key, label, group, occupancy));
  }
  return rows.sort((a, b) => b.total - a.total);
}

export function utilizationTotal(
  locations: WarehouseLocation[],
  occupancy: Map<string, LocationOccupancy>,
): UtilizationRow {
  return summarise('__all__', 'All locations', locations, occupancy);
}

// -- Stock by location / location by stock -----------------------------------

export interface StockByLocationRow {
  location: WarehouseLocation;
  lines: InventoryRecord[];
  totalUnits: number;
}

export function stockByLocation(
  locations: WarehouseLocation[],
  inventory: InventoryRecord[],
): StockByLocationRow[] {
  const byLocation = new Map<string, InventoryRecord[]>();
  for (const record of inventory) {
    const list = byLocation.get(record.locationId);
    if (list) list.push(record);
    else byLocation.set(record.locationId, [record]);
  }
  return locations
    .map((location) => {
      const lines = byLocation.get(location.id) ?? [];
      return { location, lines, totalUnits: lines.reduce((s, r) => s + r.quantity, 0) };
    })
    .filter((row) => row.lines.length > 0)
    .sort((a, b) => b.totalUnits - a.totalUnits);
}

export interface ItemStockRow {
  itemCode: string;
  itemName: string;
  totalQuantity: number;
  locations: { code: string; quantity: number }[];
}

export function locationByStock(
  inventory: InventoryRecord[],
  locations: WarehouseLocation[],
): ItemStockRow[] {
  const codeOf = new Map(locations.map((location) => [location.id, location.code]));
  const byItem = new Map<string, ItemStockRow>();
  for (const record of inventory) {
    const row =
      byItem.get(record.itemCode) ??
      { itemCode: record.itemCode, itemName: record.itemName, totalQuantity: 0, locations: [] };
    row.totalQuantity += record.quantity;
    row.locations.push({ code: codeOf.get(record.locationId) ?? '—', quantity: record.quantity });
    byItem.set(record.itemCode, row);
  }
  return [...byItem.values()].sort((a, b) => b.totalQuantity - a.totalQuantity);
}

// -- Movement / audit history -----------------------------------------------

export interface MovementFilter {
  type?: MovementType | 'ALL';
  itemCode?: string;
  locationId?: string;
  palletId?: string;
  user?: string;
  from?: string;
  to?: string;
  onlyDiscrepancies?: boolean;
}

export function filterMovements(
  movements: MovementLogEntry[],
  filter: MovementFilter,
): MovementLogEntry[] {
  const itemQuery = filter.itemCode?.trim().toLowerCase();
  const userQuery = filter.user?.trim().toLowerCase();
  return movements
    .filter((entry) => {
      if (filter.type && filter.type !== 'ALL' && entry.type !== filter.type) return false;
      if (itemQuery && !entry.itemCode.toLowerCase().includes(itemQuery) && !entry.itemName.toLowerCase().includes(itemQuery)) return false;
      if (filter.locationId && entry.fromLocationId !== filter.locationId && entry.toLocationId !== filter.locationId) return false;
      if (filter.palletId && entry.palletId !== filter.palletId) return false;
      if (userQuery && !entry.userName.toLowerCase().includes(userQuery)) return false;
      if (filter.from && entry.createdAt < filter.from) return false;
      if (filter.to && entry.createdAt > filter.to) return false;
      if (filter.onlyDiscrepancies && !entry.discrepancy) return false;
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// -- Replenishment -----------------------------------------------------------

export interface ReplenishmentRow {
  location: WarehouseLocation;
  currentUnits: number;
  minStock: number;
}

export function replenishmentList(
  locations: WarehouseLocation[],
  inventory: InventoryRecord[],
): ReplenishmentRow[] {
  const unitsByLocation = new Map<string, number>();
  for (const record of inventory) {
    unitsByLocation.set(record.locationId, (unitsByLocation.get(record.locationId) ?? 0) + record.quantity);
  }
  const rows: ReplenishmentRow[] = [];
  for (const location of locations) {
    const min = location.replenishment.minStock;
    if (min == null) continue;
    const current = unitsByLocation.get(location.id) ?? 0;
    if (current < min) rows.push({ location, currentUnits: current, minStock: min });
  }
  return rows.sort((a, b) => a.currentUnits - a.minStock - (b.currentUnits - b.minStock));
}

// -- Expiry ------------------------------------------------------------------

export interface ExpiryRow {
  record: InventoryRecord;
  location: WarehouseLocation | null;
  daysToExpiry: number;
}

const DAY_MS = 86_400_000;

export function expiryReport(params: {
  inventory: InventoryRecord[];
  locations: WarehouseLocation[];
  withinDays: number;
  today: string;
}): ExpiryRow[] {
  const locationById = new Map(params.locations.map((location) => [location.id, location]));
  const now = Date.parse(params.today);
  const rows: ExpiryRow[] = [];
  for (const record of params.inventory) {
    if (!record.expiryDate) continue;
    const days = Math.floor((Date.parse(record.expiryDate) - now) / DAY_MS);
    if (days <= params.withinDays) {
      rows.push({ record, location: locationById.get(record.locationId) ?? null, daysToExpiry: days });
    }
  }
  return rows.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}
