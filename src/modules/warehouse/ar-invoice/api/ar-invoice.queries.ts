import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateARInvoiceRequest } from '../types';
import { arInvoiceApi } from './ar-invoice.api';

export const AR_INVOICE_QUERY_KEYS = {
  all: ['ar-invoice'] as const,
  customers: (search: string) => [...AR_INVOICE_QUERY_KEYS.all, 'customers', search] as const,
  openLines: (customerCode: string, search?: string) =>
    [...AR_INVOICE_QUERY_KEYS.all, 'open-lines', customerCode, search ?? ''] as const,
  items: (warehouse: string, search: string) =>
    [...AR_INVOICE_QUERY_KEYS.all, 'items', warehouse, search] as const,
  invoices: () => [...AR_INVOICE_QUERY_KEYS.all, 'invoices'] as const,
  print: (id: number) => [...AR_INVOICE_QUERY_KEYS.all, 'print', id] as const,
};

export function useWarehouseItems(warehouse: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.items(warehouse, search),
    queryFn: () => arInvoiceApi.listWarehouseItems(warehouse, search || undefined),
    enabled: enabled && !!warehouse,
    staleTime: 30 * 1000,
  });
}

export function useCustomerSearch(search: string, enabled: boolean) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.customers(search),
    queryFn: () => arInvoiceApi.searchCustomers(search || undefined),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOpenSoLines(customerCode: string, search?: string) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.openLines(customerCode, search),
    queryFn: () => arInvoiceApi.listOpenSoLines(customerCode, search),
    enabled: !!customerCode,
    staleTime: 30 * 1000,
  });
}

export function useArInvoices() {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.invoices(),
    queryFn: () => arInvoiceApi.listInvoices(),
    staleTime: 30 * 1000,
  });
}

/**
 * SAP's TAX INVOICE for one posted record.
 *
 * Not cached beyond the open sheet: SAP can still amend the document after we
 * post it, and a bill printed from a stale copy is the kind of error nobody
 * catches until the customer does.
 */
export function useArInvoicePrint(id: number | null) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.print(id ?? 0),
    queryFn: () => arInvoiceApi.getPrint(id as number),
    enabled: id != null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreateArInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, files }: { data: CreateARInvoiceRequest; files: File[] }) =>
      arInvoiceApi.createInvoice(data, files),
    // onSettled, not onSuccess: even a FAILED SAP post leaves a record that
    // claims its SO lines — History and the open-lines picker must refresh
    // either way.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AR_INVOICE_QUERY_KEYS.all });
    },
  });
}

/** Post-retry / refresh / post-approved-draft / cancel — all return the updated record. */
export function useArInvoiceAction(action: 'post' | 'refresh' | 'postDraft' | 'cancel') {
  const queryClient = useQueryClient();
  const fn = {
    post: arInvoiceApi.postInvoice,
    refresh: arInvoiceApi.refreshInvoice,
    postDraft: arInvoiceApi.postDraft,
    cancel: arInvoiceApi.cancelInvoice,
  }[action];
  return useMutation({
    mutationFn: (id: number) => fn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AR_INVOICE_QUERY_KEYS.all });
    },
  });
}
