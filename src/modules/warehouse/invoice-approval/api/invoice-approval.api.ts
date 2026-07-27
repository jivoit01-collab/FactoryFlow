import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  InvoiceApprovalAudit,
  InvoiceHistoryRecord,
  InvoiceLog,
  InvoiceStatus,
  PendingCount,
  StatusUpdateRequest,
} from '../types';

export const invoiceApprovalApi = {
  async listInvoices(warehouse: string, status?: InvoiceStatus): Promise<InvoiceLog[]> {
    const response = await apiClient.get<InvoiceLog[]>(API_ENDPOINTS.OMS.INVOICES, {
      params: { whs: warehouse, ...(status ? { status } : {}) },
    });
    return response.data;
  },

  async updateStatus(id: number, data: StatusUpdateRequest): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      API_ENDPOINTS.OMS.INVOICE_STATUS(id),
      data,
    );
    return response.data;
  },

  async getHistory(id: number): Promise<InvoiceHistoryRecord[]> {
    const response = await apiClient.get<InvoiceHistoryRecord[]>(
      API_ENDPOINTS.OMS.INVOICE_HISTORY(id),
    );
    return response.data;
  },

  async getPendingCount(warehouse: string): Promise<PendingCount> {
    // Background poll driving the sidebar badge — mounted on every page. Suppress
    // the global error toast so an OMS outage doesn't spam a toast app-wide; the
    // badge simply renders nothing when the count can't be fetched.
    const response = await apiClient.get<PendingCount>(API_ENDPOINTS.OMS.INVOICE_PENDING_COUNT, {
      params: { whs: warehouse },
      suppressErrorToast: true,
    });
    return response.data;
  },

  async getAudit(id: number): Promise<InvoiceApprovalAudit[]> {
    const response = await apiClient.get<InvoiceApprovalAudit[]>(
      API_ENDPOINTS.OMS.INVOICE_AUDIT(id),
    );
    return response.data;
  },
};
