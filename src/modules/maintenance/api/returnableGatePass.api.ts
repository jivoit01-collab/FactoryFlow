import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ReturnableAcknowledgePayload,
  ReturnableApprovePayload,
  ReturnableDashboard,
  ReturnableFilters,
  ReturnableGateOutPayload,
  ReturnableGatePass,
  ReturnableGatePassAttachment,
  ReturnableGatePassListItem,
  ReturnableGatePassLog,
  ReturnableGatePassPayload,
  ReturnableGatePassUpdatePayload,
  ReturnableReasonPayload,
  ReturnableRecordReturnPayload,
  SapItem,
  StagedAttachment,
} from '../types';

const EP = API_ENDPOINTS.RETURNABLE;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

export const returnableGatePassApi = {
  async getGatePasses(filters?: ReturnableFilters): Promise<ReturnableGatePassListItem[]> {
    const response = await apiClient.get<ReturnableGatePassListItem[]>(EP.GATEPASSES, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getGatePass(passId: number): Promise<ReturnableGatePass> {
    const response = await apiClient.get<ReturnableGatePass>(EP.GATEPASS_DETAIL(passId));
    return response.data;
  },

  async createGatePass(payload: ReturnableGatePassPayload): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.GATEPASSES, payload);
    return response.data;
  },

  async updateGatePass(
    passId: number,
    payload: ReturnableGatePassUpdatePayload,
  ): Promise<ReturnableGatePass> {
    const response = await apiClient.patch<ReturnableGatePass>(
      EP.GATEPASS_DETAIL(passId),
      payload,
    );
    return response.data;
  },

  async deleteGatePass(passId: number): Promise<void> {
    await apiClient.delete(EP.GATEPASS_DETAIL(passId));
  },

  // ---- Workflow transitions (each stamps user + timestamp server-side,
  //      writes a timeline row, and notifies the other side of the handoff) ----

  /** Stage 1 — department sends the pass to the higher authority for approval. */
  async submit(passId: number): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.SUBMIT(passId));
    return response.data;
  },

  /**
   * Stage 2 — the higher authority signs off. Only now does the pass reach the
   * gate's queue. The backend refuses if you are approving your own submission.
   */
  async approve(passId: number, payload: ReturnableApprovePayload = {}): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.APPROVE(passId), payload);
    return response.data;
  },

  /** The approver sends the pass back to the department as a draft. */
  async reject(passId: number, payload: ReturnableReasonPayload): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.REJECT(passId), payload);
    return response.data;
  },

  /** Stage 3 — gate records its own vehicle/driver details and lets the material out. */
  async gateOut(passId: number, payload: ReturnableGateOutPayload): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.GATE_OUT(passId), payload);
    return response.data;
  },

  /** Gate found a mismatch — bounce the pass back to the department with a reason. */
  async rejectAtGate(
    passId: number,
    payload: ReturnableReasonPayload,
  ): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.REJECT_AT_GATE(passId), payload);
    return response.data;
  },

  /** Stage 3 — gate accepts a return trip. Partial and repeated returns are allowed. */
  async recordReturn(
    passId: number,
    payload: ReturnableRecordReturnPayload,
  ): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.RECORD_RETURN(passId), payload);
    return response.data;
  },

  /** Stage 4a — department confirms it has collected the material from the gate. */
  async acknowledge(
    passId: number,
    payload: ReturnableAcknowledgePayload = {},
  ): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.ACKNOWLEDGE(passId), payload);
    return response.data;
  },

  /** Stage 4b — everything is back and acknowledged. */
  async close(passId: number): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.CLOSE(passId));
    return response.data;
  },

  /** Close a pass whose items will never return — scrapped, lost, written off. */
  async shortClose(passId: number, payload: ReturnableReasonPayload): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.SHORT_CLOSE(passId), payload);
    return response.data;
  },

  async cancel(passId: number, payload: ReturnableReasonPayload): Promise<ReturnableGatePass> {
    const response = await apiClient.post<ReturnableGatePass>(EP.CANCEL(passId), payload);
    return response.data;
  },

  async getTimeline(passId: number): Promise<ReturnableGatePassLog[]> {
    const response = await apiClient.get<ReturnableGatePassLog[]>(EP.TIMELINE(passId));
    return response.data;
  },

  // ---- Queues ----

  async getPendingApproval(): Promise<ReturnableGatePassListItem[]> {
    const response = await apiClient.get<ReturnableGatePassListItem[]>(EP.PENDING_APPROVAL);
    return response.data;
  },

  async getPendingGateOut(): Promise<ReturnableGatePassListItem[]> {
    const response = await apiClient.get<ReturnableGatePassListItem[]>(EP.PENDING_GATE_OUT);
    return response.data;
  },

  async getPendingGateIn(): Promise<ReturnableGatePassListItem[]> {
    const response = await apiClient.get<ReturnableGatePassListItem[]>(EP.PENDING_GATE_IN);
    return response.data;
  },

  // ---- Attachments ----

  async uploadAttachment(
    passId: number,
    file: File,
    docType: string,
    caption = '',
  ): Promise<ReturnableGatePassAttachment> {
    const formData = new FormData();
    formData.append('gate_pass', String(passId));
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('caption', caption);
    const response = await apiClient.post<ReturnableGatePassAttachment>(EP.ATTACHMENTS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Upload files staged in the create/edit form. Sequential rather than parallel
   * so a partial failure leaves an obvious prefix uploaded rather than a random
   * subset.
   */
  async uploadAttachments(
    passId: number,
    staged: StagedAttachment[],
  ): Promise<ReturnableGatePassAttachment[]> {
    const uploaded: ReturnableGatePassAttachment[] = [];
    for (const item of staged) {
      uploaded.push(
        await returnableGatePassApi.uploadAttachment(passId, item.file, item.doc_type, item.caption),
      );
    }
    return uploaded;
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(EP.ATTACHMENT_DETAIL(attachmentId));
  },

  // ---- Dashboard ----

  async getDashboard(): Promise<ReturnableDashboard> {
    const response = await apiClient.get<ReturnableDashboard>(EP.DASHBOARD);
    return response.data;
  },

  // ---- SAP item master ----

  /**
   * Server-side omni-search over SAP `OITM` by item code or name. The backend
   * returns an empty list for terms shorter than two characters.
   */
  async searchSapItems(search: string, limit = 50): Promise<SapItem[]> {
    const response = await apiClient.get<SapItem[]>(EP.SAP_ITEMS, {
      params: { search, limit },
    });
    return response.data;
  },
};
