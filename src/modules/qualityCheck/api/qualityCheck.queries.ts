import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/config/query.config'
import { qualityCheckApi } from './qualityCheck.api'
import type { SubmitQCRequest } from '../types/qualityCheck.types'

// Get all QC items with summary counts
export function useQCItems() {
  return useQuery({
    queryKey: QUERY_KEYS.qualityCheck.items(),
    queryFn: () => qualityCheckApi.getItems(),
  })
}

// Get QC summary counts only
export function useQCSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.qualityCheck.summary(),
    queryFn: () => qualityCheckApi.getSummary(),
  })
}

// Get single QC item detail
export function useQCItem(itemId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.qualityCheck.inspection(itemId),
    queryFn: () => qualityCheckApi.getItemById(itemId),
    enabled: !!itemId,
  })
}

// Get QC inspection detail
export function useQCInspection(itemId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.qualityCheck.inspection(itemId),
    queryFn: () => qualityCheckApi.getInspection(itemId),
    enabled: !!itemId,
  })
}

// Start QC inspection mutation
export function useStartQCInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: number) => qualityCheckApi.startInspection(itemId),
    onSuccess: (_data, itemId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.items() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.summary() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.inspection(itemId) })
    },
  })
}

// Submit QC inspection mutation (accept/reject/hold)
export function useSubmitQCInspection(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubmitQCRequest) => qualityCheckApi.submitInspection(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.items() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.summary() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.inspection(itemId) })
    },
  })
}

// Upload attachment mutation
export function useUploadQCAttachment(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => qualityCheckApi.uploadAttachment(itemId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.inspection(itemId) })
    },
  })
}

// Delete attachment mutation
export function useDeleteQCAttachment(itemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => qualityCheckApi.deleteAttachment(itemId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.inspection(itemId) })
    },
  })
}

// Legacy exports for backwards compatibility
export {
  useQCItems as useQualityCheckList,
  useQCInspection as useQualityCheckDetail,
}

export function useCreateQualityCheck() {
  return useStartQCInspection()
}

export function useUpdateQualityCheck(id: string) {
  return useSubmitQCInspection(parseInt(id, 10))
}

export function useDeleteQualityCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.items() })
    },
  })
}
