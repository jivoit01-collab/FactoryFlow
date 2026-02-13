import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateQCParameterRequest } from '../../types';
import { qcParameterApi } from './qcParameter.api';

// Query keys
export const QC_PARAMETER_QUERY_KEYS = {
  all: ['qcParameters'] as const,
  byMaterialType: (materialTypeId: number) =>
    [...QC_PARAMETER_QUERY_KEYS.all, 'byMaterialType', materialTypeId] as const,
  detail: (id: number) => [...QC_PARAMETER_QUERY_KEYS.all, 'detail', id] as const,
};

// Get parameters by material type
export function useQCParametersByMaterialType(materialTypeId: number | null) {
  return useQuery({
    queryKey: QC_PARAMETER_QUERY_KEYS.byMaterialType(materialTypeId!),
    queryFn: () => qcParameterApi.getByMaterialType(materialTypeId!),
    enabled: !!materialTypeId,
  });
}

// Get parameter by ID
export function useQCParameter(id: number | null) {
  return useQuery({
    queryKey: QC_PARAMETER_QUERY_KEYS.detail(id!),
    queryFn: () => qcParameterApi.getById(id!),
    enabled: !!id,
  });
}

// Create parameter
export function useCreateQCParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      materialTypeId,
      data,
    }: {
      materialTypeId: number;
      data: CreateQCParameterRequest;
    }) => qcParameterApi.create(materialTypeId, data),
    onSuccess: (_, { materialTypeId }) => {
      queryClient.invalidateQueries({
        queryKey: QC_PARAMETER_QUERY_KEYS.byMaterialType(materialTypeId),
      });
    },
  });
}

// Update parameter
export function useUpdateQCParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateQCParameterRequest }) =>
      qcParameterApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_PARAMETER_QUERY_KEYS.all });
    },
  });
}

// Delete parameter
export function useDeleteQCParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => qcParameterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_PARAMETER_QUERY_KEYS.all });
    },
  });
}
