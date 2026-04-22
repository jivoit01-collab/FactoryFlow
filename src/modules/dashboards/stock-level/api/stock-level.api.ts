import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { StockDashboardFilters, StockDashboardResponse, StockItemDetailResponse } from '../types';

const EP = API_ENDPOINTS.STOCK_DASHBOARD;

export const stockLevelApi = {
  async getStockLevels(filters?: StockDashboardFilters): Promise<StockDashboardResponse> {
    const response = await apiClient.get<StockDashboardResponse>(EP.LIST, {
      params: buildParams(filters),
    });
    return response.data;
  },

  async getItemDetail(itemCode: string, warehouses: string[]): Promise<StockItemDetailResponse> {
    const response = await apiClient.get<StockItemDetailResponse>(EP.ITEM_DETAIL(itemCode), {
      params: { warehouse: warehouses.join(',') },
    });
    return response.data;
  },
};

function buildParams(filters?: StockDashboardFilters): Record<string, string | number> {
  if (!filters) return {};
  const p: Record<string, string | number> = {};
  if (filters.search) p.search = filters.search;
  if (filters.warehouse?.length) p.warehouse = filters.warehouse.join(',');
  if (filters.sort_by) p.sort_by = filters.sort_by;
  if (filters.sort_dir) p.sort_dir = filters.sort_dir;
  if (filters.page) p.page = filters.page;
  if (filters.status?.length) p.status = filters.status.join(',');
  return p;
}
