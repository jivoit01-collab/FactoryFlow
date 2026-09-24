/**
 * The civil board's feed: the construction register, filtered to what is being
 * built now.
 *
 * IT READS THE MODULE'S OWN ENDPOINT AND THE MODULE'S OWN CACHE KEYS. There is
 * no board endpoint behind this and no aggregate to build one from — the
 * Construction module already owns `/construction/projects/`, already types it
 * and already caches it under `CONSTRUCTION_KEYS`. Reusing those keys means a
 * project approved on the register page appears here without a second request,
 * and — much more to the point — means the two screens cannot disagree about a
 * capex figure, because there is only one answer in the cache.
 *
 * WHY NOT `useProjects()`, WHICH IS RIGHT THERE. Because this board hangs on a
 * wall and that hook does not refresh. Calling `useQuery` directly with the
 * module's key and the module's api function shares everything worth sharing
 * and adds the one thing a wall display needs. A `refetchInterval` argument
 * bolted onto the module's hook would push a board's concern into a screen
 * that does not have it.
 *
 * WHAT THIS HOOK WILL NOT DO. Compute anything. It fetches, maps through
 * `civilProjectFromRegister`, and reports which of its two reads answered.
 * Every percentage on the board is worked out by the board.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CONSTRUCTION_KEYS, constructionApi } from '@/modules/construction/api';
import type { ProjectFilters } from '@/modules/construction/types';

import {
  CIVIL_BOARD_REFRESH_MS,
  CIVIL_BOARD_STALE_MS,
  CIVIL_ONGOING_STATUSES,
  CIVIL_REVISION_STALE_MS,
} from '../constants';
import type { CivilBoardFeed, CivilBoardState } from '../types';
import { civilProjectFromRegister } from '../utils';

/**
 * What the board asks the register for.
 *
 * Module-level and frozen rather than built in the body, because it goes into
 * the query key: an object literal rebuilt each render is a new key each
 * render, and the board would refetch itself forever.
 */
const ONGOING: ProjectFilters = { status: CIVIL_ONGOING_STATUSES };

export function useCivilBoard(): CivilBoardFeed {
  const register = useQuery({
    queryKey: CONSTRUCTION_KEYS.projects(ONGOING),
    queryFn: () => constructionApi.listProjects(ONGOING),
    staleTime: CIVIL_BOARD_STALE_MS,
    refetchInterval: CIVIL_BOARD_REFRESH_MS,
    // A wall board is usually the only tab on its machine and is never
    // focused; without this the interval is the only thing keeping it current.
    refetchIntervalInBackground: true,
  });

  const rows = useMemo(() => register.data ?? [], [register.data]);

  /*
   * One revision history per project, for the ORIGINAL committed date.
   *
   * The register's list payload carries today's end date and not the date the
   * project promised when it was sanctioned — that lives on its revisions, and
   * there is no bulk endpoint for them. So this is one small read per live
   * project, which is a handful of rows, not a page of them.
   *
   * It is deliberately NOT part of what the board waits for. A programme's
   * original date is a line under the timeline; the timeline itself comes from
   * the register, and blocking every row on the slowest revision history would
   * trade the whole board for one footnote.
   */
  const histories = useQueries({
    queries: rows.map((project) => ({
      queryKey: CONSTRUCTION_KEYS.revisions(project.id),
      queryFn: () => constructionApi.listRevisions(project.id),
      // Revisions are decided by a director a few times a year. Re-reading
      // them on the board's own five-minute heartbeat would be one request per
      // project per five minutes for a figure that changes quarterly.
      staleTime: CIVIL_REVISION_STALE_MS,
    })),
  });

  /*
   * A dependency that is one string and not a variable-length list.
   *
   * `histories` is a new array of new wrappers on every render, so it cannot
   * be a dependency itself, and spreading it would hand `useMemo` a dep array
   * whose LENGTH changes as projects arrive — which React does not support.
   * Every history stamps the moment its data last changed; the join of those
   * stamps changes exactly when one of them answers, and at no other time.
   */
  const historyStamp = histories.map((history) => history.dataUpdatedAt).join('|');

  const projects = useMemo(
    () => rows.map((item, index) => civilProjectFromRegister(item, histories[index]?.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, historyStamp],
  );

  /*
   * A FAILED REFRESH IS AN ERROR EVEN WITH ROWS STILL ON SCREEN.
   *
   * React Query keeps the last good answer under the key when a refetch
   * fails, and those rows stay drawn — which is right for a wall display, as
   * blanking a board on one bad response makes it look broken over a blip.
   * But they are now a photograph of the register rather than the register,
   * and a green pill over them would date them to this minute. So the pill
   * goes red the moment a read fails, and the page says which of the two the
   * table is showing.
   */
  const state: CivilBoardState = register.isError
    ? 'error'
    : register.data
      ? 'live'
      : 'loading';

  // Plain function, not `useCallback`: it closes over the query wrappers, which
  // are new objects every render anyway, so a memo here would only hide that
  // and hand back a stale `refetch` from a render whose queries are gone.
  const refetch = () => {
    void register.refetch();
    histories.forEach((history) => void history.refetch());
  };

  return {
    projects,
    state,
    refreshing: register.isFetching && !!register.data,
    // The rows are from a read that succeeded before one that did not.
    stale: register.isError && !!register.data,
    /*
     * FAILED, NOT MERELY UNFINISHED.
     *
     * A history still in flight needs no warning: the original date simply
     * appears under the timeline a moment later, which is an ordinary
     * progressive load, and a strip that flashed amber on every page open
     * would teach people to ignore the one place this board raises its voice.
     *
     * A history that ERRORED is different and permanent until something is
     * fixed: that project's timeline will show today's committed date with
     * nothing under it, which is exactly how a programme extended three times
     * looks when it has never moved.
     */
    baselinesMissing: histories.some((history) => history.isError),
    error: (register.error as Error | null) ?? null,
    refetch,
  };
}
