import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type PartialDispatchApprovalStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PartialDispatchApproval {
  id: number;
  sales_dispatch: number;
  document: number;
  reason: string;
  status: PartialDispatchApprovalStatusValue;
  credit_note_no: string;
  requested_by: number | null;
  requested_at: string;
  decided_by: number | null;
  decided_at: string | null;
}

export interface PartialApprovalHeldItem {
  item_id: number;
  dispatched_quantity: number | string;
}

export interface PartialApprovalRequest {
  document_id: number;
  reason?: string;
  items: PartialApprovalHeldItem[];
}

export interface PartialApprovalDecision {
  decision: 'APPROVED' | 'REJECTED';
  credit_note_no?: string;
}

export const partialDispatchApi = {
  async removeDocument(salesDispatchId: number, documentId: number): Promise<unknown> {
    const response = await apiClient.post(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_REMOVE_DOCUMENT(salesDispatchId, documentId),
    );
    return response.data;
  },

  async requestApproval(
    salesDispatchId: number,
    payload: PartialApprovalRequest,
  ): Promise<PartialDispatchApproval> {
    const response = await apiClient.post<PartialDispatchApproval>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_PARTIAL_APPROVAL(salesDispatchId),
      payload,
    );
    return response.data;
  },

  async decide(
    approvalId: number,
    payload: PartialApprovalDecision,
  ): Promise<PartialDispatchApproval> {
    const response = await apiClient.post<PartialDispatchApproval>(
      API_ENDPOINTS.GATE_CORE.SALES_DISPATCH_PARTIAL_APPROVAL_DECIDE(approvalId),
      payload,
    );
    return response.data;
  },
};
