import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { MY_SHEET_STALE_MS, TEAM_BOARD_STALE_MS } from '../constants';
import type { DailyBoard, DailySheet } from '../types';
import { dailyTasksApi } from './daily-tasks.api';

// ===== Query Keys =====
// Company is part of the key because both endpoints are scoped by the `Company-Code`
// header — switching company must not serve another company's counts from cache.

export const DAILY_TASKS_QUERY_KEYS = {
  all: ['daily-tasks'] as const,
  mySheet: (date: string | undefined, companyId?: number) =>
    [...DAILY_TASKS_QUERY_KEYS.all, 'my-sheet', companyId, date ?? 'today'] as const,
  teamBoard: (date: string | undefined, companyId?: number) =>
    [...DAILY_TASKS_QUERY_KEYS.all, 'team-board', companyId, date ?? 'today'] as const,
};

// Both endpoints are read-only — the sheet is derived from records other modules
// write, never ticked by hand. There is deliberately no mutation and therefore no
// `invalidateDailyTasks` helper.

/**
 * This is the one page where returning to the tab should re-check, so it opts out of
 * the app-wide `refetchOnWindowFocus: false`.
 */
export function useMyDailySheet(date?: string) {
  const { currentCompany } = useAuth();

  return useQuery<DailySheet>({
    queryKey: DAILY_TASKS_QUERY_KEYS.mySheet(date, currentCompany?.company_id),
    queryFn: () => dailyTasksApi.getMySheet({ date }),
    staleTime: MY_SHEET_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * The board runs ~42 aggregate queries server-side, so it is left to explicit refetch
 * — no interval, and a longer stale window than the personal sheet.
 */
export function useTeamDailyBoard(date?: string, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery<DailyBoard>({
    queryKey: DAILY_TASKS_QUERY_KEYS.teamBoard(date, currentCompany?.company_id),
    queryFn: () => dailyTasksApi.getTeamBoard({ date }),
    staleTime: TEAM_BOARD_STALE_MS,
    enabled,
  });
}
