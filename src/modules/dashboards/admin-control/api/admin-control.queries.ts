import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { ADMIN_BOARD_REFRESH_MS } from '../constants';
import { adminBoardApi } from './admin-control.api';

export const ADMIN_BOARD_QUERY_KEYS = {
  all: ['admin-board'] as const,
  board: (companyId?: number | string) => ['admin-board', 'board', companyId] as const,
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
export function useAdminBoard(enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ADMIN_BOARD_QUERY_KEYS.board(currentCompany?.company_id),
    queryFn: () => adminBoardApi.getBoard(),
    enabled,
    staleTime: ADMIN_BOARD_REFRESH_MS,
    refetchInterval: (query) => {
      const seconds = query.state.data?.meta?.refresh_seconds;
      return seconds && seconds > 0 ? seconds * 1000 : ADMIN_BOARD_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}
