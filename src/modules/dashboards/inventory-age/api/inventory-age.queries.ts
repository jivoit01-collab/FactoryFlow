import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { INVENTORY_AGE_STALE_TIME } from '../constants';
import type { InventoryAgeFilters } from '../types';
import { inventoryAgeApi } from './inventory-age.api';

// ============================================================================
// Query Keys
// ============================================================================

export const INVENTORY_AGE_QUERY_KEYS = {
  all: ['inventory-age-dashboard'] as const,

  filterOptions: (companyId?: number | string) =>
    [...INVENTORY_AGE_QUERY_KEYS.all, 'filter-options', companyId] as const,

  report: (filters: InventoryAgeFilters, companyId?: number | string) =>
    [...INVENTORY_AGE_QUERY_KEYS.all, 'report', companyId, filters] as const,
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

/** Lightweight query — returns dropdown options without calling the SP. */
export function useInventoryAgeFilterOptions() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: INVENTORY_AGE_QUERY_KEYS.filterOptions(currentCompany?.company_id),
    queryFn: () => inventoryAgeApi.getFilterOptions(),
    staleTime: INVENTORY_AGE_STALE_TIME,
    retry: sapRetry,
  });
}

/** Full report — only fires when item_group is selected. */
export function useInventoryAgeReport(filters: InventoryAgeFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: INVENTORY_AGE_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => inventoryAgeApi.getReport(filters),
    staleTime: INVENTORY_AGE_STALE_TIME,
    retry: sapRetry,
    enabled: !!filters.item_group,
  });
}
