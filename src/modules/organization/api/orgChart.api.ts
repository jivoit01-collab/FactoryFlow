import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { OrgChart, OrgChartSavePayload } from '../types';

const EP = API_ENDPOINTS.ORG_CHART;

export const orgChartApi = {
  async getChart(): Promise<OrgChart> {
    const response = await apiClient.get<OrgChart>(EP.CHART);
    return response.data;
  },

  /** Replaces the whole chart — the editor always sends every department. */
  async saveChart(payload: OrgChartSavePayload): Promise<OrgChart> {
    const response = await apiClient.put<OrgChart>(EP.CHART, payload);
    return response.data;
  },
};
