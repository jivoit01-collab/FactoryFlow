import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { poReceiptApi } from './poReceipt.api'
import type { CreatePOReceiptRequest } from './po.api'

export function usePOReceipts(entryId: number | null) {
  return useQuery({
    queryKey: ['poReceipts', entryId],
    queryFn: () => poReceiptApi.get(entryId!),
    enabled: !!entryId,
  })
}

export function useCreatePOReceipt(entryId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePOReceiptRequest) => poReceiptApi.create(entryId, data),
    onSuccess: () => {
      // Invalidate related queries if needed
      queryClient.invalidateQueries({ queryKey: ['poReceipts'] })
    },
  })
}