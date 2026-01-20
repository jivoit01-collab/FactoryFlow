import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vehicleApi, type CreateVehicleRequest } from './vehicle.api'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - vehicles don't change often
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVehicleRequest) => vehicleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}