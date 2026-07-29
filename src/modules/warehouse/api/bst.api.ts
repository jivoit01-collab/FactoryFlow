import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BSTBatchScanResult,
  BSTCreatePayload,
  BSTPartialTransferRequest,
  BSTReceiveScanPayload,
  BSTReceiveScanResult,
  BSTScanResult,
  BSTTransferDetail,
  BSTTransferListItem,
  BSTUpdatePayload,
  SAPStockTransfer,
} from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

export const bstApi = {
  // ---- SAP source-document lookup (stock transfers or invoices) ----
  async listSapTransfers(params?: {
    document_type?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<SAPStockTransfer[]> {
    const res = await apiClient.get<SAPStockTransfer[]>(EP.BST_SAP_TRANSFERS, { params });
    return res.data;
  },

  async getSapTransfer(docEntry: number, documentType?: string): Promise<SAPStockTransfer> {
    const res = await apiClient.get<SAPStockTransfer>(EP.BST_SAP_TRANSFER_DETAIL(docEntry), {
      params: documentType ? { document_type: documentType } : undefined,
    });
    return res.data;
  },

  // ---- Sender ----
  async list(params?: {
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<BSTTransferListItem[]> {
    const res = await apiClient.get<BSTTransferListItem[]>(EP.BST_LIST, { params });
    return res.data;
  },

  async get(transferId: number): Promise<BSTTransferDetail> {
    const res = await apiClient.get<BSTTransferDetail>(EP.BST_DETAIL(transferId));
    return res.data;
  },

  async create(data: BSTCreatePayload): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(EP.BST_LIST, data);
    return res.data;
  },

  async update(transferId: number, data: BSTUpdatePayload): Promise<BSTTransferDetail> {
    const res = await apiClient.put<BSTTransferDetail>(EP.BST_DETAIL(transferId), data);
    return res.data;
  },

  async scanBox(transferId: number, barcodeRaw: string): Promise<BSTScanResult> {
    const res = await apiClient.post<BSTScanResult>(EP.BST_BOX_SCANS(transferId), {
      barcode_raw: barcodeRaw,
    });
    return res.data;
  },

  async scanBatch(transferId: number, barcodes: string[]): Promise<BSTBatchScanResult> {
    const res = await apiClient.post<BSTBatchScanResult>(EP.BST_BOX_SCANS_BATCH(transferId), {
      barcodes,
    });
    return res.data;
  },

  async removeScan(transferId: number, scanId: number): Promise<void> {
    await apiClient.delete(EP.BST_BOX_SCAN_DETAIL(transferId, scanId));
  },

  async approve(transferId: number): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(EP.BST_APPROVE(transferId));
    return res.data;
  },

  async cancel(transferId: number, cancelReason: string): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(EP.BST_CANCEL(transferId), {
      cancel_reason: cancelReason,
    });
    return res.data;
  },

  // ---- Partial-transfer approval (seal a short scan with admin sign-off) ----
  async requestPartialTransfer(
    transferId: number,
    reason: string,
  ): Promise<BSTPartialTransferRequest> {
    const res = await apiClient.post<BSTPartialTransferRequest>(
      EP.BST_PARTIAL_TRANSFER_REQUEST(transferId),
      { reason },
    );
    return res.data;
  },

  async listPartialTransfers(params?: {
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<BSTPartialTransferRequest[]> {
    const res = await apiClient.get<BSTPartialTransferRequest[]>(EP.BST_PARTIAL_TRANSFERS, {
      params,
    });
    return res.data;
  },

  async approvePartialTransfer(
    requestId: number,
    reviewNotes = '',
  ): Promise<BSTPartialTransferRequest> {
    const res = await apiClient.post<BSTPartialTransferRequest>(
      EP.BST_PARTIAL_TRANSFER_APPROVE(requestId),
      { review_notes: reviewNotes },
    );
    return res.data;
  },

  async rejectPartialTransfer(
    requestId: number,
    reviewNotes: string,
  ): Promise<BSTPartialTransferRequest> {
    const res = await apiClient.post<BSTPartialTransferRequest>(
      EP.BST_PARTIAL_TRANSFER_REJECT(requestId),
      { review_notes: reviewNotes },
    );
    return res.data;
  },

  // ---- Receiver ----
  async listIncoming(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<BSTTransferListItem[]> {
    const res = await apiClient.get<BSTTransferListItem[]>(EP.BST_INCOMING, { params });
    return res.data;
  },

  async getIncoming(transferId: number): Promise<BSTTransferDetail> {
    const res = await apiClient.get<BSTTransferDetail>(EP.BST_INCOMING_DETAIL(transferId));
    return res.data;
  },

  async receiveScan(
    transferId: number,
    payload: BSTReceiveScanPayload,
  ): Promise<BSTReceiveScanResult> {
    const res = await apiClient.post<BSTReceiveScanResult>(
      EP.BST_RECEIVE_SCAN(transferId),
      payload,
    );
    return res.data;
  },

  async receiveComplete(transferId: number): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(EP.BST_RECEIVE_COMPLETE(transferId));
    return res.data;
  },

  /**
   * Hand a single received pallet (and its accepted boxes) to the destination
   * company as it is put away into a destination-warehouse location — the
   * cross-company intercompany handoff, done per-pallet at putaway. No-ops for
   * intra-company stock transfers; idempotent and safe to retry.
   */
  async putawayPallet(
    transferId: number,
    palletCode: string,
  ): Promise<{ pallet_code: string; moved_boxes: number; moved: boolean }> {
    const res = await apiClient.post(EP.BST_RECEIVE_PUTAWAY_PALLET(transferId), {
      pallet_code: palletCode,
    });
    return res.data;
  },

  // ---- Gate ----
  async listGateOutwards(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<BSTTransferListItem[]> {
    const res = await apiClient.get<BSTTransferListItem[]>(EP.BST_GATE_OUTWARDS, { params });
    return res.data;
  },

  async listGateInwards(): Promise<BSTTransferListItem[]> {
    const res = await apiClient.get<BSTTransferListItem[]>(EP.BST_GATE_INWARDS);
    return res.data;
  },

  async markGateOut(transferId: number): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(EP.BST_GATE_MARK_OUT(transferId));
    return res.data;
  },

  async markGateIn(transferId: number): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(EP.BST_GATE_MARK_IN(transferId));
    return res.data;
  },
};
