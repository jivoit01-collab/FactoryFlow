import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { HR_BOARD_REFRESH_MS } from '../constants';
import { hrBoardApi } from './hr-board.api';

export const HR_BOARD_QUERY_KEYS = {
  all: ['hr-board'] as const,
  board: (companyId?: number | string) => ['hr-board', 'board', companyId] as const,
};

/**
 * The board, polled.
 *
 * The same three choices the other control boards make, and for the same
 * reasons:
 *
 *  - **The interval comes from the response.** `meta.refresh_seconds` drives
 *    the next poll, so the cadence can be changed from the server without a
 *    frontend release. The constant is only the first.
 *  - **It keeps polling in the background.** A board left open on a second
 *    monitor is the normal case, and without this it shows whatever was true
 *    when the tab last had focus.
 *  - **A failure does not clear the screen.** The previous response stays
 *    rendered and the header carries the staleness, because a board that blanks
 *    on one bad round trip is worse than one that says how old it is.
 *
 * Keyed on the company because the LABOUR half follows the company switcher.
 * Head count does not — it is one directory for the whole factory — so the same
 * total is expected back under either key. That is not a bug in the cache: it
 * is the asymmetry the payload's `scope` fields exist to declare.
 */
export function useHrBoard(enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: HR_BOARD_QUERY_KEYS.board(currentCompany?.company_id),
    queryFn: () => hrBoardApi.getBoard(),
    enabled,
    staleTime: HR_BOARD_REFRESH_MS,
    refetchInterval: (query) => {
      const seconds = query.state.data?.meta?.refresh_seconds;
      return seconds && seconds > 0 ? seconds * 1000 : HR_BOARD_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}
