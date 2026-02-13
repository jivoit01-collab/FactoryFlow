import { useQuery } from '@tanstack/react-query';

import { poApi } from './po.api';

export function useOpenPOs(supplierCode?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['openPOs', supplierCode],
    queryFn: () => poApi.getOpenPOs(supplierCode),
    enabled: enabled && !!supplierCode, // Only fetch when enabled and supplierCode exists
  });
}

export function useVendors(enabled: boolean = true) {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: () => poApi.getVendors(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
