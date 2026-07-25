import { useQuery } from '@tanstack/react-query';

import { wmsApi } from './wms.api';

// Only the shared dropdown lookups remain after the WMS dashboards were removed.
export const WMS_QUERY_KEYS = {
  all: ['wms'] as const,
  warehouses: () => [...WMS_QUERY_KEYS.all, 'warehouses'] as const,
  itemGroups: () => [...WMS_QUERY_KEYS.all, 'item-groups'] as const,
};

export function useWMSWarehouses() {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.warehouses(),
    queryFn: () => wmsApi.getWarehouses(),
  });
}

export function useWMSItemGroups() {
  return useQuery({
    queryKey: WMS_QUERY_KEYS.itemGroups(),
    queryFn: () => wmsApi.getItemGroups(),
  });
}
