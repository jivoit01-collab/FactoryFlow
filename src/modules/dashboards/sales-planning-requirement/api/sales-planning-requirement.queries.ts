import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';

import { SALES_PLANNING_REQUIREMENT_STALE_TIME } from '../constants';
import type {
  SalesPlanningRequirementFilters,
  SalesPlanningRequirementReportResponse,
} from '../types';
import { salesPlanningRequirementApi } from './sales-planning-requirement.api';

export const SALES_PLANNING_REQUIREMENT_QUERY_KEYS = {
  all: ['sales-planning-requirement'] as const,
  sheet: (companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'sheet', companyId] as const,
  report: (filters: SalesPlanningRequirementFilters, companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'report', companyId, filters] as const,
  status: (companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'status', companyId] as const,
  analysis: (companyId?: number | string) =>
    [...SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all, 'analysis', companyId] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409) {
    return false;
  }
  return failureCount < 2;
}

export function useSalesPlanningRequirementReport(
  filters: SalesPlanningRequirementFilters,
  enabled = true,
) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.report(
      filters,
      currentCompany?.company_id,
    ),
    queryFn: () => salesPlanningRequirementApi.getReport(filters),
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
    enabled,
  });
}

/** The server's ceiling on one page of the report. */
const SHEET_PAGE_SIZE = 200;

/**
 * The whole report, every page of it, for the sheet.
 *
 * The sheet's column filters, sorts and footing line work over the rows in
 * hand, so they have to be all of them: a funnel built from one page of fifty
 * would offer a fraction of the items and total a fraction of the shortage,
 * and say nothing about it. The report is one line per item for one forecast
 * -- hundreds, not tens of thousands -- so reading it whole is a few requests.
 */
export function useSalesPlanningRequirementSheet() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.sheet(currentCompany?.company_id),
    queryFn: async (): Promise<SalesPlanningRequirementReportResponse> => {
      const first = await salesPlanningRequirementApi.getReport({
        page: 1,
        page_size: SHEET_PAGE_SIZE,
      });
      const rest = await Promise.all(
        Array.from({ length: first.meta.total_pages - 1 }, (_, index) =>
          salesPlanningRequirementApi.getReport({ page: index + 2, page_size: SHEET_PAGE_SIZE }),
        ),
      );
      return { ...first, data: [first, ...rest].flatMap((page) => page.data) };
    },
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useSalesPlanningRequirementStatus() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.status(currentCompany?.company_id),
    queryFn: () => salesPlanningRequirementApi.getStatus(),
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useSalesPlanningRequirementAnalysis() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.analysis(currentCompany?.company_id),
    queryFn: () => salesPlanningRequirementApi.getAnalysis(),
    staleTime: SALES_PLANNING_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
  });
}

export function useRefreshSalesPlanningRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => salesPlanningRequirementApi.refresh(),
    onSuccess: async (result) => {
      toast.success(`Sales planning refreshed: ${result.refresh.rows_loaded} rows loaded`);
      await queryClient.invalidateQueries({
        queryKey: SALES_PLANNING_REQUIREMENT_QUERY_KEYS.all,
      });
    },
  });
}
