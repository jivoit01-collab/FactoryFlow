/** Reactive hooks for warehouses and a single warehouse's layout (Step 3). */
import { useMemo } from 'react';

import type { Warehouse, WarehouseLocation, WmsId, Zone } from '../types';
import { useWmsCollection } from './useWmsStore';

export function useWarehouses(): { warehouses: Warehouse[]; loading: boolean } {
  const { data, loading } = useWmsCollection('warehouses');
  return { warehouses: data, loading };
}

export interface WarehouseLayout {
  warehouse: Warehouse | null;
  zones: Zone[];
  locations: WarehouseLocation[];
  loading: boolean;
}

/** Everything needed to render/edit one warehouse, filtered from the caches. */
export function useWarehouseLayout(warehouseId: WmsId | null): WarehouseLayout {
  const warehouses = useWmsCollection('warehouses');
  const zones = useWmsCollection('zones');
  const locations = useWmsCollection('locations');

  return useMemo(() => {
    const warehouse = warehouseId
      ? warehouses.data.find((item) => item.id === warehouseId) ?? null
      : null;
    return {
      warehouse,
      zones: warehouseId ? zones.data.filter((zone) => zone.warehouseId === warehouseId) : [],
      locations: warehouseId
        ? locations.data.filter((location) => location.warehouseId === warehouseId)
        : [],
      loading: warehouses.loading || zones.loading || locations.loading,
    };
  }, [warehouseId, warehouses.data, warehouses.loading, zones.data, zones.loading, locations.data, locations.loading]);
}
