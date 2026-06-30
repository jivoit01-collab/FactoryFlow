import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ApproveBOMRequestPayload,
  BOMRequest,
  BOMRequestDetail,
  CreateBOMRequestPayload,
  CreateFGReceiptPayload,
  FGReceipt,
  MaterialIssuePayload,
  RejectBOMRequestPayload,
  StockCheckResponse,
} from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

export const warehouseApi = {
  // =========================================================================
  // BOM Requests
  // =========================================================================

  async createBOMRequest(data: CreateBOMRequestPayload): Promise<BOMRequestDetail> {
    const res = await apiClient.post<BOMRequestDetail>(EP.BOM_REQUEST_CREATE, data);
    return res.data;
  },

  async getBOMRequests(params?: {
    status?: string;
    production_run_id?: number;
  }): Promise<BOMRequest[]> {
    const res = await apiClient.get<BOMRequest[]>(EP.BOM_REQUESTS, { params });
    return res.data;
  },

  async getBOMRequestDetail(requestId: number): Promise<BOMRequestDetail> {
    const res = await apiClient.get<BOMRequestDetail>(EP.BOM_REQUEST_DETAIL(requestId));
    return res.data;
  },

  async approveBOMRequest(
    requestId: number,
    data: ApproveBOMRequestPayload,
  ): Promise<BOMRequestDetail> {
    const res = await apiClient.post<BOMRequestDetail>(EP.BOM_REQUEST_APPROVE(requestId), data);
    return res.data;
  },

  async rejectBOMRequest(
    requestId: number,
    data: RejectBOMRequestPayload,
  ): Promise<BOMRequestDetail> {
    const res = await apiClient.post<BOMRequestDetail>(EP.BOM_REQUEST_REJECT(requestId), data);
    return res.data;
  },

  async issueMaterials(
    requestId: number,
    data?: MaterialIssuePayload,
  ): Promise<BOMRequestDetail> {
    const res = await apiClient.post<BOMRequestDetail>(EP.BOM_REQUEST_ISSUE(requestId), data || {});
    return res.data;
  },

  // =========================================================================
  // Stock Check
  // =========================================================================

  async checkStock(itemCodes: string[]): Promise<StockCheckResponse> {
    const res = await apiClient.post<StockCheckResponse>(EP.STOCK_CHECK, {
      item_codes: itemCodes,
    });
    return res.data;
  },

  // =========================================================================
  // Finished Goods Receipts
  // =========================================================================

  async createFGReceipt(data: CreateFGReceiptPayload): Promise<FGReceipt> {
    const res = await apiClient.post<FGReceipt>(EP.FG_RECEIPT_CREATE, data);
    return res.data;
  },

  async getFGReceipts(params?: {
    status?: string;
    production_run_id?: number;
  }): Promise<FGReceipt[]> {
    const res = await apiClient.get<FGReceipt[]>(EP.FG_RECEIPTS, { params });
    return res.data;
  },

  async getFGReceiptDetail(receiptId: number): Promise<FGReceipt> {
    const res = await apiClient.get<FGReceipt>(EP.FG_RECEIPT_DETAIL(receiptId));
    return res.data;
  },

  async receiveFG(receiptId: number): Promise<FGReceipt> {
    const res = await apiClient.post<FGReceipt>(EP.FG_RECEIPT_RECEIVE(receiptId));
    return res.data;
  },

  async postFGToSAP(receiptId: number): Promise<FGReceipt> {
    const res = await apiClient.post<FGReceipt>(EP.FG_RECEIPT_POST_SAP(receiptId));
    return res.data;
  },
};
