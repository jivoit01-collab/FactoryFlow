import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  WarehouseOption,
  ItemGroupOption,
} from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

// The WMS dashboard APIs were removed; these two SAP-HANA-backed lookups remain
// because they feed filter dropdowns in the barcode pallet pages and the
// stock-level dashboard.
export const wmsApi = {
  // Warehouses dropdown
  async getWarehouses(): Promise<{ warehouses: WarehouseOption[] }> {
    const res = await apiClient.get<{ warehouses: WarehouseOption[] }>(EP.WMS_WAREHOUSE_LIST);
    return res.data;
  },

  // Item Groups dropdown
  async getItemGroups(): Promise<{ item_groups: ItemGroupOption[] }> {
    const res = await apiClient.get<{ item_groups: ItemGroupOption[] }>(EP.WMS_ITEM_GROUPS);
    return res.data;
  },
};
