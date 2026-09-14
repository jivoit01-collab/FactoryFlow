import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { CUSTOMER_RETURNS_STALE_TIME } from '../constants';
import type { CustomerReturnsFilters } from '../types';
import { customerReturnsApi } from './customer-returns.api';

export const CUSTOMER_RETURNS_QUERY_KEYS = {
  all: ['customer-returns-dashboard'] as const,
  dashboard: (filters: CustomerReturnsFilters, companyId?: number | string) =>
    [
      ...CUSTOMER_RETURNS_QUERY_KEYS.all,
      companyId,
      // The company scope belongs in the key, not just the request: "this
      // company" and "all my companies" are different answers, and leaving it
      // out would serve one of them the other's totals from cache.
      { from: filters.from, to: filters.to, allCompanies: filters.allCompanies },
    ] as const,
};

export function useCustomerReturnsDashboard(filters: CustomerReturnsFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: CUSTOMER_RETURNS_QUERY_KEYS.dashboard(filters, currentCompany?.company_id),
    queryFn: () => customerReturnsApi.getDashboard(filters),
    staleTime: CUSTOMER_RETURNS_STALE_TIME,
    // Changing the window keeps the old board on screen while the new one loads,
    // rather than blanking every panel the reader was in the middle of reading.
    placeholderData: keepPreviousData,
    enabled: !!filters.from && !!filters.to,
  });
}
