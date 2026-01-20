import { useQuery } from '@tanstack/react-query'
import { poApi } from './po.api'

export function useOpenPOs(supplierCode?: string) {
  return useQuery({
    queryKey: ['openPOs', supplierCode],
    queryFn: () => poApi.getOpenPOs(supplierCode),
  })
}