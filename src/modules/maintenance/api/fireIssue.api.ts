import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  FireEquipmentIssue,
  FireEquipmentIssueFilters,
  FireEquipmentIssuePayload,
  FireEquipmentReturnPayload,
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

export const fireIssueApi = {
  async getIssues(filters?: FireEquipmentIssueFilters): Promise<FireEquipmentIssue[]> {
    const response = await apiClient.get<FireEquipmentIssue[]>(EP.FIRE_ISSUES, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getIssue(issueId: number): Promise<FireEquipmentIssue> {
    const response = await apiClient.get<FireEquipmentIssue>(EP.FIRE_ISSUE_DETAIL(issueId));
    return response.data;
  },

  async createIssue(payload: FireEquipmentIssuePayload): Promise<FireEquipmentIssue> {
    const response = await apiClient.post<FireEquipmentIssue>(EP.FIRE_ISSUES, payload);
    return response.data;
  },

  async deleteIssue(issueId: number): Promise<void> {
    await apiClient.delete(EP.FIRE_ISSUE_DETAIL(issueId));
  },

  async returnItems(
    issueId: number,
    payload: FireEquipmentReturnPayload,
  ): Promise<FireEquipmentIssue> {
    const response = await apiClient.post<FireEquipmentIssue>(EP.FIRE_ISSUE_RETURN(issueId), payload);
    return response.data;
  },
};
