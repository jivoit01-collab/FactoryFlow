import { useQuery } from '@tanstack/react-query';

import { PRODUCTION_CONTROL_REFRESH_MS } from '../constants';
import { productionControlApi } from './production-control.api';

export const PRODUCTION_CONTROL_QUERY_KEYS = {
  all: ['production-control'] as const,
  occupancy: (warehouse: string) => ['production-control', 'occupancy', warehouse] as const,
  batches: (itemCode: string, warehouse: string) =>
    ['production-control', 'batches', itemCode, warehouse] as const,
};

/** A warehouse's stock, with the pack fields the pallet count needs. */
export function useWarehouseOccupancy(
  warehouse: string,
  enabled = true,
  itemGroups?: readonly number[],
) {
  return useQuery({
    // The groups are part of the key: a filtered answer and an unfiltered one
    // are different answers for the same warehouse.
    queryKey: [
      ...PRODUCTION_CONTROL_QUERY_KEYS.occupancy(warehouse),
      itemGroups?.join(',') ?? 'all',
    ] as const,
    queryFn: () => productionControlApi.getWarehouseOccupancy(warehouse, itemGroups),
    enabled: enabled && Boolean(warehouse),
    staleTime: PRODUCTION_CONTROL_REFRESH_MS,
    refetchInterval: PRODUCTION_CONTROL_REFRESH_MS,
  });
}

/**
 * One item's batches, fetched only once a reader opens the drill-down.
 *
 * Not polled: a batch list is a snapshot someone is reading, and refreshing it
 * under them would move rows while they look. It refetches when reopened.
 */
export function useItemBatches(itemCode: string | null, warehouse: string) {
  return useQuery({
    queryKey: PRODUCTION_CONTROL_QUERY_KEYS.batches(itemCode ?? '', warehouse),
    queryFn: () => productionControlApi.getItemBatches(itemCode!, warehouse),
    enabled: Boolean(itemCode) && Boolean(warehouse),
    staleTime: 60_000,
  });
}
