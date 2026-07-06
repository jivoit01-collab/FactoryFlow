import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { DispatchFulfilmentFilters, DispatchFulfilmentResponse } from '../types';

const EP = API_ENDPOINTS.DISPATCH_FULFILMENT;

export const dispatchFulfilmentApi = {
  async getSummary(
    filters: DispatchFulfilmentFilters,
  ): Promise<DispatchFulfilmentResponse> {
    const response = await apiClient.get<DispatchFulfilmentResponse>(EP.SUMMARY, {
      params: { from: filters.from, to: filters.to },
    });
    return response.data;
  },
};
