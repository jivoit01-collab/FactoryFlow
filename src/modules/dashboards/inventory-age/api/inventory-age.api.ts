import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { InventoryAgeFilters, InventoryAgeResponse } from '../types';

const EP = API_ENDPOINTS.INVENTORY_AGE_DASHBOARD;

export const inventoryAgeApi = {
  async getInventoryAge(filters?: InventoryAgeFilters): Promise<InventoryAgeResponse> {
    const response = await apiClient.get<InventoryAgeResponse>(EP.LIST, {
      params: buildParams(filters),
    });
    return response.data;
  },
};

function buildParams(filters?: InventoryAgeFilters): Record<string, string> {
  if (!filters) return {};
  const p: Record<string, string> = {};
  if (filters.search) p.search = filters.search;
  if (filters.warehouse) p.warehouse = filters.warehouse;
  if (filters.item_group) p.item_group = filters.item_group;
  if (filters.sub_group) p.sub_group = filters.sub_group;
  if (filters.variety) p.variety = filters.variety;
  if (filters.min_age !== undefined && filters.min_age > 0)
    p.min_age = String(filters.min_age);
  return p;
}
