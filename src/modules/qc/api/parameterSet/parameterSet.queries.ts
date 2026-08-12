import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CopyQCParametersRequest, CreateQCParameterSetRequest } from '../../types';
import { QC_PARAMETER_QUERY_KEYS } from '../qcParameter/qcParameter.queries';
import { parameterSetApi } from './parameterSet.api';
import { PARAMETER_SET_QUERY_KEYS } from './parameterSet.keys';

export { PARAMETER_SET_QUERY_KEYS };

export function useParameterSets(materialTypeId: number | null) {
  return useQuery({
    queryKey: PARAMETER_SET_QUERY_KEYS.byMaterialType(materialTypeId!),
    queryFn: () => parameterSetApi.getByMaterialType(materialTypeId!),
    enabled: !!materialTypeId,
  });
}

export function useParameterSet(parameterSetId: number | null) {
  return useQuery({
    queryKey: PARAMETER_SET_QUERY_KEYS.detail(parameterSetId!),
    queryFn: () => parameterSetApi.getById(parameterSetId!),
    enabled: !!parameterSetId,
  });
}

export function useCreateParameterSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      materialTypeId,
      data,
    }: {
      materialTypeId: number;
      data: CreateQCParameterSetRequest;
    }) => parameterSetApi.create(materialTypeId, data),
    onSuccess: (_, { materialTypeId }) => {
      queryClient.invalidateQueries({
        queryKey: PARAMETER_SET_QUERY_KEYS.byMaterialType(materialTypeId),
      });
    },
  });
}

export function useUpdateParameterSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      parameterSetId,
      data,
    }: {
      parameterSetId: number;
      data: CreateQCParameterSetRequest;
    }) => parameterSetApi.update(parameterSetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARAMETER_SET_QUERY_KEYS.all });
    },
  });
}

export function useDeleteParameterSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (parameterSetId: number) => parameterSetApi.delete(parameterSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARAMETER_SET_QUERY_KEYS.all });
      // Deleting a set retires its parameters too.
      queryClient.invalidateQueries({ queryKey: QC_PARAMETER_QUERY_KEYS.all });
    },
  });
}

export function useCopyParameters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      parameterSetId,
      data,
    }: {
      parameterSetId: number;
      data: CopyQCParametersRequest;
    }) => parameterSetApi.copyParameters(parameterSetId, data),
    onSuccess: (_, { parameterSetId }) => {
      // Both the set's parameter list and the counts on the tabs move.
      queryClient.invalidateQueries({
        queryKey: QC_PARAMETER_QUERY_KEYS.byParameterSet(parameterSetId),
      });
      queryClient.invalidateQueries({ queryKey: PARAMETER_SET_QUERY_KEYS.all });
    },
  });
}
