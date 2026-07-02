/**
 * Occupancy engine (Step 5).
 *
 * Computes, for each location, the pallets / units / weight / volume in use from
 * the inventory + pallet records, an overall occupancy percentage (the highest
 * of the four ratios against their maxima), and the derived display status that
 * drives the map's colour. Pure and side-effect-free so it is easy to test and
 * cheap to recompute. Everything reads as empty until later steps add stock.
 */
import type { CellPurpose, InventoryRecord, Pallet, WarehouseLocation } from '../types';

export type DisplayStatus =
  | 'EMPTY'
  | 'PARTIAL'
  | 'NEARLY_FULL'
  | 'FULL'
  | 'RESERVED'
  | 'BLOCKED'
  | 'MAINTENANCE'
  | 'DISABLED';

export interface LocationOccupancy {
  pallets: number;
  units: number;
  weight: number;
  volume: number;
  /** Ratio 0..1+ for each dimension, or null when that dimension has no max. */
  palletRatio: number | null;
  unitRatio: number | null;
  weightRatio: number | null;
  volumeRatio: number | null;
  /** Highest of the available ratios, as a percentage (0 when nothing applies). */
  occupancyPct: number;
  status: DisplayStatus;
  /**
   * Whether this cell holds stock (from its purpose). Non-storage cells — paths,
   * obstacles, offices — are excluded from occupancy statistics and colouring.
   */
  isStorage: boolean;
}

/**
 * Whether a location holds stock, from its assigned purpose. A location with no
 * purpose (or a purpose that is missing/holds stock) is treated as storage, so
 * existing layouts behave exactly as before.
 */
export function locationHoldsStock(
  location: WarehouseLocation,
  purposesById?: Map<string, CellPurpose>,
): boolean {
  if (!location.purposeId || !purposesById) return true;
  const purpose = purposesById.get(location.purposeId);
  return purpose ? purpose.holdsStock : true;
}

/** Occupancy thresholds (percent). At/above FULL is treated as full. */
export const OCCUPANCY_THRESHOLDS = { partial: 0, nearlyFull: 70, full: 100 } as const;

export interface DisplayStatusMeta {
  label: string;
  color: string;
  hatch?: boolean;
}

/** Colour + label for every display status (the permanent legend reads this). */
export const DISPLAY_STATUS_META: Record<DisplayStatus, DisplayStatusMeta> = {
  EMPTY: { label: 'Empty', color: '#22c55e' },
  PARTIAL: { label: 'Partial', color: '#f59e0b' },
  NEARLY_FULL: { label: 'Nearly full', color: '#f97316' },
  FULL: { label: 'Full', color: '#ef4444' },
  RESERVED: { label: 'Reserved', color: '#3b82f6' },
  BLOCKED: { label: 'Blocked / damaged', color: '#991b1b' },
  MAINTENANCE: { label: 'Maintenance', color: '#8b5cf6' },
  DISABLED: { label: 'Disabled', color: '#9ca3af', hatch: true },
};

function ratio(used: number, max: number | null): number | null {
  if (max == null || max <= 0) return null;
  return used / max;
}

function occupancyStatus(pct: number): DisplayStatus {
  if (pct <= OCCUPANCY_THRESHOLDS.partial) return 'EMPTY';
  if (pct < OCCUPANCY_THRESHOLDS.nearlyFull) return 'PARTIAL';
  if (pct < OCCUPANCY_THRESHOLDS.full) return 'NEARLY_FULL';
  return 'FULL';
}

