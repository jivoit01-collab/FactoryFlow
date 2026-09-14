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
  sapList: (params?: BillSummaryListParams) =>
    [...BILL_SUMMARY_QUERY_KEYS.all, 'sap', 'list', params ?? {}] as const,
  sapDetail: (docEntry: number) =>
    [...BILL_SUMMARY_QUERY_KEYS.all, 'sap', 'detail', docEntry] as const,
  lookup: (billNumber: string) =>
    [...BILL_SUMMARY_QUERY_KEYS.all, 'lookup', billNumber] as const,
  invoicePrint: (docEntry: number) =>
    [...BILL_SUMMARY_QUERY_KEYS.all, 'invoice-print', docEntry] as const,
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

/**
 * Dispatches stamped straight into SAP.
 *
 * Off by default and only fetched when the screen asks for them: this one reads
 * HANA, and the app's own list should not be held up behind it.
 */
export function useSapBillSummaries(params: BillSummaryListParams, enabled: boolean) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.sapList(params),
    queryFn: () => billSummaryApi.sapList(params),
    enabled,
    retry: false,
  });
}

export function useSapBillSummary(docEntry: number | null) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.sapDetail(docEntry ?? 0),
    queryFn: () => billSummaryApi.sapDetail(docEntry as number),
    enabled: Boolean(docEntry),
    retry: false,
  });
}

/** Give a SAP-stamped dispatch a record, so it can be acted on like any sheet. */
export function useAdoptSapBillSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docEntry: number) => billSummaryApi.adopt(docEntry),
    onSuccess: (data) => {
      if (data.id) qc.setQueryData(BILL_SUMMARY_QUERY_KEYS.detail(data.id), data);
      void qc.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
    },
  });
}

export function useBillSummary(id: number | null) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => billSummaryApi.detail(id as number),
    enabled: Boolean(id),
  });
}

/**
 * SAP's TAX INVOICE for the bill behind a sheet, fetched only when asked for.
 *
 * Uncached on purpose: this is SAP's document, not ours, and it can be amended
 * or cancelled there after the sheet was issued — a print has to be what SAP
 * currently says, not what it said when the screen opened.
 */
export function useBillSummaryInvoicePrint(docEntry: number | null) {
  return useQuery({
    queryKey: BILL_SUMMARY_QUERY_KEYS.invoicePrint(docEntry ?? 0),
    queryFn: () => billSummaryApi.invoicePrint(docEntry as number),
    enabled: docEntry != null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
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

/**
 * Cancel a sheet, naming it at call time rather than at mount.
 *
 * A SAP-stamped dispatch has no id until it is adopted, and that happens in the
 * same click as the cancellation — so the id cannot be bound when the hook is
 * created.
 */
export function useCancelBillSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      billSummaryApi.cancel(id, reason),
    onSuccess: (data) => {
      if (data.id) qc.setQueryData(BILL_SUMMARY_QUERY_KEYS.detail(data.id), data);
      void qc.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
    },
  });
}
