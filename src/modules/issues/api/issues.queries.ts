/**
 * React-query hooks for the issue tracker.
 *
 * Query keys are namespaced `['issues', <resource>, …]`. Every mutation on one
 * issue invalidates that issue's detail AND its timeline AND the list -- a
 * closed issue changes its own badge, adds a timeline event, and moves between
 * the Open and Closed tabs, so refreshing only one of the three would leave the
 * screen disagreeing with itself.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SUPPORT_CONTACT_QUERY_KEY } from '@/config/constants';

import type {
  IssueCreatePayload,
  IssueLabel,
  IssueListFilters,
  IssueStatePayload,
  IssueUpdatePayload,
} from '../types';
import { issuesApi } from './issues.api';

type QueryClient = ReturnType<typeof useQueryClient>;

export const ISSUE_KEYS = {
  all: ['issues'] as const,
  meta: () => ['issues', 'meta'] as const,
  list: (filters?: IssueListFilters) => ['issues', 'list', filters ?? {}] as const,
  detail: (number: number) => ['issues', 'detail', number] as const,
  timeline: (number: number) => ['issues', 'timeline', number] as const,
  labels: () => ['issues', 'labels'] as const,
};

/** Refresh everything one issue's change could have altered. */
function invalidateIssue(queryClient: QueryClient, number?: number) {
  queryClient.invalidateQueries({ queryKey: ['issues', 'list'] });
  queryClient.invalidateQueries({ queryKey: ['issues', 'meta'] });
  if (number !== undefined) {
    queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.detail(number) });
    queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.timeline(number) });
  }
}

export function useIssueMeta() {
  return useQuery({
    queryKey: ISSUE_KEYS.meta(),
    queryFn: () => issuesApi.getMeta(),
    // The label and people lists barely move within a session.
    staleTime: 5 * 60 * 1000,
  });
}

export function useIssues(filters?: IssueListFilters) {
  return useQuery({
    queryKey: ISSUE_KEYS.list(filters),
    queryFn: () => issuesApi.list(filters),
    // Keep the previous page on screen while the next one loads, so paging and
    // retyping the search do not flash an empty list.
    placeholderData: (previous) => previous,
  });
}

export function useIssue(number: number, enabled = true) {
  return useQuery({
    queryKey: ISSUE_KEYS.detail(number),
    queryFn: () => issuesApi.get(number),
    enabled: enabled && Number.isFinite(number) && number > 0,
  });
}

export function useIssueTimeline(number: number, enabled = true) {
  return useQuery({
    queryKey: ISSUE_KEYS.timeline(number),
    queryFn: () => issuesApi.timeline(number),
    enabled: enabled && Number.isFinite(number) && number > 0,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IssueCreatePayload) => issuesApi.create(payload),
    onSuccess: (issue) => invalidateIssue(queryClient, issue.number),
  });
}

export function useUpdateIssue(number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IssueUpdatePayload) => issuesApi.update(number, payload),
    onSuccess: () => invalidateIssue(queryClient, number),
  });
}

export function useSetIssueState(number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IssueStatePayload) => issuesApi.setState(number, payload),
    onSuccess: () => invalidateIssue(queryClient, number),
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (number: number) => issuesApi.remove(number),
    onSuccess: () => invalidateIssue(queryClient),
  });
}

export function useBulkIssueState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { numbers: number[]; state: 'OPEN' | 'CLOSED'; reason?: string }) =>
      issuesApi.bulkState(payload),
    onSuccess: () => invalidateIssue(queryClient),
  });
}

export function useAddComment(number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { body: string; attachment_ids?: number[] }) =>
      issuesApi.addComment(number, payload),
    onSuccess: () => invalidateIssue(queryClient, number),
  });
}

export function useUpdateComment(number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: number; body: string }) =>
      issuesApi.updateComment(commentId, body),
    onSuccess: () => invalidateIssue(queryClient, number),
  });
}

export function useDeleteComment(number: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => issuesApi.deleteComment(commentId),
    onSuccess: () => invalidateIssue(queryClient, number),
  });
}

export function useUploadAttachments() {
  return useMutation({
    mutationFn: (files: File[]) => issuesApi.upload(files),
  });
}

// ---- Masters -------------------------------------------------------------

export function useIssueLabels() {
  return useQuery({ queryKey: ISSUE_KEYS.labels(), queryFn: () => issuesApi.getLabels() });
}

function invalidateMasters(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.labels() });
  queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.meta() });
  // A renamed or removed label shows on every row that carries it.
  queryClient.invalidateQueries({ queryKey: ['issues', 'list'] });
}

/**
 * Change the support number, then refresh every screen showing it — the
 * header menu and the login line read the same query key, so one
 * invalidation moves all of them.
 */
export function useSaveSupportContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => issuesApi.saveSupportContact(phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPORT_CONTACT_QUERY_KEY });
    },
  });
}

export function useSaveLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<IssueLabel> & { id?: number }) =>
      id ? issuesApi.updateLabel(id, payload) : issuesApi.createLabel(payload),
    onSuccess: () => invalidateMasters(queryClient),
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labelId: number) => issuesApi.deleteLabel(labelId),
    onSuccess: () => invalidateMasters(queryClient),
  });
}
