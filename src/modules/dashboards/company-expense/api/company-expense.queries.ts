import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { DEFAULT_REFRESH_MS,MATRIX_STALE_TIME } from '../constants';
import { companyExpenseApi } from './company-expense.api';

export const COMPANY_EXPENSE_KEYS = {
  all: ['company-expense'] as const,
  matrix: (from: string, to: string, companyId?: number | string) =>
    [...COMPANY_EXPENSE_KEYS.all, 'matrix', companyId, from, to] as const,
};

/**
 * The grid, polling itself.
 *
 * Keyed on the signed-in company even though the payload spans every company:
 * the server reads that header to decide whose board settings apply — which
 * Cost Master types price the salary and labour columns — so two users signed
 * into different companies can legitimately get different numbers.
 *
 * The poll interval comes from the board's own settings once the first response
 * lands, matching the Factory Expense wall, so an admin can slow a screen down
 * without a release.
 */
export function useExpenseMatrix(dateFrom: string, dateTo: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: COMPANY_EXPENSE_KEYS.matrix(dateFrom, dateTo, currentCompany?.company_id),
    queryFn: () => companyExpenseApi.getMatrix(dateFrom, dateTo),
    staleTime: MATRIX_STALE_TIME,
    refetchInterval: (query) => {
      const seconds = query.state.data?.settings?.refresh_seconds;
      return seconds ? seconds * 1000 : DEFAULT_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
  });
}
