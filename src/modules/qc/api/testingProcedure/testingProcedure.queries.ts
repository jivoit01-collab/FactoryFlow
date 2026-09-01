import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ListTestingProceduresParams,
  SaveTestingProcedureRequest,
} from '../../types/testingProcedure.types';
import { testingProcedureApi } from './testingProcedure.api';

export const TESTING_PROCEDURE_QUERY_KEYS = {
  all: ['testingProcedures'] as const,
  list: (params: ListTestingProceduresParams) =>
    [...TESTING_PROCEDURE_QUERY_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...TESTING_PROCEDURE_QUERY_KEYS.all, 'detail', id] as const,
  counts: () => [...TESTING_PROCEDURE_QUERY_KEYS.all, 'counts'] as const,
};

export function useTestingProcedures(params: ListTestingProceduresParams = {}) {
  return useQuery({
    queryKey: TESTING_PROCEDURE_QUERY_KEYS.list(params),
    queryFn: () => testingProcedureApi.list(params),
  });
}

export function useTestingProcedure(id: number | null) {
  return useQuery({
    queryKey: TESTING_PROCEDURE_QUERY_KEYS.detail(id!),
    queryFn: () => testingProcedureApi.getById(id!),
    enabled: !!id,
  });
}

export function useTestingProcedureCounts() {
  return useQuery({
    queryKey: TESTING_PROCEDURE_QUERY_KEYS.counts(),
    queryFn: () => testingProcedureApi.counts(),
  });
}

export function useCreateTestingProcedure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveTestingProcedureRequest) => testingProcedureApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TESTING_PROCEDURE_QUERY_KEYS.all });
    },
  });
}

export function useUpdateTestingProcedure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SaveTestingProcedureRequest> }) =>
      testingProcedureApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TESTING_PROCEDURE_QUERY_KEYS.all });
    },
  });
}

export function useDeleteTestingProcedure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => testingProcedureApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TESTING_PROCEDURE_QUERY_KEYS.all });
    },
  });
}
