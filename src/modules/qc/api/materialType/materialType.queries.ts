import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateMaterialTypeRequest, LinkMaterialTypeSAPItemRequest } from '../../types';
import {
  type ListMaterialTypesParams,
  type ListSAPItemsParams,
  materialTypeApi,
} from './materialType.api';

// Query keys
export const MATERIAL_TYPE_QUERY_KEYS = {
  all: ['materialTypes'] as const,
  lists: () => [...MATERIAL_TYPE_QUERY_KEYS.all, 'list'] as const,
  list: (params?: ListMaterialTypesParams) =>
    [...MATERIAL_TYPE_QUERY_KEYS.lists(), params] as const,
  detail: (id: number) => [...MATERIAL_TYPE_QUERY_KEYS.all, 'detail', id] as const,
  bySapItem: (itemCode: string) =>
    [...MATERIAL_TYPE_QUERY_KEYS.all, 'bySapItem', itemCode] as const,
  sapItems: (params?: ListSAPItemsParams) =>
    [...MATERIAL_TYPE_QUERY_KEYS.all, 'sapItems', params] as const,
};

// Get all material types
export function useMaterialTypes(params?: ListMaterialTypesParams, enabled = true) {
  return useQuery({
    queryKey: MATERIAL_TYPE_QUERY_KEYS.list(params),
    queryFn: () => materialTypeApi.getList(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

// Get material type by ID
export function useMaterialType(id: number | null) {
  return useQuery({
    queryKey: MATERIAL_TYPE_QUERY_KEYS.detail(id!),
    queryFn: () => materialTypeApi.getById(id!),
    enabled: !!id,
  });
}

// Get material type by linked SAP item
export function useMaterialTypeBySapItem(itemCode: string | null, enabled = true) {
  const normalizedItemCode = itemCode?.trim().toUpperCase() || '';

  return useQuery({
    queryKey: MATERIAL_TYPE_QUERY_KEYS.bySapItem(normalizedItemCode),
    queryFn: () => materialTypeApi.getBySapItem(normalizedItemCode),
    enabled: enabled && !!normalizedItemCode,
    retry: false,
  });
}

// Search SAP items for material type mapping
export function useSAPItems(search = '') {
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: MATERIAL_TYPE_QUERY_KEYS.sapItems({ search: normalizedSearch, limit: 50 }),
    queryFn: () =>
      materialTypeApi.searchSAPItems({
        search: normalizedSearch || undefined,
        limit: 50,
      }),
    enabled: normalizedSearch.length >= 2,
  });
}

// Create material type
export function useCreateMaterialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialTypeRequest) => materialTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() });
    },
  });
}

// Link SAP item to material type
export function useLinkMaterialTypeSAPItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LinkMaterialTypeSAPItemRequest) => materialTypeApi.linkSAPItem(data),
    onSuccess: (materialType, variables) => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: MATERIAL_TYPE_QUERY_KEYS.detail(materialType.id),
      });
      queryClient.invalidateQueries({
        queryKey: MATERIAL_TYPE_QUERY_KEYS.bySapItem(variables.item_code.trim().toUpperCase()),
      });
    },
  });
}

// Update material type
export function useUpdateMaterialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateMaterialTypeRequest }) =>
      materialTypeApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.detail(id) });
    },
  });
}

// Delete material type
export function useDeleteMaterialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => materialTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_TYPE_QUERY_KEYS.lists() });
    },
  });
}
