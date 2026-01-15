import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/config/query.config'
import { gateInApi } from './gateIn.api'
import type { ListParams } from '@/core/api/types'
import type { CreateGateInRequest, UpdateGateInRequest } from '../types/gateIn.types'

export function useGateInList(params?: ListParams) {
  return useQuery({
    queryKey: QUERY_KEYS.gateIn.list(params || {}),
    queryFn: () => gateInApi.getList(params),
  })
}

export function useGateInDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.gateIn.detail(id),
    queryFn: () => gateInApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateGateIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGateInRequest) => gateInApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gateIn.lists() })
    },
  })
}

export function useUpdateGateIn(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateGateInRequest) => gateInApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gateIn.lists() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gateIn.detail(id) })
    },
  })
}

export function useDeleteGateIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gateInApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.gateIn.lists() })
    },
  })
}
