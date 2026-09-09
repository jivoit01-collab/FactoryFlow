import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { WarehouseOccupancyResponse } from '../types';

export const productionControlApi = {
  /** One warehouse's stock plus the SAP pack fields that convert it to pallets. */
  async getWarehouseOccupancy(warehouse: string): Promise<WarehouseOccupancyResponse> {
    const response = await apiClient.get<WarehouseOccupancyResponse>(
      API_ENDPOINTS.STOCK_DASHBOARD.OCCUPANCY,
      { params: { warehouse } },
    );
    return response.data;
  },
};
