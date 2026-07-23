import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { InvoiceStatus, StatusUpdateRequest } from '../types';
import { invoiceApprovalApi } from './invoice-approval.api';

export const INVOICE_APPROVAL_QUERY_KEYS = {
  all: ['oms-invoice-approval'] as const,
  list: (status?: InvoiceStatus) =>
    [...INVOICE_APPROVAL_QUERY_KEYS.all, 'list', status ?? 'ALL'] as const,
  history: (id: number) => [...INVOICE_APPROVAL_QUERY_KEYS.all, 'history', id] as const,
  audit: (id: number) => [...INVOICE_APPROVAL_QUERY_KEYS.all, 'audit', id] as const,
  pendingCount: () => [...INVOICE_APPROVAL_QUERY_KEYS.all, 'pending-count'] as const,
};

export function useInvoiceList(status?: InvoiceStatus) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.list(status),
    queryFn: () => invoiceApprovalApi.listInvoices(status),
    staleTime: 30 * 1000,
  });
}

export function useInvoiceHistory(id: number | null) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.history(id!),
    queryFn: () => invoiceApprovalApi.getHistory(id!),
    enabled: !!id,
  });
}

export function useInvoiceAudit(id: number | null) {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.audit(id!),
    queryFn: () => invoiceApprovalApi.getAudit(id!),
    enabled: !!id,
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: INVOICE_APPROVAL_QUERY_KEYS.pendingCount(),
    queryFn: () => invoiceApprovalApi.getPendingCount(),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: StatusUpdateRequest }) =>
      invoiceApprovalApi.updateStatus(id, data),
    onSuccess: (_response, { id }) => {
      // The entry moves out of PENDING/EDITED — refresh every tab + the nav badge.
      queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.audit(id) });
      queryClient.invalidateQueries({ queryKey: INVOICE_APPROVAL_QUERY_KEYS.pendingCount() });
    },
  });
}
