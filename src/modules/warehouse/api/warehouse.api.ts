import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BatchExpiryResponse,
  DashboardSummary,
  InventoryFilters,
  InventoryResponse,
  ItemDetail,
  MovementHistoryFilters,
  MovementHistoryResponse,
  WarehouseFilterOptions,
} from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

export const warehouseApi = {
  async getFilterOptions(): Promise<WarehouseFilterOptions> {
    const response = await apiClient.get<WarehouseFilterOptions>(EP.FILTER_OPTIONS);
    return response.data;
  },

  async getInventory(filters: InventoryFilters): Promise<InventoryResponse> {
    const response = await apiClient.get<InventoryResponse>(EP.INVENTORY, {
      params: buildInventoryParams(filters),
    });
    return response.data;
  },

  async getItemDetail(itemCode: string): Promise<ItemDetail> {
    const response = await apiClient.get<ItemDetail>(EP.INVENTORY_DETAIL(itemCode));
    return response.data;
  },

  async getMovementHistory(
    itemCode: string,
    filters: MovementHistoryFilters,
  ): Promise<MovementHistoryResponse> {
    const response = await apiClient.get<MovementHistoryResponse>(
      EP.MOVEMENT_HISTORY(itemCode),
      { params: buildMovementParams(filters) },
    );
    return response.data;
  },

  async getDashboardSummary(warehouseCode?: string): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>(EP.DASHBOARD_SUMMARY, {
      params: warehouseCode ? { warehouse_code: warehouseCode } : undefined,
    });
    return response.data;
  },

  async getBatchExpiry(warehouseCode?: string): Promise<BatchExpiryResponse> {
    const response = await apiClient.get<BatchExpiryResponse>(EP.BATCH_EXPIRY, {
      params: warehouseCode ? { warehouse: warehouseCode } : undefined,
    });
    return response.data;
  },
};

function buildInventoryParams(filters: InventoryFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.search) p.search = filters.search;
  if (filters.warehouse) p.warehouse = filters.warehouse;
  if (filters.item_group) p.item_group = filters.item_group;
  return p;
}

function buildMovementParams(filters: MovementHistoryFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.warehouse) p.warehouse = filters.warehouse;
  if (filters.from_date) p.from_date = filters.from_date;
  if (filters.to_date) p.to_date = filters.to_date;
  return p;
}
