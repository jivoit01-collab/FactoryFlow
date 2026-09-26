import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/** An item from `/sap-lookups/items/` (code or name contains the search). */
export interface SapItemOption {
  item_code: string;
  item_name: string;
  uom: string;
}

export interface SapWarehouseOption {
  code: string;
  name: string;
}

export function useSapItemSearch(search: string) {
  return useQuery({
    queryKey: ['sapLookups', 'items', search],
    queryFn: async () => {
      const { data } = await apiClient.get<SapItemOption[]>(API_ENDPOINTS.SAP_LOOKUPS.ITEMS, {
        params: { search, limit: 30 },
      });
      return data;
    },
    enabled: search.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useSapWarehouses(enabled = true) {
  return useQuery({
    queryKey: ['sapLookups', 'warehouses'],
    queryFn: async () => {
      const { data } = await apiClient.get<SapWarehouseOption[]>(API_ENDPOINTS.SAP_LOOKUPS.WAREHOUSES);
      return data;
    },
    enabled,
    staleTime: 10 * 60_000,
  });
}
