import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { BEVERAGES_PM_STALE_TIME } from '../constants';
import { beveragesPmApi } from './beverages-pm.api';

// Keyed on the company like the Packing Material board, so switching company
// can never serve the previous one's stock.
export const BEVERAGES_PM_QUERY_KEYS = {
  all: ['beverages-pm'] as const,
  stockPieces: (companyId?: number | string) =>
    [...BEVERAGES_PM_QUERY_KEYS.all, 'stock-pieces', companyId] as const,
};

/** A 502 is SAP rejecting the query and fails the same way on a retry. */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404 || status === 502) return false;
  return failureCount < 2;
}

export function useBeveragesPmStock() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BEVERAGES_PM_QUERY_KEYS.stockPieces(currentCompany?.company_id),
    queryFn: () => beveragesPmApi.getStockPieces(),
    staleTime: BEVERAGES_PM_STALE_TIME,
    retry: sapRetry,
  });
}
