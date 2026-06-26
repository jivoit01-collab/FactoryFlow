/**
 * Directed putaway suggestion engine (Step 7).
 *
 * Ranks the locations a received item could go into. A candidate must first pass
 * the shared move-validation engine (so suggestions are always legal), then it
 * is scored on the factors the spec calls out: allowed material type, available
 * capacity, zone/temperature match, and pick optimization. Consolidating with
 * existing stock of the same item is preferred. Pure and testable.
 */
import type { InventoryRecord, Pallet, WarehouseLocation, WmsSettings } from '../types';
import { buildOccupancyIndex } from './occupancy';
import { validateMove, type MoveItem } from './validation';

export interface PutawaySuggestion {
  location: WarehouseLocation;
  score: number;
  occupancyPct: number;
}

export interface SuggestPutawayParams {
  settings: WmsSettings;
  item: MoveItem;
  quantity: number;
  added: { pallets: number; units: number; weight: number; volume: number };
  locations: WarehouseLocation[];
  inventory: InventoryRecord[];
  pallets: Pallet[];
  limit?: number;
}

export function suggestPutaway(params: SuggestPutawayParams): PutawaySuggestion[] {
  const { settings, item, quantity, added, locations, inventory, pallets } = params;

  const inventoryByLocation = new Map<string, InventoryRecord[]>();
  for (const record of inventory) {
    const list = inventoryByLocation.get(record.locationId);
    if (list) list.push(record);
    else inventoryByLocation.set(record.locationId, [record]);
  }
  const palletCountByLocation = new Map<string, number>();
  for (const pallet of pallets) {
    if (!pallet.currentLocationId) continue;
    palletCountByLocation.set(
      pallet.currentLocationId,
      (palletCountByLocation.get(pallet.currentLocationId) ?? 0) + 1,
    );
  }
  const occupancy = buildOccupancyIndex(locations, inventory, pallets);

  const suggestions: PutawaySuggestion[] = [];
  for (const location of locations) {
    const destinationInventory = inventoryByLocation.get(location.id) ?? [];
    const result = validateMove({
      settings,
      destination: location,
      destinationInventory,
      destinationPalletCount: palletCountByLocation.get(location.id) ?? 0,
      item,
      quantity,
      added,
    });
    if (!result.ok) continue;

    const occ = occupancy.get(location.id);
    let score = 0;

    // Consolidate with the same item already here.
    if (destinationInventory.some((record) => record.itemCode === item.itemCode)) score += 50;

    // Temperature fit.
    const temp = location.materialRules.temperatureClass;
    if (item.temperatureClass && temp === item.temperatureClass) score += 30;
    else if (!temp) score += 5;

    // Explicit allowed-type match (a purpose-built location beats a generic one).
    if (item.materialType && location.materialRules.allowedMaterialTypes.includes(item.materialType)) {
      score += 15;
    }

    // Prefer emptier locations (more headroom), capped.
    score += Math.max(0, 20 - (occ?.occupancyPct ?? 0) / 5);

    // Pick optimisation: prefer lower/front positions (smaller row + level).
    score += Math.max(0, 10 - (location.row + location.level));

    suggestions.push({ location, score, occupancyPct: occ?.occupancyPct ?? 0 });
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, params.limit ?? 5);
}
