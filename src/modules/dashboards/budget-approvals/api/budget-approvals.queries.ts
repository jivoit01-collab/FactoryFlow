import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { BUDGET_APPROVALS_STALE_TIME } from '../constants';
import type { BudgetApprovalFilters } from '../types';
import { budgetApprovalsApi } from './budget-approvals.api';

// ============================================================================
// Query Keys
// ============================================================================

export const BUDGET_APPROVALS_QUERY_KEYS = {
  all: ['budget-approvals'] as const,

  report: (filters: BudgetApprovalFilters, companyId?: number | string) =>
    [
      ...BUDGET_APPROVALS_QUERY_KEYS.all,
      'report',
      companyId,
      {
        status: filters.status,
        branch: filters.branch,
        effect_month: filters.effect_month,
        search: filters.search,
        column_filters: filters.column_filters,
        sort_by: filters.sort_by,
        sort_dir: filters.sort_dir,
        page: filters.page,
        page_size: filters.page_size,
      },
    ] as const,

  columnValues: (
    field: string,
    filters: BudgetApprovalFilters,
    companyId?: number | string,
  ) =>
    [
      ...BUDGET_APPROVALS_QUERY_KEYS.all,
      'column-values',
      companyId,
      field,
      {
        status: filters.status,
        branch: filters.branch,
        effect_month: filters.effect_month,
        search: filters.search,
        column_filters: filters.column_filters,
      },
    ] as const,
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

export function useColumnValues(field: string, filters: BudgetApprovalFilters, enabled: boolean) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUDGET_APPROVALS_QUERY_KEYS.columnValues(
      field,
      filters,
      currentCompany?.company_id,
    ),
    queryFn: () => budgetApprovalsApi.getColumnValues(field, filters),
    staleTime: BUDGET_APPROVALS_STALE_TIME,
    retry: sapRetry,
    enabled,
  });
}

export function useBudgetApprovalReport(filters: BudgetApprovalFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUDGET_APPROVALS_QUERY_KEYS.report(filters, currentCompany?.company_id),
    queryFn: () => budgetApprovalsApi.getReport(filters),
    staleTime: BUDGET_APPROVALS_STALE_TIME,
    retry: sapRetry,
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: keepPreviousData,
  });
}
