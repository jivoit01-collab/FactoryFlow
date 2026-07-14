import { useQuery } from '@tanstack/react-query';

import { vehicleHistoryApi } from './vehicle-history.api';

export const VEHICLE_HISTORY_QUERY_KEYS = {
  all: ['vehicle-history'] as const,
  byNumber: (vehicleNumber: string) =>
    [...VEHICLE_HISTORY_QUERY_KEYS.all, vehicleNumber] as const,
};

/** Fetches a vehicle's full history. `enabled` gates it until a number is submitted. */
export function useVehicleHistory(vehicleNumber: string, enabled: boolean) {
  return useQuery({
    queryKey: VEHICLE_HISTORY_QUERY_KEYS.byNumber(vehicleNumber),
    queryFn: () => vehicleHistoryApi.getByNumber(vehicleNumber),
    enabled: enabled && vehicleNumber.trim().length > 0,
    staleTime: 30 * 1000,
  });
}
