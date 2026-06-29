import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { CreatePOReceiptRequest } from './po.api';

export interface POReceipt {
  id?: number;
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  created_at?: string;
  updated_at?: string;
  is_editable?: boolean;
  lock_reason?: string | null;
  items: Array<{
    id?: number;
    sap_line_num: number;
    po_item_code: string;
    item_name: string;
    ordered_qty: number;
    received_qty: number;
    unit_price?: number | null;
    uom: string;
  }>;
}

export interface ReplacePOReceiptRequest extends CreatePOReceiptRequest {
  /** Mandatory reason for replacing the wrong PO on a sent-back arrival slip. */
  reason: string;
}

export type ReplacePOReceiptResponse = POReceipt & { supplier_changed?: boolean };

export const poReceiptApi = {
  async get(entryId: number): Promise<POReceipt[]> {
    const response = await apiClient.get<POReceipt[]>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPTS_VIEW(entryId),
    );
    return response.data;
  },

  async create(entryId: number, data: CreatePOReceiptRequest): Promise<POReceipt> {
    const response = await apiClient.post<POReceipt | { po_receipt: POReceipt }>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPTS(entryId),
      data,
    );
    return 'po_receipt' in response.data ? response.data.po_receipt : response.data;
  },

  async update(
    entryId: number,
    poReceiptId: number,
    data: CreatePOReceiptRequest,
  ): Promise<POReceipt> {
    const response = await apiClient.put<POReceipt>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPT_DETAIL(entryId, poReceiptId),
      data,
    );
    return response.data;
  },

  async replace(
    entryId: number,
    poReceiptId: number,
    data: ReplacePOReceiptRequest,
  ): Promise<ReplacePOReceiptResponse> {
    const response = await apiClient.post<ReplacePOReceiptResponse>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPT_REPLACE(entryId, poReceiptId),
      data,
    );
    return response.data;
  },
};
