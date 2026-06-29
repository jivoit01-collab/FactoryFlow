import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DispatchLinkingFilters, DispatchVehicleLinkPayload } from '../types';
import { dispatchLinkingApi } from './dispatch-linking.api';

export const DISPATCH_LINKING_QUERY_KEYS = {
  all: ['vehicle-management', 'dispatch-linking'] as const,
  plans: (filters: DispatchLinkingFilters, companyId?: number | string) =>
    [
      ...DISPATCH_LINKING_QUERY_KEYS.all,
      'plans',
      companyId,
      {
        bucket: filters.bucket,
        date: filters.date,
        booking_status: filters.booking_status,
        search: filters.search,
        limit: filters.limit,
      },
    ] as const,
};

export function useDispatchLinkingPlans(
  filters: DispatchLinkingFilters,
  companyId?: number | string,
) {
  return useQuery({
    queryKey: DISPATCH_LINKING_QUERY_KEYS.plans(filters, companyId),
    queryFn: () => dispatchLinkingApi.getPlans(filters),
    enabled: !!filters.date,
    staleTime: 30 * 1000,
  });
}

function invalidateDispatchLinkingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DISPATCH_LINKING_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
  queryClient.invalidateQueries({ queryKey: ['salesDispatchGateOuts'] });
}

export function useLinkDispatchVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      docEntry,
      payload,
    }: {
      docEntry: number;
      payload: DispatchVehicleLinkPayload;
    }) => dispatchLinkingApi.linkVehicle(docEntry, payload),
    onSuccess: () => invalidateDispatchLinkingQueries(queryClient),
  });
}

export function useUnlinkDispatchVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docEntry }: { docEntry: number }) =>
      dispatchLinkingApi.unlinkVehicle(docEntry),
    onSuccess: () => invalidateDispatchLinkingQueries(queryClient),
  });
}
