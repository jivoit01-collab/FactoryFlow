import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { GRPOListParams, PostGRPORequest, PostServiceGRPORequest } from '../types';
import { grpoApi } from './grpo.api';

// Query keys
export const GRPO_QUERY_KEYS = {
  all: ['grpo'] as const,
  summary: () => [...GRPO_QUERY_KEYS.all, 'summary'] as const,
  pending: (params?: GRPOListParams) => [...GRPO_QUERY_KEYS.all, 'pending', params] as const,
  allEntries: (params?: GRPOListParams) => [...GRPO_QUERY_KEYS.all, 'all-entries', params] as const,
  preview: (vehicleEntryId: number) => [...GRPO_QUERY_KEYS.all, 'preview', vehicleEntryId] as const,
  expenseCodes: () => [...GRPO_QUERY_KEYS.all, 'expense-codes'] as const,
  history: (params?: GRPOListParams) => [...GRPO_QUERY_KEYS.all, 'history', params] as const,
  detail: (postingId: number) => [...GRPO_QUERY_KEYS.all, 'detail', postingId] as const,
  draft: (postingId: number) => [...GRPO_QUERY_KEYS.all, 'draft', postingId] as const,
  servicePending: (params?: GRPOListParams) =>
    [...GRPO_QUERY_KEYS.all, 'service', 'pending', params] as const,
  serviceSummary: (params?: { year?: number; month?: number }) =>
    [...GRPO_QUERY_KEYS.all, 'service', 'summary', params] as const,
  serviceOptions: () => [...GRPO_QUERY_KEYS.all, 'service', 'options'] as const,
  servicePreview: (dispatchPlanId: number) =>
    [...GRPO_QUERY_KEYS.all, 'service', 'preview', dispatchPlanId] as const,
  serviceHistory: (params?: GRPOListParams) =>
    [...GRPO_QUERY_KEYS.all, 'service', 'history', params] as const,
  serviceDetail: (postingId: number) =>
    [...GRPO_QUERY_KEYS.all, 'service', 'detail', postingId] as const,
  warehouses: () => ['warehouses'] as const,
  attachments: (postingId: number) => [...GRPO_QUERY_KEYS.all, 'attachments', postingId] as const,
  planBiltyAttachment: (dispatchPlanId: number) =>
    [...GRPO_QUERY_KEYS.all, 'service', 'plan-attachment', dispatchPlanId] as const,
};

// Get material GRPO dashboard insights
export function useGRPODashboardSummary() {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.summary(),
    queryFn: () => grpoApi.getSummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Get pending GRPO entries (paginated)
export function usePendingGRPOEntries(params: GRPOListParams = {}) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.pending(params),
    queryFn: () => grpoApi.getPendingEntries(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Get all gate entries visible to GRPO (gate / QC / done) — paginated + counts
export function useAllGRPOEntries(params: GRPOListParams = {}) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.allEntries(params),
    queryFn: () => grpoApi.getAllEntries(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Get preview data for a vehicle entry
export function useGRPOPreview(vehicleEntryId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.preview(vehicleEntryId!),
    queryFn: () => grpoApi.getPreview(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

// Post GRPO to SAP
export function usePostGRPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostGRPORequest) => grpoApi.post(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'pending'] });
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'all-entries'] });
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.summary() });
      queryClient.invalidateQueries({
        queryKey: GRPO_QUERY_KEYS.preview(variables.vehicle_entry_id),
      });
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'history'] });
    },
  });
}

// Save a GRPO draft (create or update). Pass { data, postingId? }.
export function useSaveGRPODraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, postingId }: { data: PostGRPORequest; postingId?: number }) =>
      grpoApi.saveDraft(data, postingId),
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'history'] });
      if (draft?.id != null) {
        queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.draft(draft.id) });
      }
    },
  });
}

// Load a saved draft (for hydration on edit / retry)
export function useGRPODraft(postingId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.draft(postingId!),
    queryFn: () => grpoApi.getDraft(postingId!),
    enabled: !!postingId,
    staleTime: 0,
  });
}

// Post a previously-saved draft to SAP
export function usePostSavedGRPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postingId: number) => grpoApi.postSavedDraft(postingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'pending'] });
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'all-entries'] });
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.summary() });
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'history'] });
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'preview'] });
    },
  });
}

// Discard an unposted draft/failed posting
export function useDeleteGRPODraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postingId: number) => grpoApi.deleteDraft(postingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...GRPO_QUERY_KEYS.all, 'history'] });
    },
  });
}

// Get posting history (paginated)
export function useGRPOHistory(params: GRPOListParams = {}) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.history(params),
    queryFn: () => grpoApi.getHistory(params),
  });
}

// Get single posting detail
export function useGRPODetail(postingId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.detail(postingId!),
    queryFn: () => grpoApi.getDetail(postingId!),
    enabled: !!postingId,
  });
}

