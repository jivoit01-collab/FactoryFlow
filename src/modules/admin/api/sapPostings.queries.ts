import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { type SapPostingListParams, sapPostingsApi } from './sapPostings.api';

export const SAP_POSTINGS_QUERY_KEYS = {
  all: ['sapPostings'] as const,
  list: (params?: SapPostingListParams) =>
    [...SAP_POSTINGS_QUERY_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...SAP_POSTINGS_QUERY_KEYS.all, 'detail', id] as const,
  counts: () => [...SAP_POSTINGS_QUERY_KEYS.all, 'counts'] as const,
};

function invalidateSapPostings(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: SAP_POSTINGS_QUERY_KEYS.all });
}

export function useSapPostings(
  params?: SapPostingListParams,
  options?: { enabled?: boolean; live?: boolean },
) {
  return useQuery({
    queryKey: SAP_POSTINGS_QUERY_KEYS.list(params),
    queryFn: () => sapPostingsApi.list(params),
    // The page being read stays up while the next one loads.
    placeholderData: keepPreviousData,
    // Only the to-do tabs move by themselves (the worker posts, SAP refuses);
    // a page of history does not need re-fetching every half minute.
    refetchInterval: options?.live ? 30_000 : false,
    staleTime: 10_000,
    enabled: options?.enabled ?? true,
  });
}

/** Waiting and refused counts, plus the kinds to filter by. What the badge polls. */
export function useSapPostingCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SAP_POSTINGS_QUERY_KEYS.counts(),
    queryFn: () => sapPostingsApi.counts(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useSapPosting(id: number | null) {
  return useQuery({
    queryKey: SAP_POSTINGS_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => sapPostingsApi.detail(id as number),
    enabled: id !== null,
    refetchInterval: 30_000,
  });
}

export function useRetrySapPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sapPostingsApi.retry(id),
    onSuccess: () => invalidateSapPostings(queryClient),
  });
}

export function useCancelSapPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      sapPostingsApi.cancel(id, reason),
    onSuccess: () => invalidateSapPostings(queryClient),
  });
}
