import { useQuery } from '@tanstack/react-query';

import { PRODUCTION_CONTROL_REFRESH_MS } from '../constants';
import { productionControlApi } from './production-control.api';

export const PRODUCTION_CONTROL_QUERY_KEYS = {
  all: ['production-control'] as const,
  occupancy: (warehouse: string) => ['production-control', 'occupancy', warehouse] as const,
};

/** A warehouse's stock, with the pack fields the pallet count needs. */
export function useWarehouseOccupancy(warehouse: string, enabled = true) {
  return useQuery({
    queryKey: PRODUCTION_CONTROL_QUERY_KEYS.occupancy(warehouse),
    queryFn: () => productionControlApi.getWarehouseOccupancy(warehouse),
    enabled: enabled && Boolean(warehouse),
    staleTime: PRODUCTION_CONTROL_REFRESH_MS,
    refetchInterval: PRODUCTION_CONTROL_REFRESH_MS,
  });
}