/** Compute occupancy for one location given the stock already filtered to it. */
export function computeOccupancy(
  location: WarehouseLocation,
  inventoryHere: InventoryRecord[],
  palletsHere: Pallet[],
  holdsStock = true,
): LocationOccupancy {
  const units = inventoryHere.reduce((sum, record) => sum + (record.quantity || 0), 0);
  const weight = inventoryHere.reduce((sum, record) => sum + (record.weight || 0), 0);
  const volume = inventoryHere.reduce((sum, record) => sum + (record.volume || 0), 0);
  const pallets = palletsHere.length;

  const palletRatio = ratio(pallets, location.capacity.maxPallets);
  const unitRatio = ratio(units, location.capacity.maxUnits);
  const weightRatio = ratio(weight, location.capacity.maxWeight);
  const volumeRatio = ratio(volume, location.capacity.maxVolume);

  const ratios = [palletRatio, unitRatio, weightRatio, volumeRatio].filter(
    (value): value is number => value != null,
  );
  const hasStock = units > 0 || pallets > 0 || weight > 0 || volume > 0;
  // If a dimension has a max, use the highest ratio; otherwise fall back to a
  // simple occupied/empty signal so stock without configured maxima still shows.
  const occupancyPct = ratios.length
    ? Math.max(...ratios) * 100
    : hasStock
      ? 50
      : 0;

  // Status precedence: manual lifecycle / reservation override occupancy colour.
  // Non-storage cells never derive an occupancy status from stock.
  let status: DisplayStatus;
  if (!location.enabled) status = 'DISABLED';
  else if (location.status === 'BLOCKED' || location.status === 'DAMAGED') status = 'BLOCKED';
  else if (location.status === 'MAINTENANCE') status = 'MAINTENANCE';
  else if (location.status === 'RESERVED' || location.reservation.isReserved) status = 'RESERVED';
  else if (!holdsStock) status = 'EMPTY';
  else status = occupancyStatus(occupancyPct);

  return {
    pallets,
    units,
    weight,
    volume,
    palletRatio,
    unitRatio,
    weightRatio,
    volumeRatio,
    occupancyPct: holdsStock ? occupancyPct : 0,
    status,
    isStorage: holdsStock,
  };
}

/**
 * Pallets physically at a location: those placed there (`currentLocationId`) OR
 * holding stock there (an inventory line at the location carrying their id).
 *
 * Using both sources means a pallet still shows where its stock actually is even
 * if its `currentLocationId` drifted from the inventory (e.g. legacy data from an
 * item-level move) — so the map/outbound never show "stock here but no pallet".
 */
export function palletsLocatedAt(
  locationId: string,
  pallets: Pallet[],
  inventory: InventoryRecord[],
): Pallet[] {
  const ids = new Set<string>();
  for (const pallet of pallets) {
    if (pallet.currentLocationId === locationId) ids.add(pallet.id);
  }
  for (const record of inventory) {
    if (record.locationId === locationId && record.palletId) ids.add(record.palletId);
  }
  const byId = new Map(pallets.map((pallet) => [pallet.id, pallet]));
  return [...ids]
    .map((id) => byId.get(id))
    .filter((pallet): pallet is Pallet => pallet != null);
}

/** Build an occupancy lookup for every location, grouping stock by location once. */
export function buildOccupancyIndex(
  locations: WarehouseLocation[],
  inventory: InventoryRecord[],
  pallets: Pallet[],
  purposesById?: Map<string, CellPurpose>,
): Map<string, LocationOccupancy> {
  const inventoryByLocation = new Map<string, InventoryRecord[]>();
  for (const record of inventory) {
    const list = inventoryByLocation.get(record.locationId);
    if (list) list.push(record);
    else inventoryByLocation.set(record.locationId, [record]);
  }
  const palletsByLocation = new Map<string, Pallet[]>();
  for (const pallet of pallets) {
    if (!pallet.currentLocationId) continue;
    const list = palletsByLocation.get(pallet.currentLocationId);
    if (list) list.push(pallet);
    else palletsByLocation.set(pallet.currentLocationId, [pallet]);
  }

  const index = new Map<string, LocationOccupancy>();
  for (const location of locations) {
    index.set(
      location.id,
      computeOccupancy(
        location,
        inventoryByLocation.get(location.id) ?? [],
        palletsByLocation.get(location.id) ?? [],
        locationHoldsStock(location, purposesById),
      ),
    );
  }
  return index;
}
