import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ARInvoicePosting,
  ARInvoicePrintPayload,
  CreateARInvoiceRequest,
  Customer,
  LineDefaults,
  OpenSOLine,
  WarehouseStockItem,
} from '../types';

export const arInvoiceApi = {
  async searchCustomers(search?: string): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>(API_ENDPOINTS.AR_INVOICE.CUSTOMERS, {
      params: search ? { search } : {},
    });
    return response.data;
  },

  /** Item picker feed for a direct (cash) sale — stock held in one warehouse. */
  async listWarehouseItems(warehouse: string, search?: string): Promise<WarehouseStockItem[]> {
    const response = await apiClient.get<WarehouseStockItem[]>(API_ENDPOINTS.AR_INVOICE.ITEMS, {
      params: { warehouse, ...(search ? { search } : {}) },
    });
    return response.data;
  },

  /** Price/tax the customer last paid for an item, to prefill a direct line. */
  async getLineDefaults(customerCode: string, itemCode: string): Promise<LineDefaults> {
    const response = await apiClient.get<LineDefaults>(API_ENDPOINTS.AR_INVOICE.LINE_DEFAULTS, {
      params: { customer_code: customerCode, item_code: itemCode },
      suppressErrorToast: true,
    });
    return response.data;
  },

  async listOpenSoLines(customerCode: string, search?: string): Promise<OpenSOLine[]> {
    const response = await apiClient.get<OpenSOLine[]>(API_ENDPOINTS.AR_INVOICE.OPEN_SO_LINES, {
      params: { customer_code: customerCode, ...(search ? { search } : {}) },
    });
    return response.data;
  },

  async createInvoice(data: CreateARInvoiceRequest, files: File[]): Promise<ARInvoicePosting> {
    if (files.length === 0) {
      const response = await apiClient.post<ARInvoicePosting>(
        API_ENDPOINTS.AR_INVOICE.INVOICES,
        data,
      );
      return response.data;
    }
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    files.forEach((file) => form.append('attachments', file));
    const response = await apiClient.post<ARInvoicePosting>(
      API_ENDPOINTS.AR_INVOICE.INVOICES,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async listInvoices(): Promise<ARInvoicePosting[]> {
    const response = await apiClient.get<ARInvoicePosting[]>(API_ENDPOINTS.AR_INVOICE.INVOICES);
    return response.data;
  },

  /** Retry sending a PENDING/FAILED record to SAP. */
  async postInvoice(id: number): Promise<ARInvoicePosting> {
    const response = await apiClient.post<ARInvoicePosting>(
      API_ENDPOINTS.AR_INVOICE.INVOICE_POST(id),
    );
    return response.data;
  },

  /** Re-read the draft / approval state from SAP. */
  async refreshInvoice(id: number): Promise<ARInvoicePosting> {
    const response = await apiClient.post<ARInvoicePosting>(
      API_ENDPOINTS.AR_INVOICE.INVOICE_REFRESH(id),
    );
    return response.data;
  },

  /** Allocate batches and add an approved draft as the real OINV invoice. */
  async postDraft(id: number): Promise<ARInvoicePosting> {
    const response = await apiClient.post<ARInvoicePosting>(
      API_ENDPOINTS.AR_INVOICE.INVOICE_POST_DRAFT(id),
    );
    return response.data;
  },

  /** SAP's TAX INVOICE for a posted record, read fresh from SAP each time. */
  async getPrint(id: number): Promise<ARInvoicePrintPayload> {
    const response = await apiClient.get<ARInvoicePrintPayload>(
      API_ENDPOINTS.AR_INVOICE.INVOICE_PRINT(id),
    );
    return response.data;
  },

  /** Abandon a PENDING/FAILED record and release its SO lines. */
  async cancelInvoice(id: number): Promise<ARInvoicePosting> {
    const response = await apiClient.post<ARInvoicePosting>(
      API_ENDPOINTS.AR_INVOICE.INVOICE_CANCEL(id),
    );
    return response.data;
  },
};
