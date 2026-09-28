import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { attachmentErrorMessage } from '@/modules/sap-documents/api';
import { openOrSave } from '@/modules/sap-documents/utils/attachments';

import type {
  CreditNoteApprovalStatus,
  CreditNoteDecisionPayload,
  CreditNoteFamily,
  CreditNoteListFilters,
} from '../types';
import { CREDIT_NOTE_PAGE_SIZE, creditNoteApprovalApi } from './creditNoteApproval.api';

export const CREDIT_NOTE_APPROVAL_QUERY_KEYS = {
  all: ['warehouse', 'credit-note-approvals'] as const,
  list: (
    status: CreditNoteApprovalStatus | 'ALL',
    family: CreditNoteFamily | 'ALL',
    filters: CreditNoteListFilters = {},
  ) => [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'list', status, family, filters] as const,
  attachments: (wddCode: number) =>
    [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'attachments', wddCode] as const,
  pendingCount: () => [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'pending-count'] as const,
  print: (docEntry: number) =>
    [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'print', docEntry] as const,
  actions: (wddCode: number) =>
    [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'actions', wddCode] as const,
};

/**
 * The queue, a page at a time. A full page means there may be more, so the
 * page offers "Load more"; `filters` are searched in SAP.
 */
export function useCreditNoteApprovals(
  status: CreditNoteApprovalStatus | 'ALL' = 'PENDING',
  family: CreditNoteFamily | 'ALL' = 'ALL',
  filters: CreditNoteListFilters = {},
) {
  return useInfiniteQuery({
    queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.list(status, family, filters),
    queryFn: ({ pageParam }) => creditNoteApprovalApi.list(status, family, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length < CREDIT_NOTE_PAGE_SIZE ? undefined : pages.length * CREDIT_NOTE_PAGE_SIZE,
    staleTime: 30 * 1000,
  });
}

/** How often the badge re-polls while the approver is actually on the page. */
const PENDING_COUNT_POLL_ON_PAGE_MS = 2 * 60 * 1000;
/**
 * …and while they are anywhere else. The badge lives in the sidebar, so it is
 * mounted on every page of the app for every user who can view the queue, and
 * each poll is a HANA round trip. Off the page it only has to be roughly right.
 */
const PENDING_COUNT_POLL_OFF_PAGE_MS = 10 * 60 * 1000;

export function useCreditNotePendingCount() {
  const { pathname } = useLocation();
  const onPage = pathname.startsWith('/warehouse/credit-note-approval');

  return useQuery({
    queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.pendingCount(),
    queryFn: () => creditNoteApprovalApi.pendingCount(),
    staleTime: 60 * 1000,
    refetchInterval: onPage ? PENDING_COUNT_POLL_ON_PAGE_MS : PENDING_COUNT_POLL_OFF_PAGE_MS,
  });
}

/**
 * The printed credit note for one posted document, fetched only when asked.
 *
 * `null` until somebody presses Print: every sheet is a HANA read, and people
 * open a row to check what it credits far more often than to print it. Never
 * cached — the document can be edited in SAP after it is added, and a sheet
 * printed from a stale copy is the kind of error nobody catches until the
 * customer holds two different papers.
 */
export function useCreditNotePrint(docEntry: number | null) {
  return useQuery({
    queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.print(docEntry ?? 0),
    queryFn: () => creditNoteApprovalApi.getPrint(docEntry as number),
    enabled: docEntry !== null,
    gcTime: 0,
    staleTime: 0,
  });
}

export function useDecideCreditNoteApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wddCode, payload }: { wddCode: number; payload: CreditNoteDecisionPayload }) =>
      creditNoteApprovalApi.decide(wddCode, payload),
    onSuccess: () => {
      // The row leaves PENDING — `all` covers every tab, both families and the
      // sidebar badge.
      queryClient.invalidateQueries({ queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.all });
    },
  });
}

/** Withdraw / Without Qty Posting for one opened row; read fresh, never retried. */
export function useCreditNoteActions(wddCode: number, enabled: boolean) {
  return useQuery({
    queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.actions(wddCode),
    queryFn: () => creditNoteApprovalApi.actions(wddCode),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useWithdrawCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wddCode, sapPassword }: { wddCode: number; sapPassword?: string }) =>
      creditNoteApprovalApi.withdraw(wddCode, sapPassword),
    onSuccess: () => {
      // The request leaves PENDING: every tab, both families and the badge.
      queryClient.invalidateQueries({ queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.all });
    },
  });
}

/** The credit note's files and its base documents', read when asked for. */
export function useCreditNoteAttachments(wddCode: number, enabled: boolean) {
  return useQuery({
    queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.attachments(wddCode),
    queryFn: () => creditNoteApprovalApi.attachments(wddCode),
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Fetch one attachment through the queue's endpoint and open or save it. */
export function useOpenCreditNoteAttachment(wddCode: number) {
  return useMutation({
    mutationFn: async ({ absEntry, line, fileName }: { absEntry: number; line: number; fileName: string }) => ({
      blob: await creditNoteApprovalApi.downloadAttachment(wddCode, absEntry, line),
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
