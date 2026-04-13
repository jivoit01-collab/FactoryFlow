import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateProductionQCSessionRequest,
  ProductionQCListParams,
  ProductionQCSubmitRequest,
  UpdateProductionQCResultRequest,
} from '../../types';
import { productionQCApi } from './productionQC.api';

// ============================================================================
// Query Keys
// ============================================================================

export const PRODUCTION_QC_QUERY_KEYS = {
  all: ['productionQC'] as const,
  lists: () => [...PRODUCTION_QC_QUERY_KEYS.all, 'list'] as const,
  list: (params?: ProductionQCListParams) =>
    [...PRODUCTION_QC_QUERY_KEYS.lists(), params] as const,
  counts: () => [...PRODUCTION_QC_QUERY_KEYS.all, 'counts'] as const,
  runSessions: (runId: number) =>
    [...PRODUCTION_QC_QUERY_KEYS.all, 'run', runId] as const,
  detail: (sessionId: number) =>
    [...PRODUCTION_QC_QUERY_KEYS.all, 'detail', sessionId] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useProductionQCList(params?: ProductionQCListParams) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.list(params),
    queryFn: () => productionQCApi.list(params),
    staleTime: 30_000,
  });
}

export function useProductionQCCounts() {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.counts(),
    queryFn: () => productionQCApi.counts(),
    staleTime: 30_000,
  });
}

export function useProductionQCRunSessions(
  runId: number | null,
  sessionType?: string,
) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.runSessions(runId!),
    queryFn: () => productionQCApi.getRunSessions(runId!, sessionType),
    enabled: !!runId,
    staleTime: 30_000,
  });
}

export function useProductionQCSession(sessionId: number | null) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.detail(sessionId!),
    queryFn: () => productionQCApi.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateProductionQCSession(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductionQCSessionRequest) =>
      productionQCApi.createSession(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.runSessions(runId),
      });
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.counts(),
      });
    },
  });
}

export function useDeleteProductionQCSession(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) =>
      productionQCApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.runSessions(runId),
      });
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.counts(),
      });
    },
  });
}

export function useUpdateProductionQCResults(sessionId: number, runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (results: UpdateProductionQCResultRequest[]) =>
      productionQCApi.updateResults(sessionId, results),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.detail(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.runSessions(runId),
      });
    },
  });
}

// `_runId` is reserved for future targeted invalidation (e.g. invalidating
// only the sessions belonging to this run). Current impl invalidates all.
export function useSubmitProductionQCSession(_runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: ProductionQCSubmitRequest }) =>
      productionQCApi.submitSession(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PRODUCTION_QC_QUERY_KEYS.all,
      });
    },
  });
}
