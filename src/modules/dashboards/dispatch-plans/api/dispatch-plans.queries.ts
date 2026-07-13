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

/**
 * Looks up a single bill by exact invoice number, scoped to a company. Used by
 * the Inside Vehicle Manager "Add a bill" picker so a bill that falls outside
 * the 500-row feed window is still findable by typing its number. Only fires
 * once the term looks like a full numeric bill number, to avoid needless SAP
 * hits on every keystroke.
 */
const MIN_BILL_LOOKUP_DIGITS = 6;

export function useLookupDispatchBill(invoiceNumber: string, companyCode?: string) {
  const term = invoiceNumber.trim();
  const enabled =
    !!companyCode && term.length >= MIN_BILL_LOOKUP_DIGITS && /^\d+$/.test(term);

  return useQuery({
    queryKey: [...DISPATCH_PLANS_QUERY_KEYS.all, 'bill-by-number', companyCode, term],
    queryFn: () => dispatchPlansApi.getBillByNumber(term, companyCode),
    enabled,
    staleTime: DISPATCH_PLAN_STALE_TIME,
    retry: sapRetry,
  });
}

export function useUpdateDispatchPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docEntry, payload }: { docEntry: number; payload: DispatchPlanUpdatePayload }) =>
      dispatchPlansApi.updatePlan(docEntry, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPATCH_PLANS_QUERY_KEYS.all });
    },
  });
}
