import { useQuery } from '@tanstack/react-query';

import { activitiesApi } from './activities.api';

export const ACTIVITY_QUERY_KEYS = {
  all: ['activity-center'] as const,
  summary: (days: number) => [...ACTIVITY_QUERY_KEYS.all, 'summary', days] as const,
  pending: (module?: string) => [...ACTIVITY_QUERY_KEYS.all, 'pending', module ?? 'ALL'] as const,
  completed: (days: number, module?: string) =>
    [...ACTIVITY_QUERY_KEYS.all, 'completed', days, module ?? 'ALL'] as const,
  definitions: () => [...ACTIVITY_QUERY_KEYS.all, 'definitions'] as const,
  users: (days: number) => [...ACTIVITY_QUERY_KEYS.all, 'users', days] as const,
  userDetail: (userId: number, days: number) =>
    [...ACTIVITY_QUERY_KEYS.all, 'user', userId, days] as const,
  pendingCount: () => [...ACTIVITY_QUERY_KEYS.all, 'pending-count'] as const,
};

/**
 * Activities are derived from live records across every module, so they change
 * whenever anyone works. Kept fresh for a minute rather than cached hard.
 */
const STALE_TIME = 60 * 1000;

export function useMyActivitySummary(days = 0) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.summary(days),
    queryFn: () => activitiesApi.getMySummary({ days }),
    staleTime: STALE_TIME,
  });
}

export function useMyPendingActivities(module?: string) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.pending(module),
    queryFn: () => activitiesApi.getMyPending({ module }),
    staleTime: STALE_TIME,
  });
}

export function useMyCompletedActivities(days = 0, module?: string) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.completed(days, module),
    queryFn: () => activitiesApi.getMyCompleted({ days, module }),
    staleTime: STALE_TIME,
  });
}

export function useActivityDefinitions(enabled = true) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.definitions(),
    queryFn: () => activitiesApi.getDefinitions(),
    // The registry only changes on deploy.
    staleTime: 30 * 60 * 1000,
    enabled,
  });
}

export function useAllUsersActivity(days = 0, enabled = true) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.users(days),
    queryFn: () => activitiesApi.getAllUsers({ days }),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useUserActivityDetail(userId: number | null, days = 0) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.userDetail(userId!, days),
    queryFn: () => activitiesApi.getUserDetail(userId!, { days }),
    enabled: !!userId,
    staleTime: STALE_TIME,
  });
}

/** Sidebar badge — polls quietly so the count stays roughly live. */
export function useMyPendingCount(enabled = true) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.pendingCount(),
    queryFn: () => activitiesApi.getPendingCount(),
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
