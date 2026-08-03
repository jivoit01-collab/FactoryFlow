import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateTruckDispatchUpdateRequest,
  type DispatchSummaryFilters,
  type DispatchTrackingFilters,
  dispatchTrackingApi,
} from './dispatch-tracking.api';

export const DISPATCH_TRACKING_QUERY_KEYS = {
  all: ['dispatchTracking'] as const,
  lists: () => [...DISPATCH_TRACKING_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: DispatchTrackingFilters) =>
    [...DISPATCH_TRACKING_QUERY_KEYS.lists(), filters ?? {}] as const,
  updates: (arrivalId?: number | null) =>
    [...DISPATCH_TRACKING_QUERY_KEYS.all, 'updates', arrivalId] as const,
  summary: (filters?: DispatchSummaryFilters) =>
    [...DISPATCH_TRACKING_QUERY_KEYS.all, 'summary', filters ?? {}] as const,
};

/** Aggregate dispatch-tracking insight (status counts, funnel, late, KPIs). */
export function useDispatchTrackingSummary(filters?: DispatchSummaryFilters) {
  return useQuery({
    queryKey: DISPATCH_TRACKING_QUERY_KEYS.summary(filters),
    queryFn: () => dispatchTrackingApi.summary(filters),
    staleTime: 30 * 1000,
  });
}

/** Dispatched trucks (paginated) with their current post-dispatch status. */
export function useDispatchTrackingTrucks(filters?: DispatchTrackingFilters) {
  return useQuery({
    queryKey: DISPATCH_TRACKING_QUERY_KEYS.list(filters),
    queryFn: () => dispatchTrackingApi.list(filters),
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
      queryClient.invalidateQueries({ queryKey: DISPATCH_TRACKING_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: DISPATCH_TRACKING_QUERY_KEYS.updates(variables.arrivalId),
      });
    },
  });
}
