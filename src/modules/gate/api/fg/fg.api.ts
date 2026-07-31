import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { CreatePOReceiptRequest, PurchaseOrder } from '../po/po.api';
import type { POReceipt } from '../po/poReceipt.api';

/**
 * Finished-goods gate-in API. Traded/purchased finished goods (SAP item group
 * 102, `FG` prefix) reuse the raw-material PO receipt shapes but hit the
 * `finished-goods-gatein` endpoints and skip QC entirely.
 */
export const fgApi = {
  /** Open POs for a supplier, restricted to finished-goods lines. */
  async getOpenFGPOs(supplierCode?: string): Promise<PurchaseOrder[]> {
    const response = await apiClient.get<PurchaseOrder[]>(
      API_ENDPOINTS.PO.FG_OPEN_POS(supplierCode),
    );
    return response.data;
  },

  async getReceipts(entryId: number): Promise<POReceipt[]> {
    const response = await apiClient.get<POReceipt[]>(
      API_ENDPOINTS.FINISHED_GOODS_GATEIN.PO_RECEIPTS_VIEW(entryId),
    );
    return response.data;
  },

  async createReceipt(entryId: number, data: CreatePOReceiptRequest): Promise<POReceipt> {
    const response = await apiClient.post<POReceipt | { po_receipt: POReceipt }>(
      API_ENDPOINTS.FINISHED_GOODS_GATEIN.PO_RECEIPTS(entryId),
      data,
    );
    return 'po_receipt' in response.data ? response.data.po_receipt : response.data;
  },

  async updateReceipt(
    entryId: number,
    poReceiptId: number,
    data: CreatePOReceiptRequest,
  ): Promise<POReceipt> {
    const response = await apiClient.put<POReceipt>(
      API_ENDPOINTS.FINISHED_GOODS_GATEIN.PO_RECEIPT_DETAIL(entryId, poReceiptId),
      data,
    );
    return response.data;
  },

  async complete(entryId: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.FINISHED_GOODS_GATEIN.COMPLETE(entryId),
    );
    return response.data;
  },

  async deleteEntry(entryId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FINISHED_GOODS_GATEIN.GATE_ENTRY_DELETE(entryId));
  },
};
