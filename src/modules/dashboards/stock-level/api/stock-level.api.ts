import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  StockDashboardFilters,
  StockDashboardResponse,
  StockItemDetailResponse,
} from '../types';

const EP = API_ENDPOINTS.STOCK_DASHBOARD;

function normalizeSearchParam(value?: string): string | undefined {
  const search = value?.trim();
  return search ? search.toUpperCase() : undefined;
}

export const stockLevelApi = {
  async getStockLevels(filters?: StockDashboardFilters): Promise<StockDashboardResponse> {
    const endpoint = filters?.as_of_date ? EP.AS_OF : EP.LIST;
    const response = await apiClient.get<StockDashboardResponse>(endpoint, {
      params: buildParams(filters),
    });
    return response.data;
  },

  async exportStockLevels(filters?: StockDashboardFilters): Promise<Blob> {
    const params = buildParams(filters);
    delete params.page;
    delete params.page_size;
    const response = await apiClient.get<Blob>(EP.EXPORT, {
      params,
      responseType: 'blob',
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
  const search = normalizeSearchParam(filters.search);
  if (search) p.search = search;
  if (filters.item_group) p.item_group = filters.item_group;
  if (filters.warehouse?.length) p.warehouse = filters.warehouse.join(',');
  if (filters.sort_by) p.sort_by = filters.sort_by;
  if (filters.sort_dir) p.sort_dir = filters.sort_dir;
  if (filters.page) p.page = filters.page;
  if (filters.page_size) p.page_size = filters.page_size;
  if (filters.status?.length) p.status = filters.status.join(',');
  if (filters.movement_status?.length) p.movement_status = filters.movement_status.join(',');
  if (filters.as_of_date) p.as_of_date = filters.as_of_date;
  return p;
}
