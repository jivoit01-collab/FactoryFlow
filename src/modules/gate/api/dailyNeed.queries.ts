import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dailyNeedApi, type CreateDailyNeedRequest } from './dailyNeed.api'

export function useDailyNeedCategories(enabled: boolean = true) {
  return useQuery({
    queryKey: ['dailyNeedCategories'],
    queryFn: () => dailyNeedApi.getCategories(),
    enabled,
  })
}

export function useDailyNeed(entryId: number | null) {
  return useQuery({
    queryKey: ['dailyNeed', entryId],
    queryFn: () => dailyNeedApi.get(entryId!),
    enabled: !!entryId,
  })
}

export function useCreateDailyNeed(entryId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDailyNeedRequest) => dailyNeedApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyNeed'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    },
  })
}
