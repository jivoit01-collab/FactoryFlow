import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ItemGroupResponse, NonMovingFilters, NonMovingReportResponse } from '../types';

const EP = API_ENDPOINTS.NON_MOVING_RM;

export const nonMovingApi = {
  async getReport(filters: NonMovingFilters): Promise<NonMovingReportResponse> {
    const response = await apiClient.get<NonMovingReportResponse>(EP.REPORT, {
      params: {
        age: filters.age,
        item_group: filters.item_group,
      },
    });
    return response.data;
  },

  async getItemGroups(): Promise<ItemGroupResponse> {
    const response = await apiClient.get<ItemGroupResponse>(EP.ITEM_GROUPS);
    return response.data;
  },
};
