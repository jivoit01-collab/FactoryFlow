import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  billSummaryApi,
  type BillSummaryListParams,
  type GenerateBillSummaryPayload,
} from './billSummary.api';

export const BILL_SUMMARY_QUERY_KEYS = {
  all: ['dispatch', 'bill-summaries'] as const,
  list: (params?: BillSummaryListParams) =>
    [...BILL_SUMMARY_QUERY_KEYS.all, 'list', params ?? {}] as const,
  detail: (id: number) => [...BILL_SUMMARY_QUERY_KEYS.all, 'detail', id] as const,
  lookup: (billNumber: string) =>
    [...BILL_SUMMARY_QUERY_KEYS.all, 'lookup', billNumber] as const,
};

/**
 * Look a bill up and get the form filled in as far as the app can manage.
 *
 * Reads SAP, so it only fires once a bill number is actually submitted — not on
 * every keystroke.
 */
export function useBillLookup(billNumber: string) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.lookup(billNumber),
    queryFn: () => billSummaryApi.lookup(billNumber),
    enabled: Boolean(billNumber),
    retry: false,
  });
}

export function useBillSummaries(params?: BillSummaryListParams) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.list(params),
    queryFn: () => billSummaryApi.list(params),
  });
}

export function useBillSummary(id: number | null) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => billSummaryApi.detail(id as number),
    enabled: Boolean(id),
  });
}

export function useGenerateBillSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateBillSummaryPayload) => billSummaryApi.generate(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
    },
  });
}

export function useMarkBillSummaryPicked(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => billSummaryApi.markPicked(id),
    onSuccess: (data) => {
      qc.setQueryData(BILL_SUMMARY_QUERY_KEYS.detail(id), data);
      void qc.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
    },
  });
}

export function usePostBillSummaryToSap(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => billSummaryApi.postToSap(id),
    onSuccess: (data) => {
      qc.setQueryData(BILL_SUMMARY_QUERY_KEYS.detail(id), data);
      void qc.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
    },
  });
}

export function useCancelBillSummary(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => billSummaryApi.cancel(id, reason),
    onSuccess: (data) => {
      qc.setQueryData(BILL_SUMMARY_QUERY_KEYS.detail(id), data);
      void qc.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
    },
  });
}
