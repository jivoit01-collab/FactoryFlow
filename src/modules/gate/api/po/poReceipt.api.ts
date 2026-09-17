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
  /**
   * Advisory notes from the server about the receipt just saved — today, a PO
   * line already promised to another truck that has not posted its GRPO yet.
   * The save succeeded; these are for the operator to act on while the PO can
   * still be changed.
   */
  warnings?: string[];
}

export interface ReplacePOReceiptRequest extends CreatePOReceiptRequest {
  /** Mandatory reason for replacing the wrong PO on a sent-back arrival slip. */
  reason: string;
}

export type ReplacePOReceiptResponse = POReceipt & { supplier_changed?: boolean };

/**
 * Move a received PO onto a different open PO for the same vendor.
 *
 * Not the same as replacing it: the items, their quantities and their QC all
 * stay. Only the SAP linkage moves, which is what a PO that ran out between
 * gate-in and GRPO posting needs.
 */
export interface RepointPOReceiptRequest {
  po_number: string;
  reason: string;
}

export interface RepointSummary {
  po_receipt_id: number;
  gate_entry: string;
  old_po_number: string;
  old_doc_entry: number | null;
  new_po_number: string;
  new_doc_entry: number;
  lines: Array<{
    po_item_code: string;
    received_qty: string;
    old_line_num: number | null;
    new_line_num: number;
  }>;
  drafts_updated: number;
}

export type RepointPOReceiptResponse = POReceipt & { repoint: RepointSummary };

export const poReceiptApi = {
  async get(entryId: number): Promise<POReceipt[]> {
    const response = await apiClient.get<POReceipt[]>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPTS_VIEW(entryId),
    );
    return response.data;
  },

  async create(entryId: number, data: CreatePOReceiptRequest): Promise<POReceipt> {
    const response = await apiClient.post<
      POReceipt | { po_receipt: POReceipt; warnings?: string[] }
    >(API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPTS(entryId), data);
    // The create response wraps the receipt; warnings sit beside it, so lift them
    // onto the receipt rather than dropping them with the envelope.
    return 'po_receipt' in response.data
      ? { ...response.data.po_receipt, warnings: response.data.warnings }
      : response.data;
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

  async repoint(
    entryId: number,
    poReceiptId: number,
    data: RepointPOReceiptRequest,
  ): Promise<RepointPOReceiptResponse> {
    const response = await apiClient.post<RepointPOReceiptResponse>(
      API_ENDPOINTS.RAW_MATERIAL_GATEIN.PO_RECEIPT_REPOINT(entryId, poReceiptId),
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
