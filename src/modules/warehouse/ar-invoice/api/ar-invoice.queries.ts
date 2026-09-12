import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateARInvoiceRequest,
  MarkARPaymentRequest,
  SapCashSaleQuery,
} from '../types';
import { arInvoiceApi } from './ar-invoice.api';

export const AR_INVOICE_QUERY_KEYS = {
  all: ['ar-invoice'] as const,
  customers: (search: string) => [...AR_INVOICE_QUERY_KEYS.all, 'customers', search] as const,
  customerCredit: (customerCode: string) =>
    [...AR_INVOICE_QUERY_KEYS.all, 'customer-credit', customerCode] as const,
  openLines: (customerCode: string, search?: string) =>
    [...AR_INVOICE_QUERY_KEYS.all, 'open-lines', customerCode, search ?? ''] as const,
  items: (warehouse: string, search: string) =>
    [...AR_INVOICE_QUERY_KEYS.all, 'items', warehouse, search] as const,
  invoices: () => [...AR_INVOICE_QUERY_KEYS.all, 'invoices'] as const,
  sapCashSales: (query: SapCashSaleQuery) =>
    [
      ...AR_INVOICE_QUERY_KEYS.all,
      'sap-cash-sales',
      query.date_from ?? '',
      query.date_to ?? '',
      query.search ?? '',
    ] as const,
  print: (id: number) => [...AR_INVOICE_QUERY_KEYS.all, 'print', id] as const,
  sapPrint: (docEntry: number) =>
    [...AR_INVOICE_QUERY_KEYS.all, 'sap-print', docEntry] as const,
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

/**
 * One customer's credit position while an invoice is being raised.
 *
 * Short staleTime: the balance moves as other invoices and receipts post, and a
 * stale limit is the one number on this screen nobody would think to doubt.
 * Retries are off — the panel is informational and hides itself on failure
 * rather than holding the form up.
 */
export function useCustomerCredit(customerCode: string) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.customerCredit(customerCode),
    queryFn: () => arInvoiceApi.getCustomerCredit(customerCode),
    enabled: !!customerCode,
    staleTime: 15 * 1000,
    retry: false,
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
 * The SAP-side cash-sale book, fetched only while the History toggle shows it.
 *
 * Every call is a HANA read of a document SAP can still amend, so it is kept
 * briefly fresh rather than cached across the session.
 */
export function useSapCashSales(query: SapCashSaleQuery, enabled: boolean) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.sapCashSales(query),
    queryFn: () => arInvoiceApi.listSapCashSales(query),
    enabled,
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

/**
 * SAP's TAX INVOICE for a cash sale, by DocEntry.
 *
 * Uncached for the same reason as its sibling above, and more so: these are
 * documents this app never owned, so SAP is the only thing that knows what the
 * bill currently says.
 */
export function useSapCashSalePrint(docEntry: number | null) {
  return useQuery({
    queryKey: AR_INVOICE_QUERY_KEYS.sapPrint(docEntry ?? 0),
    queryFn: () => arInvoiceApi.getSapCashSalePrint(docEntry as number),
    enabled: docEntry != null,
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

/**
 * Mark (or correct) whether a bill has been paid.
 *
 * Invalidates the whole module: the same mark shows on the app's History and on
 * the SAP cash-sale list, and the two are separate queries.
 */
export function useMarkArPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docEntry, data }: { docEntry: number; data: MarkARPaymentRequest }) =>
      arInvoiceApi.markPayment(docEntry, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AR_INVOICE_QUERY_KEYS.all });
    },
  });
}

/** Drop a mark back to untracked. */
export function useClearArPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docEntry: number) => arInvoiceApi.clearPayment(docEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AR_INVOICE_QUERY_KEYS.all });
    },
  });
}
