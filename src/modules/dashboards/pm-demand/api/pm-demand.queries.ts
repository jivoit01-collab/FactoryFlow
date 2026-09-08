import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { PM_DEMAND_STALE_TIME } from '../constants';
import type { PmDemandFilters } from '../types';
import { pmDemandApi } from './pm-demand.api';

export const PM_DEMAND_QUERY_KEYS = {
  all: ['pm-demand-dashboard'] as const,

  /**
   * Only the parameters the request actually sends are in the key. `search`
   * and `sub_group` filter client-side, so including them would evict a good
   * cache entry and re-run five HANA reads on every keystroke.
   */
  report: (filters: PmDemandFilters, companyId?: number | string) =>
    [
      ...PM_DEMAND_QUERY_KEYS.all,
      'report',
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        top: filters.top,
        include_intercompany: filters.include_intercompany,
        source: filters.source,
      },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function usePmDemandReport(filters: PmDemandFilters, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PM_DEMAND_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => pmDemandApi.getReport(filters),
    enabled,
    staleTime: PM_DEMAND_STALE_TIME,
    retry: sapRetry,
  });
}
