import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApprovalRequest,
  CreateInspectionRequest,
  InspectionListParams,
  UpdateParameterResultRequest,
} from '../../types';
import { inspectionApi } from './inspection.api';

// Query keys
export const INSPECTION_QUERY_KEYS = {
  all: ['inspections'] as const,
  list: (params?: InspectionListParams) => [...INSPECTION_QUERY_KEYS.all, 'list', params] as const,
  pending: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'pending', params] as const,
  awaitingChemist: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'awaitingChemist', params] as const,
  awaitingQAM: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'awaitingQAM', params] as const,
  completed: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'completed', params] as const,
  rejected: (params?: InspectionListParams) =>
    [...INSPECTION_QUERY_KEYS.all, 'rejected', params] as const,
  detail: (id: number) => [...INSPECTION_QUERY_KEYS.all, 'detail', id] as const,
  forSlip: (slipId: number) => [...INSPECTION_QUERY_KEYS.all, 'forSlip', slipId] as const,
};

// Get all inspections with optional filters
export function useInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.list(params),
    queryFn: () => inspectionApi.getList(params),
    staleTime: 30 * 1000,
  });
}

// Get pending inspections (arrival slips awaiting inspection)
export function usePendingInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.pending(params),
    queryFn: () => inspectionApi.getPendingList(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Get inspections awaiting QA Chemist approval
export function useAwaitingChemistInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.awaitingChemist(params),
    queryFn: () => inspectionApi.getAwaitingChemist(params),
    staleTime: 30 * 1000,
  });
}

// Get inspections awaiting QA Manager approval
export function useAwaitingQAMInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.awaitingQAM(params),
    queryFn: () => inspectionApi.getAwaitingQAM(params),
    staleTime: 30 * 1000,
  });
}

// Get completed inspections
export function useCompletedInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.completed(params),
    queryFn: () => inspectionApi.getCompleted(params),
    staleTime: 30 * 1000,
  });
}

// Get rejected inspections
export function useRejectedInspections(params?: InspectionListParams) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.rejected(params),
    queryFn: () => inspectionApi.getRejected(params),
    staleTime: 30 * 1000,
  });
}

// Get inspection by ID
export function useInspection(id: number | null) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.detail(id!),
    queryFn: () => inspectionApi.getById(id!),
    enabled: !!id,
  });
}

// Get inspection for arrival slip
export function useInspectionForSlip(slipId: number | null) {
  return useQuery({
    queryKey: INSPECTION_QUERY_KEYS.forSlip(slipId!),
    queryFn: () => inspectionApi.getForSlip(slipId!),
    enabled: !!slipId,
  });
}

// Create inspection
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

// Update inspection
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

// Update parameter results
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

// Submit inspection
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

// QA Chemist approve
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

// QA Manager approve
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

// Reject inspection
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
