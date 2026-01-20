import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  vehicleEntryApi,
  type CreateVehicleEntryRequest,
  type UpdateVehicleEntryRequest,
} from './vehicleEntry.api'

export function useVehicleEntries() {
  return useQuery({
    queryKey: ['vehicleEntries'],
    queryFn: () => vehicleEntryApi.getList(),
  })
}

export function useVehicleEntry(id: number | null) {
  return useQuery({
    queryKey: ['vehicleEntry', id],
    queryFn: () => vehicleEntryApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateVehicleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVehicleEntryRequest) => vehicleEntryApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch vehicle entries list
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    },
  })
}

export function useUpdateVehicleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVehicleEntryRequest }) =>
      vehicleEntryApi.update(id, data),
    onSuccess: () => {
      // Invalidate and refetch vehicle entries list and individual entry
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] })
    },
  })
}