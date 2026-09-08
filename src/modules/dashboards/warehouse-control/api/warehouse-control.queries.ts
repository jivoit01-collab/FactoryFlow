/**
 * Reads behind the Warehouse Control board.
 *
 * Nothing new is fetched from the server here — every panel rides a feed one of
 * the full screens already owns, so the board can never show a different number
 * to the page it links to:
 *
 *   Today's Bills + Vehicle Linking  →  the Bills Linking feed (one read, two folds)
 *   Pending Links                    →  the Dispatch Plans feed
 *   Non-Moving                       →  the Non-Moving dashboard's own hooks
 *
 * The wrappers add an `enabled` flag, so a panel the user may not see never
 * costs a request.
 */
import { useQuery } from '@tanstack/react-query';
import { addDays, format, subMonths } from 'date-fns';

import { useAuth } from '@/core/auth';
import { dispatchPlansApi } from '@/modules/dashboards/dispatch-plans/api';
import { dispatchLinkingApi } from '@/modules/vehicle-management/api';

import {
  WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
  WAREHOUSE_CONTROL_PLANS_LOOKAHEAD_DAYS,
  WAREHOUSE_CONTROL_STALE_TIME,
} from '../constants';

/**
 * The Dispatch Plans window the board reads.
 *
 * One calendar month back — the same edge `defaultDateRange()` gives the Plans
 * page, so the two screens count the same bills. A fixed 30 days is NOT the same
 * edge: across a 31-day month it lands a day late and silently drops whatever is
 * dated on the boundary, which is how the board came to show 71 pending against
 * the Plans page's 72. Forward it reaches further than that page, because a bill
 * dated next week has not been dispatched either.
 *
 * Deliberately a named function rather than something computed inside `queryFn`:
 * the dates go into the query key, so changing this derivation invalidates the
 * cached answer instead of leaving a stale count on screen.
 */
export function warehouseControlPlanWindow(date: string): {
  date_from: string;
  date_to: string;
} {
  const base = new Date(`${date}T00:00:00`);
  return {
    date_from: format(subMonths(base, 1), 'yyyy-MM-dd'),
    date_to: format(addDays(base, WAREHOUSE_CONTROL_PLANS_LOOKAHEAD_DAYS), 'yyyy-MM-dd'),
  };
}

export const WAREHOUSE_CONTROL_QUERY_KEYS = {
  all: ['warehouse-control'] as const,

  linkingFeed: (date: string, companyId?: number | string) =>
    [...WAREHOUSE_CONTROL_QUERY_KEYS.all, 'linking-feed', companyId, date] as const,

  // Keyed on the resolved window, not the day it was derived from — two builds
  // with different windows must not share a cache entry.
  planBills: (date: string, companyId?: number | string) => {
    const window = warehouseControlPlanWindow(date);
    return [
      ...WAREHOUSE_CONTROL_QUERY_KEYS.all,
      'plan-bills',
      companyId,
      window.date_from,
      window.date_to,
    ] as const;
  },
};

/** SAP hiccups are worth one retry; an auth/permission answer is not. */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

/**
 * One read of every dispatch-dated bill in the linking window — the same feed
 * the Bills Linking page uses. Today's Bills and Vehicle Linking are both folded
 * from this, so the board asks for it once rather than once per panel.
 */
export function useControlLinkingFeed(date: string, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.linkingFeed(date, currentCompany?.company_id),
    queryFn: () =>
      dispatchLinkingApi.getPlans({
        bucket: 'all',
        date,
        booking_status: 'all',
        limit: WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
      }),
    enabled: enabled && Boolean(date),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
  });
}

/**
 * The Dispatch Plans feed, in that page's own shape.
 *
 * `by_dispatch_date` + `include_unscheduled: false` is what makes this "bills
 * with a date filled in" — the server windows on the planned dispatch date and
 * drops bills that have none. `selected_only` and `exclude_jivo_mart_transfer`
 * match the Plans page so the board counts exactly the bills that page lists.
 *
 * The window reaches forward as well as back: the Plans page opens on a month
 * back through today, but a board about what has not gone out has to show what
 * is coming up too.
 */
export function useControlPlanBills(date: string, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.planBills(date, currentCompany?.company_id),
    queryFn: () =>
      dispatchPlansApi.getBills({
        ...warehouseControlPlanWindow(date),
        booking_status: 'all',
        exclude_jivo_mart_transfer: true,
        by_dispatch_date: true,
        include_unscheduled: false,
        selected_only: true,
        limit: WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
      }),
    enabled: enabled && Boolean(date),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    retry: sapRetry,
  });
}
