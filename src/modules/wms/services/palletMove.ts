/**
 * Pallet-move validation helper.
 *
 * Wraps the shared `validateMove` engine for the common "move a whole pallet into
 * a location" case, so scan-driven moves on the map and detail panel validate
 * identically to the Transfer screen without re-assembling a `MoveItem`. Pure.
 */
import type {
  CellPurpose,
  InventoryRecord,
  MaterialWarehouseProfile,
  Pallet,
  WarehouseLocation,
  WmsSettings,
} from '../types';
import { locationHoldsStock } from './occupancy';
import { type MoveItem, validateMove, type ValidationResult } from './validation';

/** Build the validation `MoveItem` for a whole-pallet move. */
export function palletMoveItem(pallet: Pallet, profile?: MaterialWarehouseProfile): MoveItem {
  return {
    itemCode: pallet.itemCode,
    materialType: profile?.materialType ?? '',
    temperatureClass: profile?.temperatureClass ?? null,
    hazmatClass: profile?.hazmatClass ?? '',
    lotNumber: pallet.lotNumber,
    serialNumber: '',
    expiryDate: pallet.expiryDate,
  };
}

export interface ValidatePalletMoveParams {
  settings: WmsSettings;
  pallet: Pallet;
  profile?: MaterialWarehouseProfile;
  destination: WarehouseLocation;
  inventory: InventoryRecord[];
  pallets: Pallet[];
  /** Purpose lookup so non-storage destinations (paths, obstacles…) are rejected. */
  purposesById?: Map<string, CellPurpose>;
  /** True when the destination is outside every numbered area (rejects the move). */
  destinationOutside?: boolean;
}

/** Validate moving an entire pallet into `destination`. */
export function validatePalletMove(params: ValidatePalletMoveParams): ValidationResult {
  const { settings, pallet, profile, destination, inventory, pallets, purposesById, destinationOutside } = params;
  const destinationInventory = inventory.filter((record) => record.locationId === destination.id);
  // Don't count the pallet against its own destination capacity.
  const destinationPalletCount = pallets.filter(
    (p) => p.currentLocationId === destination.id && p.id !== pallet.id,
  ).length;

  return validateMove({
    settings,
    destination,
    destinationInventory,
    destinationPalletCount,
    item: palletMoveItem(pallet, profile),
    quantity: pallet.totalUnits ?? 1,
    added: { pallets: 1, units: pallet.totalUnits ?? 0, weight: 0, volume: 0 },
    destinationHoldsStock: locationHoldsStock(destination, purposesById),
    destinationCounted: !destinationOutside,
  });
}
