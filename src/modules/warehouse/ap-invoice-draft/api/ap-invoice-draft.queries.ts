import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  APInvoiceDraftDetail,
  CreateAPInvoiceDraftPayload,
  ReviewCheckPayload,
} from '../types';
import { apInvoiceDraftApi } from './ap-invoice-draft.api';

export const AP_INVOICE_DRAFT_QUERY_KEYS = {
  all: ['warehouse', 'ap-invoice-drafts'] as const,
  list: (params?: Record<string, unknown>) =>
    [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'list', params ?? {}] as const,
  detail: (id: number) => [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'detail', id] as const,
  grpos: (search: string) => [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpos', search] as const,
  grpo: (docEntry: number) => [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpo', docEntry] as const,
  grpoStatus: (docEntries: number[]) =>
    [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpo-status', docEntries] as const,
};

export function useAPInvoiceDrafts(params?: { search?: string; all_companies?: boolean }) {
  return useQuery({
    queryKey: AP_INVOICE_DRAFT_QUERY_KEYS.list(params),
    queryFn: () => apInvoiceDraftApi.list(params),
  });
}

/** While the bill is being read (here or in another tab) the entry is polled. */
export function useAPInvoiceDraft(id: number | null) {
  return useQuery({
    queryKey: AP_INVOICE_DRAFT_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => apInvoiceDraftApi.get(id as number),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.invoice_read_status === 'READING' ? 5_000 : false,
  });
}

/** Live SAP read per search term; only while the picker is open. */
export function useOpenGRPOs(search: string, enabled: boolean) {
  return useQuery({
    queryKey: AP_INVOICE_DRAFT_QUERY_KEYS.grpos(search),
    queryFn: () => apInvoiceDraftApi.openGrpos(search || undefined),
    enabled,
    staleTime: 30_000,
  });
}

/** One GRPO, if SAP still has it open — for the form opened from a GRPO's page.
 *  `null` once loaded means it is not open (invoiced or closed). */
export function useOpenGRPO(docEntry: number | null, enabled: boolean) {
  return useQuery({
    queryKey: AP_INVOICE_DRAFT_QUERY_KEYS.grpo(docEntry ?? 0),
    queryFn: async () =>
      (await apInvoiceDraftApi.openGrpos(undefined, docEntry as number))[0] ?? null,
    enabled: enabled && !!docEntry,
    staleTime: 0,
  });
}

/** Where these GRPOs' A/P invoices stand (a page of posting history at a time). */
export function useGRPOAPStatus(docEntries: number[]) {
  const sorted = [...new Set(docEntries)].sort((a, b) => a - b);
  return useQuery({
    queryKey: AP_INVOICE_DRAFT_QUERY_KEYS.grpoStatus(sorted),
    queryFn: () => apInvoiceDraftApi.grpoStatus(sorted),
    enabled: sorted.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}

/** An entry made, or put into SAP: besides its own page, the GRPO picker and
 *  the GRPO pages' A/P status change with it. */
function refreshGRPOViews(qc: QueryClient, data: APInvoiceDraftDetail) {
  qc.setQueryData(AP_INVOICE_DRAFT_QUERY_KEYS.detail(data.id), data);
  qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'list'] });
  qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpos'] });
  qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpo'] });
  qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpo-status'] });
}

function useEntryMutation<TArgs>(mutationFn: (args: TArgs) => Promise<APInvoiceDraftDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      qc.setQueryData(AP_INVOICE_DRAFT_QUERY_KEYS.detail(data.id), data);
      qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'list'] });
    },
  });
}

/** Saves the entry, reads the bill and runs the checklist. The SAP draft is
 *  not made here: the entry comes back `PENDING` for `useSendToSap`. */
export function useCreateAPInvoiceDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAPInvoiceDraftPayload) => apInvoiceDraftApi.create(payload),
    onSuccess: (data) => {
      refreshGRPOViews(qc, data);
    },
  });
}

export function useReadInvoice() {
  return useEntryMutation((id: number) => apInvoiceDraftApi.readInvoice(id));
}

/** "Create in SAP", after the checklist. */
export function useSendToSap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apInvoiceDraftApi.sendToSap(id),
    onSuccess: (data) => {
      refreshGRPOViews(qc, data);
    },
  });
}

export function useRecheck() {
  return useEntryMutation((id: number) => apInvoiceDraftApi.recheck(id));
}

export function useReviewCheck(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, ...payload }: ReviewCheckPayload & { key: string }) =>
      apInvoiceDraftApi.reviewCheck(id, key, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AP_INVOICE_DRAFT_QUERY_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'list'] });
    },
  });
}
