import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/config/query.config'
import { qualityCheckApi } from './qualityCheck.api'
import type { ListParams } from '@/core/api/types'
import type {
  CreateQualityCheckRequest,
  UpdateQualityCheckRequest,
} from '../types/qualityCheck.types'

export function useQualityCheckList(params?: ListParams) {
  return useQuery({
    queryKey: QUERY_KEYS.qualityCheck.list(params || {}),
    queryFn: () => qualityCheckApi.getList(params),
  })
}

export function useQualityCheckDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.qualityCheck.detail(id),
    queryFn: () => qualityCheckApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateQualityCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateQualityCheckRequest) => qualityCheckApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.lists() })
    },
  })
}

export function useUpdateQualityCheck(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateQualityCheckRequest) => qualityCheckApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.lists() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.detail(id) })
    },
  })
}

export function useDeleteQualityCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => qualityCheckApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qualityCheck.lists() })
    },
  })
}
