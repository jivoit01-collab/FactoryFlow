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
    [...NON_MOVING_QUERY_KEYS.all, 'report', companyId, { age: filters.age, item_group: filters.item_group }] as const,

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

export function useNonMovingReport(filters: NonMovingFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: NON_MOVING_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => nonMovingApi.getReport(filters),
    staleTime: NON_MOVING_STALE_TIME,
    retry: sapRetry,
    enabled: filters.item_group !== 0,
  });
}

export function useItemGroups() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: NON_MOVING_QUERY_KEYS.itemGroups(currentCompany?.company_id),
    queryFn: () => nonMovingApi.getItemGroups(),
    staleTime: NON_MOVING_STALE_TIME,
    retry: sapRetry,
  });
}
