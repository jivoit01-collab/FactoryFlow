/**
 * Write-bridge: mirror a barcode-module pallet move into the WMS dataset.
 *
 * The barcode module commits pallet moves to its own backend; this hook lets it
 * also reflect the move in Warehouse Ops when the destination resolves to a
 * WMS-managed ("own") warehouse + bin — so the pallet then appears on the map,
 * in reports, and in the outbound/transfer flows. Moves into external SAP
 * warehouses (or codes with no WMS warehouse) are intentionally skipped.
 *
 * It deliberately takes plain fields (not barcode-module types) so the WMS
 * module stays free of any dependency on the barcode module.
 */
import { useCallback } from 'react';

import { useWmsCollection } from './useWmsStore';
import { wmsStore } from './wmsStore';

/** Case-/whitespace-insensitive code comparison, used consistently for both the
 * warehouse SAP code and the bin code so the two halves of a lookup never
 * disagree (e.g. `BH-LP` vs `bh-lp`). */
function sameCode(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

export interface ExternalPalletPlacement {
  /** The pallet's license plate (barcode `pallet_id`). */
  licensePlate: string;
  /** Destination warehouse's SAP code, as chosen in the barcode move. */
  warehouseCode: string;
  /** Destination bin/location code inside the own warehouse. */
  binCode: string;
  itemCode: string;
  itemName?: string;
  lotNumber?: string;
  boxCount?: number;
  totalUnits?: number | null;
  uom?: string;
  expiryDate?: string | null;
}

export type MirrorResult =
  | { mirrored: true; warehouseName: string; locationCode: string }
  | { mirrored: false; reason: 'not-own-warehouse' | 'location-not-found' };

/**
 * Returns a function that mirrors one external pallet placement into the WMS.
 * Safe to call after every barcode move — it no-ops for non-WMS destinations.
 */
export function useWmsPalletMirror() {
  const { data: warehouses } = useWmsCollection('warehouses');
  const { data: locations } = useWmsCollection('locations');

  return useCallback(
    async (placement: ExternalPalletPlacement): Promise<MirrorResult> => {
      const own = warehouses.find(
        (warehouse) =>
          (warehouse.type ?? 'OWN') === 'OWN' &&
          sameCode(warehouse.sapWarehouseCode, placement.warehouseCode),
      );
      if (!own) return { mirrored: false, reason: 'not-own-warehouse' };

      const location = locations.find(
        (l) => l.warehouseId === own.id && sameCode(l.code, placement.binCode),
      );
      if (!location) return { mirrored: false, reason: 'location-not-found' };

      await wmsStore.syncExternalPalletPlacement({
        licensePlate: placement.licensePlate,
        toLocationId: location.id,
        itemCode: placement.itemCode,
        itemName: placement.itemName,
        lotNumber: placement.lotNumber,
        boxCount: placement.boxCount,
        totalUnits: placement.totalUnits,
        uom: placement.uom,
        expiryDate: placement.expiryDate,
        note: 'Synced from barcode pallet move',
      });

      return { mirrored: true, warehouseName: own.name, locationCode: location.code };
    },
    [warehouses, locations],
  );
}

/** Absolute snapshot of a barcode pallet, used to reconcile WMS state. */
export interface ExternalPalletSnapshot extends ExternalPalletPlacement {
  /** Whole-pallet box count after the change. */
  boxCount?: number;
  /** Whole-pallet unit quantity after the change. */
  totalUnits?: number | null;
}

export type SyncResult =
  | { synced: true; locationCode: string }
  | { synced: false; reason: 'not-own-warehouse' | 'location-not-found' };

/**
 * Returns a function that reconciles the WMS to an absolute barcode pallet
 * snapshot. Use after box transfers / splits where the pallet's contents change
 * (not just its location). When the destination is no longer a WMS-managed
 * warehouse, a pallet the WMS previously held is unplaced.
 */
export function useWmsPalletSync() {
  const { data: warehouses } = useWmsCollection('warehouses');
  const { data: locations } = useWmsCollection('locations');

  return useCallback(
    async (snapshot: ExternalPalletSnapshot): Promise<SyncResult> => {
      const own = warehouses.find(
        (warehouse) =>
          (warehouse.type ?? 'OWN') === 'OWN' &&
          sameCode(warehouse.sapWarehouseCode, snapshot.warehouseCode),
      );
      if (!own) {
        // Pallet moved to a warehouse the WMS doesn't manage — drop it if held.
        await wmsStore.removeExternalPallet({ licensePlate: snapshot.licensePlate });
        return { synced: false, reason: 'not-own-warehouse' };
      }

      const location = locations.find(
        (l) => l.warehouseId === own.id && sameCode(l.code, snapshot.binCode),
      );
      if (!location) return { synced: false, reason: 'location-not-found' };

      await wmsStore.reconcileExternalPallet({
        licensePlate: snapshot.licensePlate,
        toLocationId: location.id,
        itemCode: snapshot.itemCode,
        itemName: snapshot.itemName,
        lotNumber: snapshot.lotNumber,
        boxCount: snapshot.boxCount,
        totalUnits: snapshot.totalUnits,
        uom: snapshot.uom,
        expiryDate: snapshot.expiryDate,
      });
      return { synced: true, locationCode: location.code };
    },
    [warehouses, locations],
  );
}
