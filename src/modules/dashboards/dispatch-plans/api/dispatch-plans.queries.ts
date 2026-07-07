import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { DISPATCH_PLAN_STALE_TIME } from '../constants';
import type { DispatchPlanFilters, DispatchPlanUpdatePayload } from '../types';
import { dispatchPlansApi } from './dispatch-plans.api';

export const DISPATCH_PLANS_QUERY_KEYS = {
  all: ['dispatch-plans'] as const,
  bills: (filters: DispatchPlanFilters, companyId?: number | string) =>
    [
      ...DISPATCH_PLANS_QUERY_KEYS.all,
      'bills',
      companyId,
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        booking_status: filters.booking_status,
        search: filters.search,
        branch: filters.branch,
        limit: filters.limit,
        exclude_jivo_mart_transfer: filters.exclude_jivo_mart_transfer,
        by_dispatch_date: filters.by_dispatch_date,
        all_companies: filters.all_companies,
      },
    ] as const,
};

function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useDispatchBills(filters: DispatchPlanFilters) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: DISPATCH_PLANS_QUERY_KEYS.bills(filters, currentCompany?.company_id),
    queryFn: () => dispatchPlansApi.getBills(filters),
    staleTime: DISPATCH_PLAN_STALE_TIME,
    retry: sapRetry,
    enabled: !!filters.date_from && !!filters.date_to,
  });
}

export function useUpdateDispatchPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docEntry, payload }: { docEntry: number; payload: DispatchPlanUpdatePayload }) =>
      dispatchPlansApi.updatePlan(docEntry, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPATCH_PLANS_QUERY_KEYS.all });
      // A plan edit changes what the docking board's pending-bookings and the
      // pipeline board show — invalidate them too, not just the plans list.
      queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-pipeline'] });
    },
  });
}
