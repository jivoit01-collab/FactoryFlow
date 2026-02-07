import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionApi } from './inspection.api'
import type {
  CreateInspectionRequest,
  UpdateParameterResultRequest,
  ApprovalRequest,
} from '../../types'

// Query keys
export const INSPECTION_QUERY_KEYS = {
  all: ['inspections'] as const,
  pending: () => [...INSPECTION_QUERY_KEYS.all, 'pending'] as const,
  detail: (id: number) => [...INSPECTION_QUERY_KEYS.all, 'detail', id] as const,
  forSlip: (slipId: number) => [...INSPECTION_QUERY_KEYS.all, 'forSlip', slipId] as const,
}

// Get pending inspections (arrival slips awaiting inspection)
export function usePendingInspections() {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.pending(),
    queryFn: () => inspectionApi.getPendingList(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  })
}

// Get inspection by ID
export function useInspection(id: number | null) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.detail(id!),
    queryFn: () => inspectionApi.getById(id!),
    enabled: !!id,
  })
}

// Get inspection for arrival slip
export function useInspectionForSlip(slipId: number | null) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId!),
    queryFn: () => inspectionApi.getForSlip(slipId!),
    enabled: !!slipId,
  })
}

// Create inspection
export function useCreateInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slipId, data }: { slipId: number; data: CreateInspectionRequest }) =>
      inspectionApi.create(slipId, data),
    onSuccess: (_, { slipId }) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.pending() })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId) })
    },
  })
}

// Update inspection
export function useUpdateInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slipId, data }: { slipId: number; data: CreateInspectionRequest }) =>
      inspectionApi.update(slipId, data),
    onSuccess: (result, { slipId }) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId) })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) })
    },
  })
}

// Update parameter results
export function useUpdateParameterResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      inspectionId,
      results,
    }: {
      inspectionId: number
      results: UpdateParameterResultRequest[]
    }) => inspectionApi.updateParameters(inspectionId, results),
    onSuccess: (_, { inspectionId }) => {
      // Invalidate all inspection queries to ensure data refreshes
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(inspectionId) })
    },
  })
}

// Submit inspection
export function useSubmitInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => inspectionApi.submit(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) })
    },
  })
}

// QA Chemist approve
export function useApproveAsChemist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalRequest }) =>
      inspectionApi.approveAsChemist(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) })
    },
  })
}

// QA Manager approve
export function useApproveAsQAM() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalRequest }) =>
      inspectionApi.approveAsQAM(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) })
    },
  })
}

// Reject inspection
export function useRejectInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalRequest }) =>
      inspectionApi.reject(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) })
    },
  })
}
