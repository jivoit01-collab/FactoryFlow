import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { DISPATCH_FULFILMENT_STALE_TIME } from '../constants';
import type { DispatchBillFilters, DispatchFulfilmentFilters } from '../types';
import { dispatchFulfilmentApi } from './dispatch-fulfilment.api';

export const DISPATCH_FULFILMENT_QUERY_KEYS = {
  all: ['dispatch-fulfilment'] as const,
  summary: (filters: DispatchFulfilmentFilters, companyId?: number | string) =>
    [
      ...DISPATCH_FULFILMENT_QUERY_KEYS.all,
      'summary',
      companyId,
      {
        from: filters.from,
        to: filters.to,
        // Part of the key, not just the request: two boards on the same window
        // with different company scopes are different answers, and leaving this
        // out would serve one of them the other's totals from cache.
        companies: filters.companies?.join(',') ?? 'all',
      },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export interface DispatchFulfilmentOptions {
  /**
   * Poll this often, in milliseconds. Omitted means fetch once and leave it —
   * the drill-down page is read by somebody sitting in front of it, and moving
   * its numbers under them is worse than being a minute stale.
   *
   * A board that has to show today's tonnage climbing as trucks leave passes an
   * interval. `refetchIntervalInBackground` rides along with it so an unattended
   * screen keeps counting while the tab is not focused.
   */
  refetchIntervalMs?: number;
}

export function useDispatchFulfilment(
  filters: DispatchFulfilmentFilters,
  options?: DispatchFulfilmentOptions,
) {
  const { currentCompany } = useAuth();
  const interval = options?.refetchIntervalMs;

  return useQuery({
    queryKey: DISPATCH_FULFILMENT_QUERY_KEYS.summary(
      filters,
      currentCompany?.company_id,
    ),
    queryFn: () => dispatchFulfilmentApi.getSummary(filters),
    // A polling caller wants the figure to move, so its staleness has to be the
    // poll interval rather than the page default — otherwise the refetch lands
    // and React Query serves the cached answer anyway.
    staleTime: interval ?? DISPATCH_FULFILMENT_STALE_TIME,
    refetchInterval: interval,
    refetchIntervalInBackground: interval !== undefined,
    retry: sapRetry,
    enabled: !!filters.from && !!filters.to,
  });
}

export function useDispatchBills(filters: DispatchBillFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: [
      ...DISPATCH_FULFILMENT_QUERY_KEYS.all,
      'bills',
      currentCompany?.company_id,
      filters,
    ] as const,
    queryFn: () => dispatchFulfilmentApi.getBills(filters),
    staleTime: DISPATCH_FULFILMENT_STALE_TIME,
    retry: sapRetry,
    enabled: !!filters.from && !!filters.to,
    // keep the current page visible while the next one loads
    placeholderData: keepPreviousData,
  });
}
