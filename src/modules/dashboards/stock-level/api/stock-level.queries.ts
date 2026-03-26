import { useQuery } from '@tanstack/react-query';

import { STOCK_LEVEL_STALE_TIME } from '../constants';
import type { StockDashboardFilters } from '../types';
import { stockLevelApi } from './stock-level.api';

// ============================================================================
// Query Keys
// ============================================================================

export const STOCK_LEVEL_QUERY_KEYS = {
  all: ['stock-dashboard'] as const,
  list: (filters?: StockDashboardFilters) =>
    [...STOCK_LEVEL_QUERY_KEYS.all, 'list', filters] as const,
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

export function useStockLevels(filters?: StockDashboardFilters) {
  return useQuery({
    queryKey: STOCK_LEVEL_QUERY_KEYS.list(filters),
    queryFn: () => stockLevelApi.getStockLevels(filters),
    staleTime: STOCK_LEVEL_STALE_TIME,
    retry: sapRetry,
  });
}
