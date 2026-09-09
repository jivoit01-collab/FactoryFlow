import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  PmDispatchQuery,
  PmDispatchResponse,
  PmPeriodQuery,
  PmProductionResponse,
  PmStockResponse,
} from '../types';

const EP = API_ENDPOINTS.PACKING_MATERIAL;

export const packingMaterialApi = {
  /** Stock in each packaging store and the total of them. No period: it is now. */
  async getStock(): Promise<PmStockResponse> {
    const response = await apiClient.get<PmStockResponse>(EP.STOCK);
    return response.data;
  },

  async getProduction(query: PmPeriodQuery): Promise<PmProductionResponse> {
    const response = await apiClient.get<PmProductionResponse>(EP.PRODUCTION, {
      params: query,
    });
    return response.data;
  },

  async getDispatch(query: PmDispatchQuery): Promise<PmDispatchResponse> {
    const response = await apiClient.get<PmDispatchResponse>(EP.DISPATCH, {
      params: query,
    });
    return response.data;
  },
};
