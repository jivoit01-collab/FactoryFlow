import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { PACKING_MATERIAL_STALE_TIME } from '../constants';
import type { PmDispatchQuery, PmPeriodQuery } from '../types';
import { packingMaterialApi } from './packing-material.api';

// ============================================================================
// Query keys
// ============================================================================
//
// Every key carries the company, because the whole board is one company's
// schema and the three warehouses differ between them. Without it, switching
// company would serve the previous one's cache.

export const PACKING_MATERIAL_QUERY_KEYS = {
  all: ['packing-material'] as const,

  stock: (companyId?: number | string) =>
    [...PACKING_MATERIAL_QUERY_KEYS.all, 'stock', companyId] as const,

  production: (query: PmPeriodQuery, companyId?: number | string) =>
    [...PACKING_MATERIAL_QUERY_KEYS.all, 'production', companyId, query] as const,

  dispatch: (query: PmDispatchQuery, companyId?: number | string) =>
    [...PACKING_MATERIAL_QUERY_KEYS.all, 'dispatch', companyId, query] as const,
};

// ============================================================================
// Retry helper
// ============================================================================

/**
 * A 502 is SAP rejecting the query and will fail the same way on a retry; a
 * 503 is SAP unreachable and may not. Neither is worth more than two goes on
 * a board that reads five tables.
 */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404 || status === 502) return false;
  return failureCount < 2;
}

// ============================================================================
// Hooks — one per panel, see the backend views for why they are separate
// ============================================================================

export function usePackingMaterialStock() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PACKING_MATERIAL_QUERY_KEYS.stock(currentCompany?.company_id),
    queryFn: () => packingMaterialApi.getStock(),
    staleTime: PACKING_MATERIAL_STALE_TIME,
    retry: sapRetry,
  });
}

export function usePackingMaterialProduction(query: PmPeriodQuery) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PACKING_MATERIAL_QUERY_KEYS.production(query, currentCompany?.company_id),
    queryFn: () => packingMaterialApi.getProduction(query),
    staleTime: PACKING_MATERIAL_STALE_TIME,
    retry: sapRetry,
  });
}

export function usePackingMaterialDispatch(query: PmDispatchQuery) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PACKING_MATERIAL_QUERY_KEYS.dispatch(query, currentCompany?.company_id),
    queryFn: () => packingMaterialApi.getDispatch(query),
    staleTime: PACKING_MATERIAL_STALE_TIME,
    retry: sapRetry,
    // Flipping the source toggle is a different key, so the previous answer
    // stays on screen while the new one loads instead of the table emptying.
    placeholderData: (previous) => previous,
  });
}
