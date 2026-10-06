import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { NON_MOVING_STALE_TIME } from '../constants';
import type { NonMovingFilters } from '../types';
import { nonMovingApi } from './non-moving.api';

// ============================================================================
// Query Keys
// ============================================================================

export const NON_MOVING_QUERY_KEYS = {
  all: ['non-moving-rm'] as const,

  report: (filters: NonMovingFilters, companyId?: number | string) =>
    [
      ...NON_MOVING_QUERY_KEYS.all,
      'report',
      companyId,
      { age: filters.age, item_group: filters.item_group, count_production: filters.count_production },
    ] as const,

  itemGroups: (companyId?: number | string) =>
    [...NON_MOVING_QUERY_KEYS.all, 'item-groups', companyId] as const,
};

// ============================================================================
// Retry Helper
// ============================================================================

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * `companyCode` pins the read to one company instead of the active one -- the
 * Amounts board opens Beverages' report from its Beverage row, whichever
 * company the reader is signed into. Keyed on the code then, so the pinned and
 * the active company's answers never share a cache entry.
 */
export function useNonMovingReport(
  filters: NonMovingFilters,
  enabled = true,
  companyCode?: string,
) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: NON_MOVING_QUERY_KEYS.report(filters, companyCode ?? currentCompany?.company_id),
    queryFn: () => nonMovingApi.getReport(filters, companyCode),
    staleTime: NON_MOVING_STALE_TIME,
    retry: sapRetry,
    enabled,
  });
}

export function useItemGroups(companyCode?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: NON_MOVING_QUERY_KEYS.itemGroups(companyCode ?? currentCompany?.company_id),
    queryFn: () => nonMovingApi.getItemGroups(companyCode),
    staleTime: NON_MOVING_STALE_TIME,
    retry: sapRetry,
  });
}
