import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { attachmentErrorMessage } from '@/modules/sap-documents/api';
import { openOrSave } from '@/modules/sap-documents/utils/attachments';

import type { SapApprovalFilters, SapDecisionInput, SapRejectionFilters } from '../types';
import { sapApprovalsApi } from './sap-approvals.api';

/** Every query key this module owns; `all` covers the lists, the detail and the badge. */
export const SAP_APPROVALS_QUERY_KEYS = {
  all: ['sap-approvals'] as const,
  list: (filters: SapApprovalFilters) =>
    [...SAP_APPROVALS_QUERY_KEYS.all, 'list', filters] as const,
  detail: (wddCode: number) => [...SAP_APPROVALS_QUERY_KEYS.all, 'detail', wddCode] as const,
  document: (wddCode: number) => [...SAP_APPROVALS_QUERY_KEYS.all, 'document', wddCode] as const,
  attachmentLines: (wddCode: number, absEntry: number) =>
    [...SAP_APPROVALS_QUERY_KEYS.all, 'attachment-lines', wddCode, absEntry] as const,
  pendingCount: () => [...SAP_APPROVALS_QUERY_KEYS.all, 'pending-count'] as const,
  rejections: (filters: SapRejectionFilters) =>
    [...SAP_APPROVALS_QUERY_KEYS.all, 'rejections', filters] as const,
};

export const SAP_APPROVALS_PATH = '/sap-approvals';

/** How often the badge re-polls while the approver is on the page… */
export const PENDING_COUNT_POLL_ON_PAGE_MS = 2 * 60 * 1000;
/** …and anywhere else: it is mounted on every page, and each poll reads HANA. */
export const PENDING_COUNT_POLL_OFF_PAGE_MS = 10 * 60 * 1000;

export function pendingCountPollMs(pathname: string): number {
  return pathname.startsWith(SAP_APPROVALS_PATH)
    ? PENDING_COUNT_POLL_ON_PAGE_MS
    : PENDING_COUNT_POLL_OFF_PAGE_MS;
}

/** The inbox a page at a time: a full page means there may be more ("Load more"). */
export function useSapApprovalRequests(filters: SapApprovalFilters) {
  return useInfiniteQuery({
    queryKey: SAP_APPROVALS_QUERY_KEYS.list(filters),
    queryFn: ({ pageParam }) => sapApprovalsApi.list(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.truncated ? (last.offset ?? 0) + last.limit : undefined),
    staleTime: 30 * 1000,
  });
}

export function useSapApprovalRequest(wddCode: number | null) {
  return useQuery({
    queryKey: SAP_APPROVALS_QUERY_KEYS.detail(wddCode ?? 0),
    queryFn: () => sapApprovalsApi.detail(wddCode as number),
    enabled: wddCode !== null,
    // A decision screen: read fresh each time it opens.
    staleTime: 0,
  });
}

/** Every rejection in the window, company-wide. A decision here refreshes it too (`all`). */
export function useSapRejectionHistory(filters: SapRejectionFilters) {
  return useQuery({
    queryKey: SAP_APPROVALS_QUERY_KEYS.rejections(filters),
    queryFn: () => sapApprovalsApi.rejections(filters),
    staleTime: 60 * 1000,
  });
}

/** The sidebar badge. `enabled` only for someone who holds the inbox right. */
export function useSapApprovalsPendingCount(enabled: boolean) {
  const { pathname } = useLocation();
  return useQuery({
    queryKey: SAP_APPROVALS_QUERY_KEYS.pendingCount(),
    queryFn: () => sapApprovalsApi.pendingCount(),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: pendingCountPollMs(pathname),
  });
}

/**
 * Decide and withdraw, as plain calls rather than `useMutation`: a mutation
 * keeps its variables in the query cache after it settles, and these carry a
 * typed SAP password. Here the password lives only in the dialog's own state
 * and this call's arguments. Both invalidate every list, the detail and the
 * badge once SAP has answered.
 */
export function useSapApprovalActions() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SAP_APPROVALS_QUERY_KEYS.all });
  return {
    invalidate,
    async decide(wddCode: number, input: SapDecisionInput) {
      const result = await sapApprovalsApi.decide(wddCode, input);
      await invalidate();
      return result;
    },
    async withdraw(wddCode: number, sapPassword?: string) {
      const result = await sapApprovalsApi.withdraw(wddCode, sapPassword);
      await invalidate();
      return result;
    },
  };
}

/** The request's draft in full, read only once the approver asks for it. */
export function useSapApprovalDocument(wddCode: number, enabled: boolean) {
  return useQuery({
    queryKey: SAP_APPROVALS_QUERY_KEYS.document(wddCode),
    queryFn: () => sapApprovalsApi.document(wddCode),
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useSapApprovalAttachmentLines(wddCode: number, absEntry: number) {
  return useQuery({
    queryKey: SAP_APPROVALS_QUERY_KEYS.attachmentLines(wddCode, absEntry),
    queryFn: () => sapApprovalsApi.attachmentLines(wddCode, absEntry),
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Fetch one of the request's attachments through the inbox and open or save it. */
export function useOpenSapApprovalAttachment(wddCode: number) {
  return useMutation({
    mutationFn: async ({ absEntry, line, fileName }: { absEntry: number; line: number; fileName: string }) => ({
      blob: await sapApprovalsApi.downloadAttachment(wddCode, absEntry, line),
      fileName,
    }),
    onSuccess: ({ blob, fileName }) => {
      openOrSave(blob, fileName);
    },
    onError: async (error) => {
      toast.error(await attachmentErrorMessage(error));
    },
  });
}
