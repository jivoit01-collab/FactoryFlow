import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  SapApprovalDecisionPayload,
  SapApprovalDecisionResult,
  SapApprovalStatus,
  SapAwaitingTransfer,
  SapTransferApproval,
  SapTransferDraft,
  SapTransferDraftPostResult,
  SapTransferPostResult,
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

/**
 * SAP's own approval queue on transfer drafts.
 *
 * Separate from `transferRequestApi` because the ids are SAP's (`OWDD.WddCode`)
 * and the rows are not the app's transfer requests at all — most were raised
 * straight in the SAP client.
 */
export const sapTransferApprovalApi = {
  /**
   * `status: 'ALL'` drops the filter; default is PENDING.
   *
   * The history views ask for more rows than the live queue: pending is a
   * backlog that should stay short, while approved/rejected is a log people
   * scroll back through. The server clamps at 500 either way.
   */
  async list(status: SapApprovalStatus | 'ALL' = 'PENDING'): Promise<SapTransferApproval[]> {
    const res = await apiClient.get<SapTransferApproval[]>(EP.SAP_TRANSFER_APPROVALS, {
      params: { status, limit: status === 'PENDING' ? 100 : 300 },
    });
    return res.data;
  },

  /**
   * Approve or reject in SAP. The backend re-reads the current stage and signs
   * as that authorizer, so no approver is sent from here.
   */
  async decide(
    wddCode: number,
    payload: SapApprovalDecisionPayload,
  ): Promise<SapApprovalDecisionResult> {
    const res = await apiClient.patch<SapApprovalDecisionResult>(
      EP.SAP_TRANSFER_APPROVAL_STATUS(wddCode),
      payload,
    );
    return res.data;
  },
};

/**
 * SAP transfer requests that are approved but still owe stock.
 *
 * Separate from the approval queue because these are past their decision: the
 * request is cleared and what remains is the movement itself.
 */
export const sapTransferPostApi = {
  async awaiting(): Promise<SapAwaitingTransfer[]> {
    const res = await apiClient.get<SapAwaitingTransfer[]>(EP.SAP_TRANSFER_AWAITING);
    return res.data;
  },

  /**
   * Post one transfer against a request. `quantities` is keyed by WTQ1.LineNum
   * and carries decimal strings; a line left out is simply not moved and the
   * request stays open for it.
   */
  async post(docEntry: number, quantities: Record<string, string>): Promise<SapTransferPostResult> {
    const res = await apiClient.post<SapTransferPostResult>(EP.SAP_TRANSFER_POST(docEntry), {
      quantities,
    });
    return res.data;
  },
};

/**
 * Inventory-transfer DRAFTS that SAP approved but nobody added.
 *
 * The step after the approval queue for a transfer raised in the SAP client:
 * approving clears the approval, and the stock still does not move until the
 * draft is added. Separate from the two above because there is nothing to
 * choose — the draft is posted exactly as SAP holds it.
 */
export const sapTransferDraftApi = {
  async list(): Promise<SapTransferDraft[]> {
    const res = await apiClient.get<SapTransferDraft[]>(EP.SAP_TRANSFER_DRAFTS);
    return res.data;
  },

  /** Add one draft. No body: quantities and batches were settled in SAP. */
  async post(draftEntry: number): Promise<SapTransferDraftPostResult> {
    const res = await apiClient.post<SapTransferDraftPostResult>(
      EP.SAP_TRANSFER_DRAFT_POST(draftEntry),
    );
    return res.data;
  },
};
