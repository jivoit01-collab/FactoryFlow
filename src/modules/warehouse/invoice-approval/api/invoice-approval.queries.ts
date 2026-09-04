import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { InvoiceSource, InvoiceStatus, StatusUpdateRequest } from '../types';
import { invoiceApprovalApi } from './invoice-approval.api';

/**
 * Every key carries the source: OMS ids and SAP approval-request codes are
 * unrelated id-spaces, so caching one invoice's history/audit under the id
 * alone would serve the wrong backend's data after a toggle.
 */
export const INVOICE_APPROVAL_QUERY_KEYS = {
  all: ['invoice-approval'] as const,
  source: (source: InvoiceSource) => [...INVOICE_APPROVAL_QUERY_KEYS.all, source] as const,
  list: (source: InvoiceSource, warehouse: string, status?: InvoiceStatus) =>
    [...INVOICE_APPROVAL_QUERY_KEYS.source(source), 'list', warehouse, status ?? 'ALL'] as const,
  history: (source: InvoiceSource, id: number) =>
    [...INVOICE_APPROVAL_QUERY_KEYS.source(source), 'history', id] as const,
  audit: (source: InvoiceSource, id: number) =>
    [...INVOICE_APPROVAL_QUERY_KEYS.source(source), 'audit', id] as const,
  pendingCount: (source: InvoiceSource, warehouse: string) =>
    [...INVOICE_APPROVAL_QUERY_KEYS.source(source), 'pending-count', warehouse] as const,
};

export function useInvoiceList(source: InvoiceSource, warehouse: string, status?: InvoiceStatus) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.list(source, warehouse, status),
    queryFn: () => invoiceApprovalApi.listInvoices(source, warehouse, status),
    enabled: !!warehouse,
    staleTime: 30 * 1000,
  });
}

export function useInvoiceHistory(source: InvoiceSource, id: number | null) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.history(source, id!),
    queryFn: () => invoiceApprovalApi.getHistory(source, id!),
    enabled: !!id,
  });
}

export function useInvoiceAudit(source: InvoiceSource, id: number | null) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.audit(source, id!),
    queryFn: () => invoiceApprovalApi.getAudit(source, id!),
    enabled: !!id,
  });
}

export function usePendingCount(source: InvoiceSource, warehouse: string) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.pendingCount(source, warehouse),
    queryFn: () => invoiceApprovalApi.getPendingCount(source, warehouse),
    enabled: !!warehouse,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUpdateInvoiceStatus(source: InvoiceSource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: StatusUpdateRequest }) =>
      invoiceApprovalApi.updateStatus(source, id, data),
    onSuccess: (_response, { id }) => {
      // The entry moves out of PENDING — the source key covers every tab, the
      // nav badge (pending-count) and this invoice's audit.
      queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.source(source) });
      queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.audit(source, id) });
    },
  });
}
