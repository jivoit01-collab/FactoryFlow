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
  // Warehouses dropdown. `sap_copy_as_of` is set when HANA could not be reached
  // and the list came from the app's nightly copy of SAP's.
  async getWarehouses(): Promise<{ warehouses: WarehouseOption[]; sap_copy_as_of?: string }> {
    const res = await apiClient.get<{ warehouses: WarehouseOption[]; sap_copy_as_of?: string }>(
      EP.WMS_WAREHOUSE_LIST,
    );
    return res.data;
  },

  // Item Groups dropdown
  async getItemGroups(): Promise<{ item_groups: ItemGroupOption[] }> {
    const res = await apiClient.get<{ item_groups: ItemGroupOption[] }>(EP.WMS_ITEM_GROUPS);
    return res.data;
  },
};
