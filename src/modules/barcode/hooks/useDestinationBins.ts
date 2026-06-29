/**
 * Bridges the barcode transfer flows to the Warehouse Ops (WMS) module.
 *
 * A barcode transfer chooses a destination warehouse by its SAP code. If that
 * code maps to an internally-managed ("own") Warehouse Ops warehouse, the
 * operator must also pick a specific location/bin inside it; if it maps to an
 * external SAP warehouse (or no Warehouse Ops warehouse at all), the stock goes
 * straight in with no bin prompt.
 *
 * This hook resolves, for a given destination warehouse code, whether a bin is
 * required and the list of bins to choose from.
 */
import { useMemo } from 'react';

import { useWmsCollection } from '@/modules/wms/store';

export interface BinOption {
  id: string;
  code: string;
}

export interface DestinationBins {
  /** True when the destination is an own (WMS-managed) warehouse with internal locations. */
  isOwnWarehouse: boolean;
  /** Name of the matched own warehouse, for display. */
  warehouseName: string | null;
  /** Selectable, enabled bins inside the own warehouse. */
  bins: BinOption[];
}

export function useDestinationBins(destinationWarehouseCode: string | null | undefined): DestinationBins {
  const { data: warehouses } = useWmsCollection('warehouses');
  const { data: locations } = useWmsCollection('locations');

  return useMemo(() => {
    const empty: DestinationBins = { isOwnWarehouse: false, warehouseName: null, bins: [] };
    if (!destinationWarehouseCode) return empty;

    // An own warehouse is one with internal locations (type OWN, or legacy/absent)
    // whose SAP code matches the chosen destination.
    const own = warehouses.find(
      (warehouse) =>
        (warehouse.type ?? 'OWN') === 'OWN' &&
        warehouse.sapWarehouseCode === destinationWarehouseCode,
    );
    if (!own) return empty;

    const bins = locations
      .filter((location) => location.warehouseId === own.id && location.enabled)
      .map((location) => ({ id: location.id, code: location.code }))
      .sort((a, b) => a.code.localeCompare(b.code));

    return { isOwnWarehouse: true, warehouseName: own.name, bins };
  }, [destinationWarehouseCode, warehouses, locations]);
}