export function usePendingServiceGRPOEntries(params: GRPOListParams = {}) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.servicePending(params),
    queryFn: () => grpoApi.getServicePendingEntries(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/** Queue KPIs + breakdowns for the Service GRPO page header. Kept on the same
 *  refresh cadence as the queue itself so the tiles and the table move together. */
export function useServiceGRPOSummary(params: { year?: number; month?: number } = {}) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.serviceSummary(params),
    queryFn: () => grpoApi.getServiceSummary(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useServiceGRPOPreview(dispatchPlanId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.servicePreview(dispatchPlanId!),
    queryFn: () => grpoApi.getServicePreview(dispatchPlanId!),
    enabled: !!dispatchPlanId,
  });
}

/** Bilty attachment of record on the plan, with its change history (audit trail). */
export function usePlanBiltyAttachment(dispatchPlanId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.planBiltyAttachment(dispatchPlanId!),
    queryFn: () => grpoApi.getPlanBiltyAttachment(dispatchPlanId!),
    enabled: !!dispatchPlanId,
  });
}

/** Both attachment mutations refresh the preview too — it renders the same file. */
function usePlanBiltyAttachmentInvalidation() {
  const queryClient = useQueryClient();
  return (dispatchPlanId: number) => {
    queryClient.invalidateQueries({
      queryKey: GRPO_QUERY_KEYS.planBiltyAttachment(dispatchPlanId),
    });
    queryClient.invalidateQueries({
      queryKey: GRPO_QUERY_KEYS.servicePreview(dispatchPlanId),
    });
    queryClient.invalidateQueries({
      queryKey: [...GRPO_QUERY_KEYS.all, 'service', 'pending'],
    });
  };
}

export function useReplacePlanBiltyAttachment() {
  const invalidate = usePlanBiltyAttachmentInvalidation();
  return useMutation({
    mutationFn: ({
      dispatchPlanId,
      file,
      reason,
    }: {
      dispatchPlanId: number;
      file: File;
      reason?: string;
    }) => grpoApi.replacePlanBiltyAttachment(dispatchPlanId, file, reason),
    onSuccess: (_, variables) => invalidate(variables.dispatchPlanId),
  });
}

export function useDeletePlanBiltyAttachment() {
  const invalidate = usePlanBiltyAttachmentInvalidation();
  return useMutation({
    mutationFn: ({ dispatchPlanId, reason }: { dispatchPlanId: number; reason?: string }) =>
      grpoApi.deletePlanBiltyAttachment(dispatchPlanId, reason),
    onSuccess: (_, variables) => invalidate(variables.dispatchPlanId),
  });
}

// SAP additional-expense master, for charges the operator adds by hand. PO
// freight needs no lookup — it is pre-filled from the preview payload.
export function useGRPOExpenseCodes(enabled: boolean = true) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.expenseCodes(),
    queryFn: () => grpoApi.getExpenseCodes(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceGRPOOptions(enabled: boolean = true) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.serviceOptions(),
    queryFn: () => grpoApi.getServiceOptions(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostServiceGRPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostServiceGRPORequest) => grpoApi.postService(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...GRPO_QUERY_KEYS.all, 'service', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: GRPO_QUERY_KEYS.servicePreview(variables.dispatch_plan_id),
      });
      queryClient.invalidateQueries({
        queryKey: [...GRPO_QUERY_KEYS.all, 'service', 'history'],
      });
    },
  });
}

export function useServiceGRPOHistory(params: GRPOListParams = {}) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.serviceHistory(params),
    queryFn: () => grpoApi.getServiceHistory(params),
  });
}

export function useServiceGRPODetail(postingId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.serviceDetail(postingId!),
    queryFn: () => grpoApi.getServiceDetail(postingId!),
    enabled: !!postingId,
  });
}

// Get warehouses (lazy - only fetches when enabled)
export function useWarehouses(enabled: boolean = true) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.warehouses(),
    queryFn: () => grpoApi.getWarehouses(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// List attachments for a GRPO posting
export function useGRPOAttachments(postingId: number | null) {
  return useQuery({
    queryKey: GRPO_QUERY_KEYS.attachments(postingId!),
    queryFn: () => grpoApi.getAttachments(postingId!),
    enabled: !!postingId,
  });
}

// Upload attachment to a GRPO posting
export function useUploadGRPOAttachment(postingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => grpoApi.uploadAttachment(postingId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.attachments(postingId) });
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.detail(postingId) });
    },
  });
}

// Delete a GRPO attachment
export function useDeleteGRPOAttachment(postingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => grpoApi.deleteAttachment(postingId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.attachments(postingId) });
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.detail(postingId) });
    },
  });
}

// Retry a failed SAP attachment upload
export function useRetryGRPOAttachment(postingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => grpoApi.retryAttachment(postingId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.attachments(postingId) });
      queryClient.invalidateQueries({ queryKey: GRPO_QUERY_KEYS.detail(postingId) });
    },
  });
}
