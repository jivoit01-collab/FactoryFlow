import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApprovalRequest,
  CreateInspectionRequest,
  InspectionListItem,
  InspectionListParams,
  UpdateParameterResultRequest,
} from '../../types';
import { inspectionApi } from './inspection.api';

// Query keys
export const INSPECTION_QUERY_KEYS = {
  all: ['inspections'] as const,
  list: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'list', ...(params ? [params] : [])] as const,
  pending: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'pending', ...(params ? [params] : [])] as const,
  draft: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'draft', ...(params ? [params] : [])] as const,
  actionable: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'actionable', ...(params ? [params] : [])] as const,
  awaitingChemist: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'awaitingChemist', ...(params ? [params] : [])] as const,
  awaitingQAM: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'awaitingQAM', ...(params ? [params] : [])] as const,
  completed: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'completed', ...(params ? [params] : [])] as const,
  rejected: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'rejected', ...(params ? [params] : [])] as const,
  counts: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'counts', ...(params ? [params] : [])] as const,
  detail: (id: number) => [...INSPECTION_QUERY_KEYS.all, 'detail', id] as const,
  forSlip: (slipId: number) => [...INSPECTION_QUERY_KEYS.all, 'forSlip', slipId] as const,
};

// ── Tab-based list hook (used by PendingInspectionsPage) ─────────────

type TabKey = 'all' | 'actionable' | 'pending' | 'draft' | 'approved' | 'rejected';

const TAB_API_MAP: Record<
  TabKey,
  {
    key: (params?: InspectionListParams) => readonly unknown[];
    fn: (params?: InspectionListParams) => Promise<InspectionListItem[]>;
  }
> = {
  all: { key: INSPECTION_QUERY_KEYS.list, fn: inspectionApi.getList },
  actionable: { key: INSPECTION_QUERY_KEYS.actionable, fn: inspectionApi.getActionableList },
  pending: { key: INSPECTION_QUERY_KEYS.pending, fn: inspectionApi.getPendingList },
  draft: { key: INSPECTION_QUERY_KEYS.draft, fn: inspectionApi.getDraftList },
  approved: {
    key: INSPECTION_QUERY_KEYS.completed,
    fn: (params) => inspectionApi.getCompletedList({ ...params, final_status: 'ACCEPTED' }),
  },
  rejected: { key: INSPECTION_QUERY_KEYS.rejected, fn: inspectionApi.getRejectedList },
};

/**
 * Fetches the correct list endpoint based on active tab.
 * Single hook call — React Query handles caching per tab.
 */
export function useInspectionsByTab(tab: string, params?: InspectionListParams) {
  const { key, fn } = TAB_API_MAP[tab as TabKey] || TAB_API_MAP.all;

  return useQuery({
    queryKey: key(params),
    queryFn: () => fn(params),
    staleTime: 30 * 1000,
  });
}

// ── Individual list hooks (for specific use cases) ───────────────────

export function useInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.list(params),
    queryFn: () => inspectionApi.getList(params),
    staleTime: 30 * 1000,
  });
}

export function usePendingInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.pending(params),
    queryFn: () => inspectionApi.getPendingList(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useActionableInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.actionable(params),
    queryFn: () => inspectionApi.getActionableList(params),
    staleTime: 30 * 1000,
  });
}

// Approval queue hooks (return full Inspection, not InspectionListItem)
export function useAwaitingChemistInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.awaitingChemist(params),
    queryFn: () => inspectionApi.getAwaitingChemist(params),
    staleTime: 30 * 1000,
  });
}

export function useAwaitingQAMInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.awaitingQAM(params),
    queryFn: () => inspectionApi.getAwaitingQAM(params),
    staleTime: 30 * 1000,
  });
}

export function useCompletedInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.completed(params),
    queryFn: () => inspectionApi.getCompletedList(params),
    staleTime: 30 * 1000,
  });
}

export function useRejectedInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.rejected(params),
    queryFn: () => inspectionApi.getRejectedList(params),
    staleTime: 30 * 1000,
  });
}

// ── Counts hook (used by dashboard) ──────────────────────────────────

export function useInspectionCounts(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.counts(params),
    queryFn: () => inspectionApi.getCounts(params),
    staleTime: 30 * 1000,
  });
}

// ── Detail hooks ─────────────────────────────────────────────────────

export function useInspection(id: number | null) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.detail(id!),
    queryFn: () => inspectionApi.getById(id!),
    enabled: !!id,
  });
}

export function useInspectionForSlip(slipId: number | null) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId!),
    queryFn: () => inspectionApi.getForSlip(slipId!),
    enabled: !!slipId,
  });
}

// ── Mutation hooks ───────────────────────────────────────────────────

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slipId, data }: { slipId: number; data: CreateInspectionRequest }) =>
      inspectionApi.create(slipId, data),
    onSuccess: (_, { slipId }) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId) });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slipId, data }: { slipId: number; data: CreateInspectionRequest }) =>
      inspectionApi.update(slipId, data),
    onSuccess: (result, { slipId }) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId) });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) });
    },
  });
}

export function useUpdateParameterResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      results,
    }: {
      inspectionId: number;
      results: UpdateParameterResultRequest[];
    }) => inspectionApi.updateParameters(inspectionId, results),
    onSuccess: (_, { inspectionId }) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(inspectionId) });
    },
  });
}

export function useSubmitInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inspectionApi.submit(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) });
    },
  });
}

export function useApproveAsChemist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalRequest }) =>
      inspectionApi.approveAsChemist(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) });
    },
  });
}

export function useApproveAsQAM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalRequest }) =>
      inspectionApi.approveAsQAM(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) });
    },
  });
}

export function useRejectInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalRequest }) =>
      inspectionApi.reject(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.detail(result.id) });
    },
  });
}
