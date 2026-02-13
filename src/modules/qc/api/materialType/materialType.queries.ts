import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CreateMaterialTypeRequest } from '../../types'
import { type ListMaterialTypesParams, materialTypeApi } from './materialType.api'

// Query keys
export const MATERIAL_TYPE_QUERY_KEYS = {
  all: ['materialTypes'] as const,
  lists: () => [...MATERIAL_TYPE_QUERY_KEYS.all, 'list'] as const,
  list: (params?: ListMaterialTypesParams) =>
    [...MATERIAL_TYPE_QUERY_KEYS.lists(), params] as const,
  detail: (id: number) => [...MATERIAL_TYPE_QUERY_KEYS.all, 'detail', id] as const,
}

// Get all material types
export function useMaterialTypes(params?: ListMaterialTypesParams) {
  return useQuery({
    queryKey: MATERIAL_TYPE_QUERY_KEYS.list(params),
    queryFn: () => materialTypeApi.getList(params),
  })
}

// Get material type by ID
export function useMaterialType(id: number | null) {
  return useQuery({
    queryKey: MATERIAL_TYPE_QUERY_KEYS.detail(id!),
    queryFn: () => materialTypeApi.getById(id!),
    enabled: !!id,
  })
}

// Create material type
export function useCreateMaterialType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMaterialTypeRequest) => materialTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() })
    },
  })
}

// Update material type
export function useUpdateMaterialType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateMaterialTypeRequest }) =>
      materialTypeApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.detail(id) })
    },
  })
}

// Delete material type
export function useDeleteMaterialType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => materialTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() })
    },
  })
}
