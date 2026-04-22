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

function buildParams(filters?: StockDashboardFilters): Record<string, string | number> {
  if (!filters) return {};
  const p: Record<string, string | number> = {};
  if (filters.search) p.search = filters.search;
  if (filters.warehouse?.length) p.warehouse = filters.warehouse.join(',');
  if (filters.page) p.page = filters.page;
  if (filters.status?.length) p.status = filters.status.join(',');
  return p;
}
