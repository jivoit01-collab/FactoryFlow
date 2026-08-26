import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  TransferAllocationPreview,
  TransferApprovePayload,
  TransferBatchVerification,
  TransferCreateBSTPayload,
  TransferPostAllocation,
  TransferReconcileReport,
  TransferRejectPayload,
  TransferRequestCreatePayload,
  TransferRequestDetail,
  TransferRequestListItem,
  TransferSecondLegPayload,
  WarehouseStockItem,
} from '../types';
import type { BSTTransferDetail } from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

export interface TransferRequestListParams {
  status?: string;
  posting_status?: string;
  from_warehouse?: string;
  to_warehouse?: string;
}

export const transferRequestApi = {
  // ---- Reads ----
  async list(params?: TransferRequestListParams): Promise<TransferRequestListItem[]> {
    const res = await apiClient.get<TransferRequestListItem[]>(EP.TRANSFER_REQUESTS, { params });
    return res.data;
  },

  /** What the receiving warehouse has waiting on it. */
  async pending(): Promise<TransferRequestListItem[]> {
    const res = await apiClient.get<TransferRequestListItem[]>(EP.TRANSFER_REQUESTS_PENDING);
    return res.data;
  },

  /** Cross-branch moves whose stock is parked in an in-transit warehouse. */
  async inTransit(): Promise<TransferRequestListItem[]> {
    const res = await apiClient.get<TransferRequestListItem[]>(EP.TRANSFER_REQUESTS_IN_TRANSIT);
    return res.data;
  },

  async get(requestId: number): Promise<TransferRequestDetail> {
    const res = await apiClient.get<TransferRequestDetail>(EP.TRANSFER_REQUEST_DETAIL(requestId));
    return res.data;
  },

  /** Where the app and SAP disagree about transfers. */
  async reconcile(params?: { all?: boolean; limit?: number }): Promise<TransferReconcileReport> {
    const res = await apiClient.get<TransferReconcileReport>(EP.TRANSFER_REQUESTS_RECONCILE, {
      params: {
        ...(params?.all ? { all: '1' } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      },
    });
    return res.data;
  },

  /** Items the source warehouse holds, for the request form's item picker. */
  async stock(params: {
    warehouse: string;
    search?: string;
    limit?: number;
  }): Promise<WarehouseStockItem[]> {
    const res = await apiClient.get<WarehouseStockItem[]>(EP.TRANSFER_REQUESTS_STOCK, {
      params: {
        warehouse: params.warehouse,
        ...(params.search ? { search: params.search } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      },
    });
    return res.data;
  },

  async verifyBatches(requestId: number): Promise<TransferBatchVerification> {
    const res = await apiClient.get<TransferBatchVerification>(
      EP.TRANSFER_REQUEST_VERIFY_BATCHES(requestId),
    );
    return res.data;
  },

  // ---- Writes ----
  /**
   * Raising a request also mirrors it into SAP, which is what reserves the
   * stock while the receiving warehouse decides. If SAP refuses, nothing is
   * saved — the request would otherwise promise stock it never held.
   */
  async create(data: TransferRequestCreatePayload): Promise<TransferRequestDetail> {
    const res = await apiClient.post<TransferRequestDetail>(EP.TRANSFER_REQUESTS, data);
    return res.data;
  },

  async approve(
    requestId: number,
    data: TransferApprovePayload = {},
  ): Promise<TransferRequestDetail> {
    const res = await apiClient.post<TransferRequestDetail>(
      EP.TRANSFER_REQUEST_APPROVE(requestId),
      data,
    );
    return res.data;
  },

  async reject(requestId: number, data: TransferRejectPayload): Promise<TransferRequestDetail> {
    const res = await apiClient.post<TransferRequestDetail>(
      EP.TRANSFER_REQUEST_REJECT(requestId),
      data,
    );
    return res.data;
  },

  /** Which batches posting would take, plus what else is on the shelf. */
  async allocationPreview(requestId: number): Promise<TransferAllocationPreview> {
    const res = await apiClient.get<TransferAllocationPreview>(
      EP.TRANSFER_REQUEST_ALLOCATION_PREVIEW(requestId),
    );
    return res.data;
  },

  /**
   * Posts the whole move, or leg 1 into in-transit when it crosses branches.
   * `allocations` overrides the oldest-first batch choice per line.
   */
  async post(
    requestId: number,
    allocations?: TransferPostAllocation[],
  ): Promise<TransferRequestDetail> {
    const res = await apiClient.post<TransferRequestDetail>(
      EP.TRANSFER_REQUEST_POST(requestId),
      allocations?.length ? { lines: allocations } : {},
    );
    return res.data;
  },

  /** Seed a BST from the posted transfer so the floor can start scanning. */
  async createBST(
    requestId: number,
    data: TransferCreateBSTPayload = {},
  ): Promise<BSTTransferDetail> {
    const res = await apiClient.post<BSTTransferDetail>(
      EP.TRANSFER_REQUEST_CREATE_BST(requestId),
      data,
    );
    return res.data;
  },

  /**
   * Move cross-branch stock out of in-transit into its real destination. Runs
   * automatically when a BST receipt completes; this is the manual retry for
   * when that post failed.
   */
  async postSecondLeg(
    requestId: number,
    data: TransferSecondLegPayload = {},
  ): Promise<TransferRequestDetail> {
    const res = await apiClient.post<TransferRequestDetail>(
      EP.TRANSFER_REQUEST_SECOND_LEG(requestId),
      data,
    );
    return res.data;
  },
};
