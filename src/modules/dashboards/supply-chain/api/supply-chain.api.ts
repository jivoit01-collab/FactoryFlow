import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { AlarmPreviewResponse, SupplyChainDashboard } from '../types';

const EP = API_ENDPOINTS.SUPPLY_CHAIN;

export const supplyChainApi = {
  async getDashboard(forecastId?: number | null): Promise<SupplyChainDashboard> {
    const response = await apiClient.get<SupplyChainDashboard>(EP.DASHBOARD, {
      params: forecastId ? { forecast_id: forecastId } : undefined,
    });
    return response.data;
  },

  async previewAlarms(): Promise<AlarmPreviewResponse> {
    const response = await apiClient.get<AlarmPreviewResponse>(EP.ALARM_PREVIEW);
    return response.data;
  },

  async sendAlarms(force = false): Promise<AlarmPreviewResponse> {
    const response = await apiClient.post<AlarmPreviewResponse>(EP.ALARM_SEND, { force });
    return response.data;
  },

  async uploadReferenceTemplate(file: File) {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post(EP.REFERENCE_UPLOAD, form);
    return response.data;
  },
};
