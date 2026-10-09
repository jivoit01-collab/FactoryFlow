import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

/** Saves the entry and makes its SAP draft. A 201 can still carry
 *  `sap_status: 'FAILED'` — the entry is kept and offers the retry. */
export function useCreateAPInvoiceDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAPInvoiceDraftPayload) => apInvoiceDraftApi.create(payload),
    onSuccess: (data) => {
      qc.setQueryData(AP_INVOICE_DRAFT_QUERY_KEYS.detail(data.id), data);
      qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'list'] });
      qc.invalidateQueries({ queryKey: [...AP_INVOICE_DRAFT_QUERY_KEYS.all, 'grpos'] });
    },
  });
}

export function useReadInvoice() {
  return useEntryMutation((id: number) => apInvoiceDraftApi.readInvoice(id));
}

export function useSendToSap() {
  return useEntryMutation((id: number) => apInvoiceDraftApi.sendToSap(id));
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
