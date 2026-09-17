import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { PLANT_BOARD_REFRESH_MS } from '../constants';
import type { WorkforceSetting } from '../types';
import type { WorkforceDraft, WorkforceEdit } from './plant-board.api';
import { plantBoardApi, plantBoardSpaceApi } from './plant-board.api';

export const PLANT_BOARD_QUERY_KEYS = {
  all: ['plant-board'] as const,
  board: (companyId?: number | string) => ['plant-board', 'board', companyId] as const,
  workforce: (companyId?: number | string) =>
    ['plant-board', 'workforce', companyId] as const,
  space: (companyId?: number | string) => ['plant-board', 'space', companyId] as const,
};

/**
 * The board, polled.
 *
 * Three choices worth knowing:
 *
 *  - **The interval comes from the response.** `meta.refresh_seconds` drives
 *    the next poll, so the cadence can be slowed from the server if SAP is
 *    struggling, without a frontend release. The constant is only the first
 *    interval.
 *  - **It keeps polling in the background.** `refetchIntervalInBackground` is
 *    on because the board's whole job is to be correct on a wall nobody is
 *    focused on. Without it a TV shows whatever was true when the tab last had
 *    focus, which on a wall is forever.
 *  - **A failure does not clear the screen.** The previous response stays
 *    rendered — the header carries the staleness — because a board that blanks
 *    on one bad round trip is worse than one that says how old it is.
 */
export function usePlantBoard(enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PLANT_BOARD_QUERY_KEYS.board(currentCompany?.company_id),
    queryFn: () => plantBoardApi.getBoard(),
    enabled,
    staleTime: PLANT_BOARD_REFRESH_MS,
    refetchInterval: (query) => {
      const seconds = query.state.data?.meta?.refresh_seconds;
      return seconds && seconds > 0 ? seconds * 1000 : PLANT_BOARD_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

/**
 * The staffing figures, for the settings page.
 *
 * Not polled. Unlike the board this is a form, and a background refetch landing
 * mid-edit is how a half-typed number gets thrown away.
 */
export function usePlantBoardWorkforce() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PLANT_BOARD_QUERY_KEYS.workforce(currentCompany?.company_id),
    queryFn: () => plantBoardApi.getWorkforce(),
    staleTime: Infinity,
  });
}

/**
 * Save changed departments.
 *
 * Invalidates the BOARD as well as the form, because the wall is the whole
 * point: a figure typed here has to reach the screen without waiting out the
 * poll interval.
 */
export function useSavePlantBoardWorkforce() {
  const { currentCompany } = useAuth();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (departments: WorkforceEdit[]) => plantBoardApi.saveWorkforce(departments),
    onSuccess: (data) => {
      client.setQueryData(
        PLANT_BOARD_QUERY_KEYS.workforce(currentCompany?.company_id),
        data,
      );
      void client.invalidateQueries({
        queryKey: PLANT_BOARD_QUERY_KEYS.board(currentCompany?.company_id),
      });
    },
  });
}

/**
 * Add or remove a department.
 *
 * Both write the returned catalogue straight into the form's cache and
 * invalidate the board, for the same reason saving a figure does: the wall is
 * the point, and a department added here should appear on it without waiting
 * out the poll interval.
 */
function useWorkforceCatalogueMutation<TArg>(
  run: (arg: TArg) => Promise<WorkforceSetting[]>,
) {
  const { currentCompany } = useAuth();
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: (data) => {
      client.setQueryData(
        PLANT_BOARD_QUERY_KEYS.workforce(currentCompany?.company_id),
        data,
      );
      void client.invalidateQueries({
        queryKey: PLANT_BOARD_QUERY_KEYS.board(currentCompany?.company_id),
      });
    },
  });
}

export function useAddPlantBoardDepartment() {
  return useWorkforceCatalogueMutation((draft: WorkforceDraft) =>
    plantBoardApi.addWorkforceDepartment(draft),
  );
}

export function useRemovePlantBoardDepartment() {
  return useWorkforceCatalogueMutation((key: string) =>
    plantBoardApi.removeWorkforceDepartment(key),
  );
}

/** The floor-area factor. Not polled: it is a form, not a feed. */
export function usePlantBoardSpace() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PLANT_BOARD_QUERY_KEYS.space(currentCompany?.company_id),
    queryFn: () => plantBoardSpaceApi.get(),
    staleTime: Infinity,
  });
}

/**
 * Save the factor.
 *
 * Invalidates the BOARD too: this number is the difference between the Stock
 * space tile reporting a percentage and reporting that it cannot, so it has to
 * reach the wall without waiting out the poll interval.
 */
export function useSavePlantBoardSpace() {
  const { currentCompany } = useAuth();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (sqftPerPallet: number | null) => plantBoardSpaceApi.save(sqftPerPallet),
    onSuccess: (data) => {
      client.setQueryData(PLANT_BOARD_QUERY_KEYS.space(currentCompany?.company_id), data);
      void client.invalidateQueries({
        queryKey: PLANT_BOARD_QUERY_KEYS.board(currentCompany?.company_id),
      });
    },
  });
}
