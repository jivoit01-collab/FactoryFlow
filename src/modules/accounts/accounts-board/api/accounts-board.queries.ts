import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { ACCOUNTS_BOARD_REFRESH_MS } from '../constants';
import type { AccountsPeriod } from '../types';
import { accountsBoardApi } from './accounts-board.api';

export const ACCOUNTS_BOARD_QUERY_KEYS = {
  all: ['accounts-board'] as const,
  board: (companyId?: number | string, period?: AccountsPeriod | null) =>
    [
      'accounts-board',
      'board',
      companyId,
      period ? `${period.year}-${period.month}` : 'all',
    ] as const,
};

/**
 * The dashboard, polled.
 *
 * The same three choices the control boards make, for the same reasons:
 *
 *  - **The interval comes from the response.** `meta.refresh_seconds` drives the
 *    next poll, so the cadence is the server's to change without a release.
 *    The constant is only the first one.
 *  - **A failure does not clear the screen.** `placeholderData` keeps the last
 *    good response rendered and the header carries the staleness; a dashboard
 *    that blanks on one bad round trip is worse than one that says how old it
 *    is.
 *  - **The period is part of the key**, so switching month is a cache hit on
 *    the way back rather than a refetch, and two months can never race each
 *    other into the same slot.
 *
 * Keyed on the company because every figure here follows the company switcher —
 * unlike the HR board, whose head count deliberately does not. The cash book is
 * genuinely per company: each has its own box, its own branches and its own
 * custodian.
 *
 * It does NOT poll in the background. The wall boards do, because they are left
 * on a screen nobody is sitting at; this one is a page somebody opens, works
 * from and leaves, and polling a finance screen in a hidden tab only spends
 * queries on a figure no-one is reading.
 */
export function useAccountsBoard(period?: AccountsPeriod | null, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ACCOUNTS_BOARD_QUERY_KEYS.board(currentCompany?.company_id, period),
    queryFn: () => accountsBoardApi.getBoard(period),
    enabled,
    staleTime: ACCOUNTS_BOARD_REFRESH_MS,
    refetchInterval: (query) => {
      const seconds = query.state.data?.meta?.refresh_seconds;
      return seconds && seconds > 0 ? seconds * 1000 : ACCOUNTS_BOARD_REFRESH_MS;
    },
    placeholderData: (previous) => previous,
    retry: 1,
  });
}
