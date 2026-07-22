import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateTruckDispatchUpdateRequest,
  dispatchTrackingApi,
} from './dispatch-tracking.api';

export const DISPATCH_TRACKING_QUERY_KEYS = {
  all: ['dispatchTracking'] as const,
  list: () => [...DISPATCH_TRACKING_QUERY_KEYS.all, 'list'] as const,
  updates: (arrivalId?: number | null) =>
    [...DISPATCH_TRACKING_QUERY_KEYS.all, 'updates', arrivalId] as const,
};

/** Dispatched trucks with their current post-dispatch status. */
export function useDispatchTrackingTrucks() {
  return useQuery({
    queryKey: DISPATCH_TRACKING_QUERY_KEYS.list(),
    queryFn: () => dispatchTrackingApi.list(),
    staleTime: 15 * 1000,
  });
}

/** A single truck's post-dispatch status timeline. */
export function useTruckDispatchUpdates(arrivalId?: number | null) {
  return useQuery({
    queryKey: DISPATCH_TRACKING_QUERY_KEYS.updates(arrivalId),
    queryFn: () => dispatchTrackingApi.updates(arrivalId!),
    enabled: !!arrivalId,
    staleTime: 10 * 1000,
  });
}

export function useAddTruckDispatchUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      arrivalId,
      data,
    }: {
      arrivalId: number;
      data: CreateTruckDispatchUpdateRequest;
    }) => dispatchTrackingApi.addUpdate(arrivalId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: DISPATCH_TRACKING_QUERY_KEYS.list() });
      queryClient.invalidateQueries({
        queryKey: DISPATCH_TRACKING_QUERY_KEYS.updates(variables.arrivalId),
      });
    },
  });
}
