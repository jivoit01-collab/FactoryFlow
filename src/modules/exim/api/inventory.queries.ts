/**
 * React-query hooks for Warehouse Inventory.
 *
 * The server keeps SAP's figures two minutes, so the page does too. Refresh
 * reads SAP again, past that copy, and puts the answer where the page reads it;
 * a warehouse's items already read are read again, from the new copy.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { inventoryApi } from './inventory.api';

export const INVENTORY_KEYS = {
  all: ['exim', 'warehouse-inventory'] as const,
  summary: () => ['exim', 'warehouse-inventory', 'summary'] as const,
  items: (warehouse: string) => ['exim', 'warehouse-inventory', 'items', warehouse] as const,
};

const TWO_MINUTES = 2 * 60 * 1000;

export function useWarehouseInventory() {
  return useQuery({
    queryKey: INVENTORY_KEYS.summary(),
    queryFn: () => inventoryApi.warehouseInventory(),
    staleTime: TWO_MINUTES,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** One warehouse's items: only once a warehouse is opened. */
export function useWarehouseItems(warehouse: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.items(warehouse),
    queryFn: () => inventoryApi.warehouseInventory({ warehouse }),
    enabled: !!warehouse,
    staleTime: TWO_MINUTES,
    refetchOnWindowFocus: false,
    retry: false,
    select: (data) => data.items ?? [],
  });
}

export function useRefreshWarehouseInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => inventoryApi.warehouseInventory({ refresh: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(INVENTORY_KEYS.summary(), data);
      void queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'items'] });
    },
  });
}
