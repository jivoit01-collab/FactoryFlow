import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { ADMIN_BOARD_REFRESH_MS } from '../constants';
import { adminBoardApi } from './admin-control.api';

export const ADMIN_BOARD_QUERY_KEYS = {
  all: ['admin-board'] as const,
  /** `month` is an ended month, or null for this month so far. */
  board: (companyId?: number | string, month: string | null = null) =>
    ['admin-board', 'board', companyId, month ?? 'current'] as const,
  dispatchBills: (
    companyId: number | string | undefined,
    companyCode: string,
    month: string | null = null,
  ) => ['admin-board', 'dispatch-bills', companyId, companyCode, month ?? 'current'] as const,
};

/**
 * The board, polled.
 *
 * Three choices worth knowing, all copied from the plant board because they
 * were right there:
 *
 *  - **The interval comes from the response.** `meta.refresh_seconds` drives
 *    the next poll, so the cadence can be slowed from the server if SAP is
 *    struggling, without a frontend release. The constant is only the first.
 *  - **It keeps polling in the background.** A board left open on a second
 *    monitor is the normal case, and without this it shows whatever was true
 *    when the tab last had focus.
 *  - **A failure does not clear the screen.** The previous response stays
 *    rendered and the header carries the staleness, because a board that blanks
 *    on one bad round trip is worse than one that says how old it is.
 *
 * Keyed on the company because the board follows the company switcher: signed
 * into Mart, the same route reports Mart's plant.
 */
export function useAdminBoard(enabled = true, month: string | null = null) {
  const { currentCompany } = useAuth();
  const queryKey = ADMIN_BOARD_QUERY_KEYS.board(currentCompany?.company_id, month);

  return useQuery({
    queryKey,
    queryFn: () => adminBoardApi.getBoard(month),
    enabled,
    staleTime: ADMIN_BOARD_REFRESH_MS,
    refetchInterval: (query) => {
      const seconds = query.state.data?.meta?.refresh_seconds;
      return seconds && seconds > 0 ? seconds * 1000 : ADMIN_BOARD_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
    // The last response stays up through a refresh — but never across a change
    // of month: September's figures under an October header for the second a
    // read takes would be the one wrong answer this board can give.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === queryKey[3] ? previous : undefined,
    retry: 1,
  });
}

/**
 * One company's dispatched bills, read when its row is opened.
 *
 * Not polled: the list is read to be scanned, and rows reshuffling under the
 * reader every minute would cost them their place. Reopening reads it afresh.
 * A refusal is not retried — "you are not a member of Jivo Mart" is not going
 * to change on the second attempt.
 */
export function useAdminDispatchBills(companyCode: string, month: string | null = null) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ADMIN_BOARD_QUERY_KEYS.dispatchBills(currentCompany?.company_id, companyCode, month),
    queryFn: () => adminBoardApi.getDispatchBills(companyCode, month),
    staleTime: ADMIN_BOARD_REFRESH_MS,
    retry: false,
  });
}
