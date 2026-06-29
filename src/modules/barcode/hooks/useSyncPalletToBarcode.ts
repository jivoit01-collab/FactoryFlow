/**
 * Reverse write-bridge: push a Warehouse Ops pallet move to the barcode backend.
 *
 * The WMS persists its own pallet moves (`/wms/*`); when the pallet also exists
 * in the barcode module and the destination WMS warehouse maps to a SAP code,
 * this mirrors the move via `barcodeApi.movePallet` so both datasets agree.
 *
 * Lives in the barcode module because it owns `barcodeApi`; the WMS pages import
 * it. The import graph stays acyclic — `barcode/api` does not import the WMS.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useWmsCollection } from '@/modules/wms/store';

import { BARCODE_QUERY_KEYS, barcodeApi } from '../api';

export interface WmsPalletMove {
  /** WMS pallet license plate (matches the barcode `pallet_id`). */
  licensePlate: string;
  /** WMS destination warehouse id (resolved to its SAP code here). */
  warehouseId: string;
  /** WMS destination location/bin code. */
  binCode: string;
}

export type BarcodeSyncResult =
  | { synced: true }
  | { synced: false; reason: 'no-sap-code' | 'not-in-barcode' };

export function useSyncPalletToBarcode() {
  const qc = useQueryClient();
  const { data: warehouses } = useWmsCollection('warehouses');

  return useCallback(
    async (move: WmsPalletMove): Promise<BarcodeSyncResult> => {
      const warehouse = warehouses.find((w) => w.id === move.warehouseId);
      const sapCode = warehouse?.sapWarehouseCode?.trim();
      // No SAP mapping → this WMS warehouse isn't represented in the barcode
      // module, so there is nothing to push.
      if (!sapCode) return { synced: false, reason: 'no-sap-code' };

      const plate = move.licensePlate.trim();
      const matches = await barcodeApi.getPallets({ search: plate });
      const match = matches.find((p) => p.pallet_id.toLowerCase() === plate.toLowerCase());
      if (!match) return { synced: false, reason: 'not-in-barcode' };

      await barcodeApi.movePallet(match.id, {
        to_warehouse: sapCode,
        to_bin: move.binCode || undefined,
        notes: 'Synced from Warehouse Ops move',
      });
      qc.invalidateQueries({ queryKey: BARCODE_QUERY_KEYS.all });
      return { synced: true };
    },
    [qc, warehouses],
  );
}
