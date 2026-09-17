import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ItemBatchResponse, WarehouseOccupancyResponse } from '../types';

export const productionControlApi = {
  /** One warehouse's stock plus the SAP pack fields that convert it to pallets. */
  /**
   * One warehouse's stock.
   *
   * `itemGroups` restricts to SAP item group codes and is opt-in: the
   * Production Control board wants everything standing on BH-PF, while a
   * stock-on-hand tonnage wants finished goods only. Omitting it keeps the
   * historic every-group answer.
   */
  async getWarehouseOccupancy(
    warehouse: string,
    itemGroups?: readonly number[],
  ): Promise<WarehouseOccupancyResponse> {
    const response = await apiClient.get<WarehouseOccupancyResponse>(
      API_ENDPOINTS.STOCK_DASHBOARD.OCCUPANCY,
      {
        params: {
          warehouse,
          ...(itemGroups?.length ? { item_groups: itemGroups.join(',') } : {}),
        },
      },
    );
    return response.data;
  },

  /** One item's batches in one warehouse, oldest make first. */
  async getItemBatches(itemCode: string, warehouse: string): Promise<ItemBatchResponse> {
    const response = await apiClient.get<ItemBatchResponse>(
      API_ENDPOINTS.STOCK_DASHBOARD.ITEM_BATCHES(itemCode),
      { params: { warehouse } },
    );
    return response.data;
  },
};
