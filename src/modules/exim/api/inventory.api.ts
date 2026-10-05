import { apiClient } from '@/core/api';

import type { WarehouseInventory } from '../types';

export const INVENTORY_ENDPOINTS = {
  WAREHOUSE_INVENTORY: '/exim/warehouse-inventory/',
} as const;

/**
 * Read from SAP. When SAP does not answer the server says so (a 503 with its
 * reason), and the page shows it where the stock would be: no global toast.
 */
const QUIET = { suppressErrorToast: true };

export const inventoryApi = {
  /** Litres by warehouse and category; with `warehouse`, that warehouse's items too. */
  async warehouseInventory(
    options: { warehouse?: string; refresh?: boolean } = {},
  ): Promise<WarehouseInventory> {
    const params: Record<string, string | number> = {};
    if (options.warehouse) params.warehouse = options.warehouse;
    if (options.refresh) params.refresh = 1;
    return (
      await apiClient.get<WarehouseInventory>(INVENTORY_ENDPOINTS.WAREHOUSE_INVENTORY, {
        params,
        ...QUIET,
      })
    ).data;
  },
};
