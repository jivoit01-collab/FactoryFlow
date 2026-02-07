import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { grpoApi } from './grpo.api'
import type { PostGRPORequest } from '../types'

// Query keys
export const GRPO_QUERY_KEYS = {
  all: ['grpo'] as const,
  pending: () => [...GRPO_QUERY_KEYS.all, 'pending'] as const,
  preview: (vehicleEntryId: number) =>
    [...GRPO_QUERY_KEYS.all, 'preview', vehicleEntryId] as const,
  history: (vehicleEntryId?: number) =>
    [...GRPO_QUERY_KEYS.all, 'history', vehicleEntryId] as const,
  detail: (postingId: number) => [...GRPO_QUERY_KEYS.all, 'detail', postingId] as const,
  warehouses: () => ['warehouses'] as const,
}

// Get pending GRPO entries
export function usePendingGRPOEntries() {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.pending(),
    queryFn: () => grpoApi.getPendingEntries(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// Get preview data for a vehicle entry
export function useGRPOPreview(vehicleEntryId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.preview(vehicleEntryId!),
    queryFn: () => grpoApi.getPreview(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  })
}

// Post GRPO to SAP
export function usePostGRPO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PostGRPORequest) => grpoApi.post(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.pending() })
      queryClient.invalidateQueries({
        queryKey: GRPO_QUERY_KEYS.preview(variables.vehicle_entry_id),
      })
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.history() })
    },
  })
}

// Get posting history
export function useGRPOHistory(vehicleEntryId?: number) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.history(vehicleEntryId),
    queryFn: () => grpoApi.getHistory(vehicleEntryId),
  })
}

// Get single posting detail
export function useGRPODetail(postingId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.detail(postingId!),
    queryFn: () => grpoApi.getDetail(postingId!),
    enabled: !!postingId,
  })
}

// Get warehouses (lazy - only fetches when enabled)
export function useWarehouses(enabled: boolean = true) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.warehouses(),
    queryFn: () => grpoApi.getWarehouses(),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
