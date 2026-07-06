import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { DISPATCH_FULFILMENT_STALE_TIME } from '../constants';
import type { DispatchFulfilmentFilters } from '../types';
import { dispatchFulfilmentApi } from './dispatch-fulfilment.api';

export const DISPATCH_FULFILMENT_QUERY_KEYS = {
  all: ['dispatch-fulfilment'] as const,
  summary: (filters: DispatchFulfilmentFilters, companyId?: number | string) =>
    [
      ...DISPATCH_FULFILMENT_QUERY_KEYS.all,
      'summary',
      companyId,
      { from: filters.from, to: filters.to },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useDispatchFulfilment(filters: DispatchFulfilmentFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: DISPATCH_FULFILMENT_QUERY_KEYS.summary(
      filters,
      currentCompany?.company_id,
    ),
    queryFn: () => dispatchFulfilmentApi.getSummary(filters),
    staleTime: DISPATCH_FULFILMENT_STALE_TIME,
    retry: sapRetry,
    enabled: !!filters.from && !!filters.to,
  });
}
