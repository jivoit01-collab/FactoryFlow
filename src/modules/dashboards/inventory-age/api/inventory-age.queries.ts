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

  list: (filters?: InventoryAgeFilters, companyId?: number | string) =>
    [...INVENTORY_AGE_QUERY_KEYS.all, 'list', companyId, filters] as const,
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

export function useInventoryAge(filters?: InventoryAgeFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: INVENTORY_AGE_QUERY_KEYS.list(filters, currentCompany?.company_id),
    queryFn: () => inventoryAgeApi.getInventoryAge(filters),
    staleTime: INVENTORY_AGE_STALE_TIME,
    retry: sapRetry,
  });
}
