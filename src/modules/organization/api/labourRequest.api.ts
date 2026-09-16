import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  DecideRequestPayload,
  LabourRequest,
  LabourRequestAudit,
  RaiseRequestPayload,
  UpdateRequestPayload,
} from '../types';

const EP = API_ENDPOINTS.LABOUR_REQUEST;

export const labourRequestApi = {
  /** GET ?date= — every department's ask for that day, both shifts. */
  async listDay(date: string): Promise<LabourRequest[]> {
    return (await apiClient.get<LabourRequest[]>(EP.DAY(date))).data;
  },

  /** POST raise/ — create or revise a department's ask for one day + shift. */
  async raise(payload: RaiseRequestPayload): Promise<LabourRequest> {
    return (await apiClient.post<LabourRequest>(EP.RAISE, payload)).data;
  },

  /** PATCH {id}/ — edit the count and/or the note in place. */
  async update(id: number, payload: UpdateRequestPayload): Promise<LabourRequest> {
    return (await apiClient.patch<LabourRequest>(EP.DETAIL(id), payload)).data;
  },

  /** DELETE {id}/ — soft-delete; the row and its trail survive. */
  async remove(id: number): Promise<LabourRequest> {
    return (await apiClient.delete<LabourRequest>(EP.DETAIL(id))).data;
  },

  /** POST {id}/restore/ — undo a soft-delete within the grace window. */
  async restore(id: number): Promise<LabourRequest> {
    return (await apiClient.post<LabourRequest>(EP.RESTORE(id))).data;
  },

  /** POST {id}/decision/ — approve (optionally for fewer) or reject. */
  async decide(id: number, payload: DecideRequestPayload): Promise<LabourRequest> {
    return (await apiClient.post<LabourRequest>(EP.DECISION(id), payload)).data;
  },

  /** POST {id}/reopen/ — take a decision back; the ask returns to pending. */
  async reopen(id: number): Promise<LabourRequest> {
    return (await apiClient.post<LabourRequest>(EP.REOPEN(id))).data;
  },

  /** GET {id}/audit/ — the full trail for one request. */
  async audit(id: number): Promise<LabourRequestAudit[]> {
    return (await apiClient.get<LabourRequestAudit[]>(EP.AUDIT(id))).data;
  },
};
