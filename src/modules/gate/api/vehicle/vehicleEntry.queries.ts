import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type CreateVehicleEntryRequest,
  type UpdateVehicleEntryRequest,
  type VehicleEntriesParams,
  vehicleEntryApi,
} from './vehicleEntry.api'

export function useVehicleEntries(params?: VehicleEntriesParams) {
  return useQuery({
    queryKey: [
      'vehicleEntries',
      params?.from_date,
      params?.to_date,
      params?.entry_type,
      params?.status,
    ],
    queryFn: () => vehicleEntryApi.getList(params),
  })
}

export function useVehicleEntriesCount(params?: VehicleEntriesParams) {
  return useQuery({
    queryKey: ['vehicleEntriesCount', params?.from_date, params?.to_date, params?.entry_type],
    queryFn: () => vehicleEntryApi.getCount(params),
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
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] })
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
    },
  })
}

export function useUpdateVehicleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVehicleEntryRequest }) =>
      vehicleEntryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] })
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
    },
  })
}
