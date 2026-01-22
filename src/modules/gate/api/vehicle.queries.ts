import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vehicleApi, type CreateVehicleRequest } from './vehicle.api'

/**
 * Fetch lightweight vehicle names for dropdown
 */
export function useVehicleNames(enabled: boolean = true) {
  return useQuery({
    queryKey: ['vehicleNames'],
    queryFn: () => vehicleApi.getNames(),
    staleTime: 10 * 60 * 1000, // 10 minutes - vehicles don't change often
    enabled,
  })
}

/**
 * Fetch full vehicle details by ID
 */
export function useVehicleById(id: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleApi.getById(id!),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && id !== null,
  })
}

/**
 * Legacy: Fetch full list of vehicles
 */
export function useVehicles(enabled: boolean = true) {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - vehicles don't change often
    enabled,
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVehicleRequest) => vehicleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleNames'] })
    },
  })
}