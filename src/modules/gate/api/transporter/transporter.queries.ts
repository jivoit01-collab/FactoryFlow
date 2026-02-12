import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type CreateTransporterRequest, transporterApi } from './transporter.api'

/**
 * Fetch lightweight transporter names for dropdown
 */
export function useTransporterNames(enabled: boolean = true) {
  return useQuery({
    queryKey: ['transporterNames'],
    queryFn: () => transporterApi.getNames(),
    staleTime: 10 * 60 * 1000, // 10 minutes - transporters don't change often
    enabled,
  })
}

/**
 * Fetch full transporter details by ID
 */
export function useTransporterById(id: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['transporter', id],
    queryFn: () => transporterApi.getById(id!),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && id !== null,
  })
}

/**
 * Legacy: Fetch full list of transporters
 */
export function useTransporters(enabled: boolean = true) {
  return useQuery({
    queryKey: ['transporters'],
    queryFn: () => transporterApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - transporters don't change often
    enabled,
  })
}

export function useCreateTransporter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTransporterRequest) => transporterApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
      queryClient.invalidateQueries({ queryKey: ['transporterNames'] })
    },
  })
}
