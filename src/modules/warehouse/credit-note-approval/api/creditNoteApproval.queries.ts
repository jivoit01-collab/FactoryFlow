import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import type {
  CreditNoteApprovalStatus,
  CreditNoteDecisionPayload,
  CreditNoteFamily,
} from '../types';
import { creditNoteApprovalApi } from './creditNoteApproval.api';

export const CREDIT_NOTE_APPROVAL_QUERY_KEYS = {
  all: ['warehouse', 'credit-note-approvals'] as const,
  list: (status: CreditNoteApprovalStatus | 'ALL', family: CreditNoteFamily | 'ALL') =>
    [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'list', status, family] as const,
  pendingCount: () => [...CREDIT_NOTE_APPROVAL_QUERY_KEYS.all, 'pending-count'] as const,
};

export function useCreditNoteApprovals(
  status: CreditNoteApprovalStatus | 'ALL' = 'PENDING',
  family: CreditNoteFamily | 'ALL' = 'ALL',
) {
  return useQuery({
    queryKey: CREDIT_NOTE_APPROVAL_QUERY_KEYS.list(status, family),
    queryFn: () => creditNoteApprovalApi.list(status, family),
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
