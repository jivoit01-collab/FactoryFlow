import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  FireEquipmentIssueFilters,
  FireEquipmentIssuePayload,
  FireEquipmentReturnPayload,
} from '../types';
import { fireIssueApi } from './fireIssue.api';

export const FIRE_ISSUE_QUERY_KEYS = {
  all: ['maintenance', 'fire-issues'] as const,
  list: (filters?: FireEquipmentIssueFilters) =>
    [...FIRE_ISSUE_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  detail: (issueId: number) => [...FIRE_ISSUE_QUERY_KEYS.all, 'detail', issueId] as const,
};

function invalidateIssues(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FIRE_ISSUE_QUERY_KEYS.all });
  // Issues move Fire store stock, so refresh those views too.
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'fire'] });
}

export function useFireIssues(filters?: FireEquipmentIssueFilters, enabled = true) {
  return useQuery({
    queryKey: FIRE_ISSUE_QUERY_KEYS.list(filters),
    queryFn: () => fireIssueApi.getIssues(filters),
    enabled,
  });
}

export function useFireIssue(issueId: number | null) {
  return useQuery({
    queryKey: FIRE_ISSUE_QUERY_KEYS.detail(issueId!),
    queryFn: () => fireIssueApi.getIssue(issueId!),
    enabled: issueId !== null,
  });
}

export function useCreateFireIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireEquipmentIssuePayload) => fireIssueApi.createIssue(payload),
    onSuccess: () => invalidateIssues(queryClient),
  });
}

export function useDeleteFireIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: number) => fireIssueApi.deleteIssue(issueId),
    onSuccess: () => invalidateIssues(queryClient),
  });
}

export function useReturnFireIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, payload }: { issueId: number; payload: FireEquipmentReturnPayload }) =>
      fireIssueApi.returnItems(issueId, payload),
    onSuccess: () => invalidateIssues(queryClient),
  });
}
