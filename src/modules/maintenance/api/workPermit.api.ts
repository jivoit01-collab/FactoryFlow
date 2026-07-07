import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  WorkPermit,
  WorkPermitApprovePayload,
  WorkPermitAttachment,
  WorkPermitAttachmentUploadPayload,
  WorkPermitCancelPayload,
  WorkPermitCompletePayload,
  WorkPermitFilters,
  WorkPermitPayload,
  WorkPermitUpdatePayload,
  WorkPermitWorker,
  WorkPermitWorkerPayload,
} from '../types';

const EP = API_ENDPOINTS.MAINTENANCE;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

export const workPermitApi = {
  async getPermits(filters?: WorkPermitFilters): Promise<WorkPermit[]> {
    const response = await apiClient.get<WorkPermit[]>(EP.WORK_PERMITS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getPermit(permitId: number): Promise<WorkPermit> {
    const response = await apiClient.get<WorkPermit>(EP.WORK_PERMIT_DETAIL(permitId));
    return response.data;
  },

  async createPermit(payload: WorkPermitPayload): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMITS, payload);
    return response.data;
  },

  async updatePermit(permitId: number, payload: WorkPermitUpdatePayload): Promise<WorkPermit> {
    const response = await apiClient.patch<WorkPermit>(EP.WORK_PERMIT_DETAIL(permitId), payload);
    return response.data;
  },

  async deletePermit(permitId: number): Promise<void> {
    await apiClient.delete(EP.WORK_PERMIT_DETAIL(permitId));
  },

  // ---- Workflow transitions (each stamps user + timestamp server-side) ----

  // Maintenance sends the draft to the Fire Department Head.
  async submitPermit(permitId: number): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_SUBMIT(permitId));
    return response.data;
  },

  // Fire Department Head approves a submitted permit.
  async approvePermit(permitId: number, payload: WorkPermitApprovePayload): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_APPROVE(permitId), payload);
    return response.data;
  },

  // Maintenance starts work on an approved permit.
  async startPermit(permitId: number): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_START(permitId));
    return response.data;
  },

  // Clone an expired/cancelled permit into a fresh draft to re-fill.
  async renewPermit(permitId: number): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_RENEW(permitId));
    return response.data;
  },

  async completePermit(permitId: number, payload: WorkPermitCompletePayload): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_COMPLETE(permitId), payload);
    return response.data;
  },

  async closePermit(permitId: number): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_CLOSE(permitId));
    return response.data;
  },

  async cancelPermit(permitId: number, payload: WorkPermitCancelPayload): Promise<WorkPermit> {
    const response = await apiClient.post<WorkPermit>(EP.WORK_PERMIT_CANCEL(permitId), payload);
    return response.data;
  },

  // ---- Children ----

  async createWorker(payload: WorkPermitWorkerPayload): Promise<WorkPermitWorker> {
    const response = await apiClient.post<WorkPermitWorker>(EP.WORK_PERMIT_WORKERS, payload);
    return response.data;
  },

  async updateWorker(
    workerId: number,
    payload: Partial<WorkPermitWorkerPayload>,
  ): Promise<WorkPermitWorker> {
    const response = await apiClient.patch<WorkPermitWorker>(
      EP.WORK_PERMIT_WORKER_DETAIL(workerId),
      payload,
    );
    return response.data;
  },

  async deleteWorker(workerId: number): Promise<void> {
    await apiClient.delete(EP.WORK_PERMIT_WORKER_DETAIL(workerId));
  },

  async uploadAttachment(
    payload: WorkPermitAttachmentUploadPayload,
  ): Promise<WorkPermitAttachment> {
    const formData = new FormData();
    formData.append('permit', String(payload.permit));
    formData.append('file', payload.file);
    if (payload.title?.trim()) formData.append('title', payload.title.trim());

    const response = await apiClient.post<WorkPermitAttachment>(
      EP.WORK_PERMIT_ATTACHMENTS,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(EP.WORK_PERMIT_ATTACHMENT_DETAIL(attachmentId));
  },
};
