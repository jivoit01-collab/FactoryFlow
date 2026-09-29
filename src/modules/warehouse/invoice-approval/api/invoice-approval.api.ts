import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  InvoiceApprovalAudit,
  InvoiceHistoryRecord,
  InvoiceLog,
  InvoiceSource,
  InvoiceStatus,
  PendingCount,
  StatusUpdateRequest,
  StatusUpdateResponse,
} from '../types';

const E = API_ENDPOINTS.INVOICE_APPROVAL;

/**
 * Bills held in the factory app for a warehouse manager. Kept beside the
 * routes that use them rather than in the shared endpoint constants — they
 * belong to this page alone.
 */
const APP_BASE = '/invoice-approvals/app-invoices/';
const APP = {
  list: APP_BASE,
  pendingCount: `${APP_BASE}pending-count/`,
  status: (id: number) => `${APP_BASE}${id}/status/`,
  history: (id: number) => `${APP_BASE}${id}/history/`,
  audit: (id: number) => `${APP_BASE}${id}/audit/`,
};

/**
 * The same five operations exist against both backends and differ only in the
 * URL, so each source names its own routes and every call takes the source.
 */
const ROUTES: Record<
  InvoiceSource,
  {
    list: string;
    pendingCount: string;
    status: (id: number) => string;
    history: (id: number) => string;
    audit: (id: number) => string;
  }
> = {
  OMS: {
    list: E.OMS_INVOICES,
    pendingCount: E.OMS_INVOICE_PENDING_COUNT,
    status: E.OMS_INVOICE_STATUS,
    history: E.OMS_INVOICE_HISTORY,
    audit: E.OMS_INVOICE_AUDIT,
  },
  SAP: {
    list: E.INVOICES,
    pendingCount: E.INVOICE_PENDING_COUNT,
    status: E.INVOICE_STATUS,
    history: E.INVOICE_HISTORY,
    audit: E.INVOICE_AUDIT,
  },
  APP,
};

export const invoiceApprovalApi = {
  async listInvoices(
    source: InvoiceSource,
    warehouse: string,
    status?: InvoiceStatus,
  ): Promise<InvoiceLog[]> {
    const response = await apiClient.get<InvoiceLog[]>(ROUTES[source].list, {
      params: { whs: warehouse, ...(status ? { status } : {}) },
    });
    return response.data;
  },

  async updateStatus(
    source: InvoiceSource,
    id: number,
    data: StatusUpdateRequest,
  ): Promise<StatusUpdateResponse> {
    const response = await apiClient.patch<StatusUpdateResponse>(ROUTES[source].status(id), data);
    return response.data;
  },

  async getHistory(source: InvoiceSource, id: number): Promise<InvoiceHistoryRecord[]> {
    const response = await apiClient.get<InvoiceHistoryRecord[]>(ROUTES[source].history(id));
    return response.data;
  },

  async getPendingCount(source: InvoiceSource, warehouse: string): Promise<PendingCount> {
    // Background poll driving the sidebar badge — mounted on every page. Suppress
    // the global error toast so an OMS/SAP outage doesn't spam a toast app-wide;
    // the badge simply renders nothing when the count can't be fetched. APP
    // counts across every managed warehouse, so it is asked with or without one.
    const response = await apiClient.get<PendingCount>(ROUTES[source].pendingCount, {
      params: warehouse ? { whs: warehouse } : {},
      suppressErrorToast: true,
    });
    return response.data;
  },

  async getAudit(source: InvoiceSource, id: number): Promise<InvoiceApprovalAudit[]> {
    const response = await apiClient.get<InvoiceApprovalAudit[]>(ROUTES[source].audit(id));
    return response.data;
  },
};
