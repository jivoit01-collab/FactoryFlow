import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { WarehousePrintInfo } from '../types';

export const printInfoApi = {
  /** Letterhead + per-warehouse address/GST for the Branch Stock Transfer print. */
  async get(warehouseCodes: string[]): Promise<WarehousePrintInfo> {
    const res = await apiClient.get<WarehousePrintInfo>(API_ENDPOINTS.WAREHOUSE.PRINT_INFO, {
      params: { warehouses: warehouseCodes.join(',') },
    });
    return res.data;
  },
};
