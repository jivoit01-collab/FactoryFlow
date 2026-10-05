/**
 * React-query hooks for the monthly plan workbook.
 *
 * An upload adds a version and may change which one is live; a delete may hand
 * the month back to an earlier version. Either way every list and every
 * version read here is refetched, so `is_latest` is never left stale.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';
import { isApiError } from '@/shared/utils';

import type { MonthlyPlanDetail, MonthlyPlanUploadPayload } from '../types';
import { monthlyPlanApi } from './monthly-plan.api';

export const MONTHLY_PLAN_KEYS = {
  all: ['planning-purchase', 'monthly-plan'] as const,
  list: (companyId?: number | string) => [...MONTHLY_PLAN_KEYS.all, 'list', companyId] as const,
  detail: (companyId: number | string | undefined, id: number | 'latest') =>
    [...MONTHLY_PLAN_KEYS.all, 'detail', companyId, id] as const,
};

const FIVE_MINUTES = 5 * 60 * 1000;

export function useMonthlyPlans() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: MONTHLY_PLAN_KEYS.list(currentCompany?.company_id),
    queryFn: () => monthlyPlanApi.list(),
    staleTime: FIVE_MINUTES,
  });
}

/** One version with its rows. A 404 (nothing uploaded, or a deleted version) is not retried. */
export function useMonthlyPlan(id: number | 'latest', enabled = true) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: MONTHLY_PLAN_KEYS.detail(currentCompany?.company_id, id),
    queryFn: () => monthlyPlanApi.detail(id),
    enabled,
    staleTime: FIVE_MINUTES,
    retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 2,
  });
}

export function useUploadMonthlyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MonthlyPlanUploadPayload) => monthlyPlanApi.upload(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONTHLY_PLAN_KEYS.all }),
  });
}

/**
 * The deleted version's own reads (by its id, and as `latest` if it was) are
 * dropped rather than refetched: refetching them is a 404 the page would flash
 * up before it moves on. Not awaited, so the caller moves on straight away.
 */
export function useDeleteMonthlyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => monthlyPlanApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({
        queryKey: [...MONTHLY_PLAN_KEYS.all, 'detail'],
        predicate: (query) => (query.state.data as MonthlyPlanDetail | undefined)?.id === id,
      });
      void queryClient.invalidateQueries({ queryKey: MONTHLY_PLAN_KEYS.all });
    },
  });
}
