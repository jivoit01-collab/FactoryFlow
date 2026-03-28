import { useQuery } from '@tanstack/react-query';

import { SAP_PLAN_STALE_TIME } from '../constants';
import type { PlanDashboardFilters } from '../types';
import { sapPlanApi } from './sap-plan.api';

// ============================================================================
// Query Keys
// ============================================================================

export const SAP_PLAN_QUERY_KEYS = {
  all: ['sap-plan-dashboard'] as const,
  summary: (filters?: PlanDashboardFilters) => {
    const { status, ...apiFilters } = filters ?? {};
    return [...SAP_PLAN_QUERY_KEYS.all, 'summary', apiFilters] as const;
  },
  details: (filters?: PlanDashboardFilters) => {
    const { status, ...apiFilters } = filters ?? {};
    return [...SAP_PLAN_QUERY_KEYS.all, 'details', apiFilters] as const;
  },
  procurement: (filters?: PlanDashboardFilters) => {
    const { status, ...apiFilters } = filters ?? {};
    return [...SAP_PLAN_QUERY_KEYS.all, 'procurement', apiFilters] as const;
  },
  skuDetail: (docEntry: number) =>
    [...SAP_PLAN_QUERY_KEYS.all, 'sku-detail', docEntry] as const,
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

export function usePlanSummary(filters?: PlanDashboardFilters) {
  return useQuery({
    queryKey: SAP_PLAN_QUERY_KEYS.summary(filters),
    queryFn: () => sapPlanApi.getSummary(filters),
    staleTime: SAP_PLAN_STALE_TIME,
    retry: sapRetry,
  });
}

export function usePlanDetails(filters?: PlanDashboardFilters, enabled = true) {
  return useQuery({
    queryKey: SAP_PLAN_QUERY_KEYS.details(filters),
    queryFn: () => sapPlanApi.getDetails(filters),
    staleTime: SAP_PLAN_STALE_TIME,
    enabled,
    retry: sapRetry,
  });
}

export function usePlanProcurement(filters?: PlanDashboardFilters, enabled = true) {
  return useQuery({
    queryKey: SAP_PLAN_QUERY_KEYS.procurement(filters),
    queryFn: () => sapPlanApi.getProcurement(filters),
    staleTime: SAP_PLAN_STALE_TIME,
    enabled,
    retry: sapRetry,
  });
}

// Lazy per-row: fires only when a row is expanded
export function useSKUDetail(docEntry: number | null) {
  return useQuery({
    queryKey: SAP_PLAN_QUERY_KEYS.skuDetail(docEntry!),
    queryFn: () => sapPlanApi.getSKUDetail(docEntry!),
    enabled: !!docEntry,
    staleTime: SAP_PLAN_STALE_TIME,
    retry: false,
  });
}
