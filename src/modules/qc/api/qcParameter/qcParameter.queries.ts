import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateQCParameterRequest } from '../../types';
import { PARAMETER_SET_QUERY_KEYS } from '../parameterSet/parameterSet.keys';
import { qcParameterApi } from './qcParameter.api';

// Query keys
export const QC_PARAMETER_QUERY_KEYS = {
  all: ['qcParameters'] as const,
  byMaterialType: (materialTypeId: number) =>
    [...QC_PARAMETER_QUERY_KEYS.all, 'byMaterialType', materialTypeId] as const,
  byParameterSet: (parameterSetId: number) =>
    [...QC_PARAMETER_QUERY_KEYS.all, 'byParameterSet', parameterSetId] as const,
  detail: (id: number) => [...QC_PARAMETER_QUERY_KEYS.all, 'detail', id] as const,
};

// Get the parameters of one parameter set (one vendor's, or the default)
export function useQCParametersByParameterSet(parameterSetId: number | null) {
  return useQuery({
    queryKey: QC_PARAMETER_QUERY_KEYS.byParameterSet(parameterSetId!),
    queryFn: () => qcParameterApi.getByParameterSet(parameterSetId!),
    enabled: !!parameterSetId,
  });
}

// Get a material type's default parameters
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
      parameterSetId,
      data,
    }: {
      parameterSetId: number;
      data: CreateQCParameterRequest;
    }) => qcParameterApi.create(parameterSetId, data),
    onSuccess: (_, { parameterSetId }) => {
      queryClient.invalidateQueries({
        queryKey: QC_PARAMETER_QUERY_KEYS.byParameterSet(parameterSetId),
      });
      // The tab for this set shows a parameter count.
      queryClient.invalidateQueries({ queryKey: PARAMETER_SET_QUERY_KEYS.all });
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
      queryClient.invalidateQueries({ queryKey: PARAMETER_SET_QUERY_KEYS.all });
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
      queryClient.invalidateQueries({ queryKey: PARAMETER_SET_QUERY_KEYS.all });
    },
  });
}
