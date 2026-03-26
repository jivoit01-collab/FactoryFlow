import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { StockDashboardFilters, StockDashboardResponse } from '../types';

const EP = API_ENDPOINTS.STOCK_DASHBOARD;

export const stockLevelApi = {
  async getStockLevels(filters?: StockDashboardFilters): Promise<StockDashboardResponse> {
    const response = await apiClient.get<StockDashboardResponse>(EP.LIST, {
      params: buildParams(filters),
    });
    return response.data;
  },
};

function buildParams(filters?: StockDashboardFilters): Record<string, string> {
  if (!filters) return {};
  const p: Record<string, string> = {};
  if (filters.search) p.search = filters.search;
  if (filters.warehouse) p.warehouse = filters.warehouse;
  if (filters.status && filters.status !== 'all') p.status = filters.status;
  return p;
}
