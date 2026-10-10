import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { FAClosureRequest, FAListParams, FAPOLinkRequest, FAPostRequest } from '../types';
import { faGrpoApi } from './faGrpo.api';

/**
 * Every Fixed Asset GRPO query sits under one root, so a mutation invalidates
 * the root and every list, entry and preview on screen refreshes together --
 * linking a PO moves an entry from Needs PO to Ready; posting moves it on to
 * History; a close takes it out of both.
 */
export const FA_GRPO_QUERY_KEYS = {
  all: ['fa-grpo'] as const,
  summary: () => [...FA_GRPO_QUERY_KEYS.all, 'summary'] as const,
  allEntries: (params: FAListParams) => [...FA_GRPO_QUERY_KEYS.all, 'all-entries', params] as const,
  pending: (params: FAListParams) => [...FA_GRPO_QUERY_KEYS.all, 'pending', params] as const,
  needsPO: (params: FAListParams) => [...FA_GRPO_QUERY_KEYS.all, 'needs-po', params] as const,
  history: (params: FAListParams) => [...FA_GRPO_QUERY_KEYS.all, 'history', params] as const,
  detail: (postingId: number) => [...FA_GRPO_QUERY_KEYS.all, 'detail', postingId] as const,
  entry: (vehicleEntryId: number) => [...FA_GRPO_QUERY_KEYS.all, 'entry', vehicleEntryId] as const,
  openPOs: (vehicleEntryId: number, supplierCode: string) =>
    [...FA_GRPO_QUERY_KEYS.all, 'open-pos', vehicleEntryId, supplierCode] as const,
  preview: (vehicleEntryId: number) =>
    [...FA_GRPO_QUERY_KEYS.all, 'preview', vehicleEntryId] as const,
};

// ─── reads ─────────────────────────────────────────────────────

export function useFAGRPOSummary() {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.summary(),
    queryFn: () => faGrpoApi.getSummary(),
    refetchInterval: 60_000,
  });
}

export function useFAAllEntries(params: FAListParams = {}, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.allEntries(params),
    queryFn: () => faGrpoApi.getAllEntries(params),
    enabled,
  });
}

/** "Ready to post". Refetched every minute, as grpo's pending lists are. */
export function useFAPendingEntries(params: FAListParams = {}, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.pending(params),
    queryFn: () => faGrpoApi.getPendingEntries(params),
    refetchInterval: 60_000,
    enabled,
  });
}

export function useFANeedsPO(params: FAListParams = {}, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.needsPO(params),
    queryFn: () => faGrpoApi.getNeedsPO(params),
    refetchInterval: 60_000,
    enabled,
  });
}

export function useFAHistory(params: FAListParams = {}, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.history(params),
    queryFn: () => faGrpoApi.getHistory(params),
    enabled,
  });
}

export function useFAGRPODetail(postingId: number | null) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.detail(postingId ?? 0),
    queryFn: () => faGrpoApi.getDetail(postingId!),
    enabled: !!postingId,
  });
}

export function useFAEntry(vehicleEntryId: number | null, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.entry(vehicleEntryId ?? 0),
    queryFn: () => faGrpoApi.getEntry(vehicleEntryId!),
    enabled: enabled && !!vehicleEntryId,
  });
}

/** Open FA PO lines of a supplier; asked for only once a supplier is chosen. */
export function useFAOpenPOs(vehicleEntryId: number | null, supplierCode: string, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.openPOs(vehicleEntryId ?? 0, supplierCode),
    queryFn: () => faGrpoApi.getOpenFAPOs(vehicleEntryId!, supplierCode),
    enabled: enabled && !!vehicleEntryId && !!supplierCode,
    // An SAP read: worth keeping for the life of the dialog, not re-asking per keystroke.
    staleTime: 60_000,
  });
}

export function useFAGRPOPreview(vehicleEntryId: number | null, enabled = true) {
  return useQuery({
    queryKey: FA_GRPO_QUERY_KEYS.preview(vehicleEntryId ?? 0),
    queryFn: () => faGrpoApi.getPreview(vehicleEntryId!),
    enabled: enabled && !!vehicleEntryId,
  });
}

// ─── writes (each invalidates the whole root) ──────────────────

function useInvalidateFA() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FA_GRPO_QUERY_KEYS.all });
}

export function useLinkFAPO(vehicleEntryId: number) {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: (data: FAPOLinkRequest) => faGrpoApi.linkPO(vehicleEntryId, data),
    onSuccess: invalidate,
  });
}

export function useUpdateFAPOLink(vehicleEntryId: number) {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: ({ poReceiptId, data }: { poReceiptId: number; data: FAPOLinkRequest }) =>
      faGrpoApi.updatePOLink(vehicleEntryId, poReceiptId, data),
    onSuccess: invalidate,
  });
}

export function useUnlinkFAPO(vehicleEntryId: number) {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: (poReceiptId: number) => faGrpoApi.unlinkPO(vehicleEntryId, poReceiptId),
    onSuccess: invalidate,
  });
}

export function useCloseFAEntry(vehicleEntryId: number) {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: (data: FAClosureRequest) => faGrpoApi.closeEntry(vehicleEntryId, data),
    onSuccess: invalidate,
  });
}

export function useReopenFAEntry(vehicleEntryId: number) {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: () => faGrpoApi.reopenEntry(vehicleEntryId),
    onSuccess: invalidate,
  });
}

/**
 * Post (or simulate). Invalidates on success **and** on failure: a refused
 * post leaves a FAILED draft behind, which the preview must pick up so the
 * next try reuses it (`grpo_posting_id`) instead of saving a second one.
 */
export function usePostFAGRPO() {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: (data: FAPostRequest) => faGrpoApi.post(data),
    onSettled: invalidate,
  });
}

export function useDiscardFADraft() {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: (postingId: number) => faGrpoApi.discardDraft(postingId),
    onSuccess: invalidate,
  });
}

export function useDiscardSimulatedFAGRPO() {
  const invalidate = useInvalidateFA();
  return useMutation({
    mutationFn: (postingId: number) => faGrpoApi.discardSimulated(postingId),
    onSuccess: invalidate,
  });
}
