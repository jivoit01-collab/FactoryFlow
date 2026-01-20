import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { driverApi, type CreateDriverRequest } from './driver.api'

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - drivers don't change often
  })
}

export function useCreateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDriverRequest) => driverApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })
}