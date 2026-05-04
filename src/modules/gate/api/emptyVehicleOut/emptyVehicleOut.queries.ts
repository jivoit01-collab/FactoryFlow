import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type EmptyVehicleGateOutCreateRequest,
  type EmptyVehicleGateOutParams,
  emptyVehicleOutApi,
} from './emptyVehicleOut.api';

export const EMPTY_VEHICLE_OUT_QUERY_KEYS = {
  all: ['emptyVehicleOut'] as const,
  eligible: (params?: EmptyVehicleGateOutParams) =>
    [...EMPTY_VEHICLE_OUT_QUERY_KEYS.all, 'eligible', params] as const,
  list: (params?: EmptyVehicleGateOutParams) =>
    [...EMPTY_VEHICLE_OUT_QUERY_KEYS.all, 'list', params] as const,
};

export function useEmptyVehicleEligibleEntries(params?: EmptyVehicleGateOutParams) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.eligible(params),
    queryFn: () => emptyVehicleOutApi.eligibleEntries(params),
    staleTime: 30 * 1000,
  });
}

export function useEmptyVehicleGateOutEntries(params?: EmptyVehicleGateOutParams) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.list(params),
    queryFn: () => emptyVehicleOutApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateEmptyVehicleGateOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmptyVehicleGateOutCreateRequest) => emptyVehicleOutApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_OUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}
