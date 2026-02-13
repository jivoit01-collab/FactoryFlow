import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type CreateDriverRequest, type UpdateDriverRequest, driverApi } from './driver.api'

/**
 * Fetch lightweight driver names for dropdown
 */
export function useDriverNames(enabled: boolean = true) {
  return useQuery({
    queryKey: ['driverNames'],
    queryFn: () => driverApi.getNames(),
    staleTime: 10 * 60 * 1000, // 10 minutes - drivers don't change often
    enabled,
  })
}

/**
 * Fetch full driver details by ID
 */
export function useDriverById(id: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverApi.getById(id!),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && id !== null,
  })
}

/**
 * Legacy: Fetch full list of drivers
 */
export function useDrivers(enabled: boolean = true) {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - drivers don't change often
    enabled,
  })
}

export function useCreateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDriverRequest) => driverApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['driverNames'] })
      queryClient.invalidateQueries({ queryKey: ['driver', data.id] })
    },
  })
}

export function useUpdateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateDriverRequest) => driverApi.update(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['driverNames'] })
      queryClient.invalidateQueries({ queryKey: ['driver', data.id] })
    },
  })
}
