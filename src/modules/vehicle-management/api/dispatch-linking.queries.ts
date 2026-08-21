import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { dispatchPlansApi } from '@/modules/dashboards/dispatch-plans/api';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import type { DispatchLinkingFilters, DispatchVehicleLinkPayload } from '../types';
import { dispatchLinkingApi } from './dispatch-linking.api';

export const DISPATCH_LINKING_QUERY_KEYS = {
  all: ['vehicle-management', 'dispatch-linking'] as const,
  plans: (filters: DispatchLinkingFilters, companyId?: number | string) =>
    [
      ...DISPATCH_LINKING_QUERY_KEYS.all,
      'plans',
      companyId,
      {
        bucket: filters.bucket,
        date: filters.date,
        booking_status: filters.booking_status,
        search: filters.search,
        limit: filters.limit,
      },
    ] as const,
};

export function useDispatchLinkingPlans(
  filters: DispatchLinkingFilters,
  companyId?: number | string,
) {
  return useQuery({
    queryKey: DISPATCH_LINKING_QUERY_KEYS.plans(filters, companyId),
    queryFn: () => dispatchLinkingApi.getPlans(filters),
    enabled: !!filters.date,
    staleTime: 30 * 1000,
  });
}

function invalidateDispatchLinkingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DISPATCH_LINKING_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
  queryClient.invalidateQueries({ queryKey: ['salesDispatchGateOuts'] });
}

export function useLinkDispatchVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      docEntry,
      payload,
      companyCode,
    }: {
      docEntry: number;
      payload: DispatchVehicleLinkPayload;
      /** Owning company of this bill — only the cross-company caller sets it. */
      companyCode?: string;
    }) => dispatchLinkingApi.linkVehicle(docEntry, payload, companyCode),
    onSuccess: () => invalidateDispatchLinkingQueries(queryClient),
  });
}

export function useUnlinkDispatchVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docEntry, companyCode }: { docEntry: number; companyCode?: string }) =>
      dispatchLinkingApi.unlinkVehicle(docEntry, companyCode),
    onSuccess: () => invalidateDispatchLinkingQueries(queryClient),
  });
}

const MIN_BILL_LOOKUP_DIGITS = 6;

/**
 * Look one bill up by its exact number in every company the user belongs to.
 *
 * The bills feed is windowed and capped, so an older bill is unreachable by
 * scrolling; the by-number endpoint bypasses both but is company-scoped, and the
 * Vehicle Linking picker does not know which company a typed number belongs to.
 * One query per company, and whichever answers wins (numbers do not collide
 * across companies in practice — if they did, both are offered).
 */
export function useLookupDispatchBillAcrossCompanies(
  invoiceNumber: string,
  companyCodes: string[],
) {
  const term = invoiceNumber.trim();
  const enabled = term.length >= MIN_BILL_LOOKUP_DIGITS && /^\d+$/.test(term);

  const results = useQueries({
    queries: companyCodes.map((code) => ({
      queryKey: [...DISPATCH_LINKING_QUERY_KEYS.all, 'bill-by-number', code, term],
      queryFn: () => dispatchPlansApi.getBillByNumber(term, code),
      enabled,
      staleTime: 30 * 1000,
    })),
  });

  const bills: DispatchBill[] = [];
  companyCodes.forEach((code, index) => {
    const bill = results[index]?.data;
    // Tag the row the way the cross-company feed does, so downstream writes know
    // which company to address.
    if (bill) bills.push({ ...bill, company_code: bill.company_code ?? code });
  });

  return { bills, isFetching: results.some((result) => result.isFetching) };
}
