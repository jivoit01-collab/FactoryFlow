/**
 * Reads behind the Warehouse Control board.
 *
 * **The board is company-independent.** The factory is one physical place: the
 * same trucks back onto the same dock and the same racking whichever company
 * raised the invoice, so a manager standing on that floor must see the whole
 * site whatever the company selector happens to say. Every read here is
 * therefore pinned or widened rather than left to the active company, and no
 * query key carries a company id — switching company must not change a number
 * on this board, and must not refetch it either.
 *
 * How each feed gets there differs, because the data does:
 *
 *   Today's Bills + Vehicle Linking  →  the Dispatch Plans bills feed, read with
 *                                       `all_companies` (one SAP read per
 *                                       company, merged server-side)
 *   Pending Links                    →  the same feed, the Plans page's filters
 *   Non-Moving                       →  pinned to one company: the warehouse the
 *                                       panel reports on exists in exactly one
 *                                       SAP schema (see the constants)
 *   Pallet Space                     →  the WMS layout, read across companies
 *                                       (`useControlWmsCollection`)
 *
 * The wrappers add an `enabled` flag, so a panel the user may not see never
 * costs a request.
 */
import { useQuery } from '@tanstack/react-query';
import { addDays, format, subMonths } from 'date-fns';

import { dispatchPlansApi } from '@/modules/dashboards/dispatch-plans/api';
import { nonMovingApi } from '@/modules/dashboards/non-moving/api';
import type { NonMovingFilters } from '@/modules/dashboards/non-moving/types';
import type { WmsCollection, WmsCollectionMap } from '@/modules/wms';
import { getActiveWmsAdapter } from '@/modules/wms';

import {
  WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
  WAREHOUSE_CONTROL_NON_MOVING_COMPANY,
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

/**
 * Query keys. None of them carries a company — that is the contract, not an
 * oversight: every read below answers for the whole site, so keying on the
 * active company would split one answer across three cache entries and make the
 * board flicker on a company switch.
 */
export const WAREHOUSE_CONTROL_QUERY_KEYS = {
  all: ['warehouse-control'] as const,

  linkingFeed: (date: string) => [...WAREHOUSE_CONTROL_QUERY_KEYS.all, 'linking-feed', date],

  // Keyed on the resolved window, not the day it was derived from — two builds
  // with different windows must not share a cache entry.
  planBills: (date: string) => {
    const window = warehouseControlPlanWindow(date);
    return [
      ...WAREHOUSE_CONTROL_QUERY_KEYS.all,
      'plan-bills',
      window.date_from,
      window.date_to,
    ] as const;
  },

  // Pinned to one company, so the code is in the key: it names which schema the
  // answer came out of, and re-pinning the panel must not serve the old one.
  nonMovingItemGroups: (companyCode: string) =>
    [...WAREHOUSE_CONTROL_QUERY_KEYS.all, 'non-moving-item-groups', companyCode] as const,

  nonMovingReport: (companyCode: string, filters: NonMovingFilters) =>
    [
      ...WAREHOUSE_CONTROL_QUERY_KEYS.all,
      'non-moving-report',
      companyCode,
      { age: filters.age, item_group: filters.item_group },
    ] as const,

  wmsCollection: (collection: WmsCollection) =>
    [...WAREHOUSE_CONTROL_QUERY_KEYS.all, 'wms', collection] as const,
};

/** SAP hiccups are worth one retry; an auth/permission answer is not. */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

/**
 * Every bill scheduled to leave on the board's day, across every company.
 *
 * Windowed on the *dispatch date* (`by_dispatch_date`) rather than the invoice
 * date, for two reasons. It is the field both panels fold on, so the read asks
 * for exactly the set they render — and it makes the cross-company fan-out
 * affordable: the server resolves the day's plans in its own database and then
 * fetches only those bills, instead of trawling a year of invoices in three SAP
 * schemas to find the handful dated today.
 *
 * It is also more complete than the Bills Linking page, which windows on the
 * invoice date and so cannot show a long-invoiced bill scheduled for today.
 */
export function useControlLinkingFeed(date: string, enabled = true) {
  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.linkingFeed(date),
    queryFn: () =>
      dispatchPlansApi.getBills({
        date_from: date,
        date_to: date,
        by_dispatch_date: true,
        booking_status: 'all',
        all_companies: true,
        limit: WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
      }),
    enabled: enabled && Boolean(date),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    retry: sapRetry,
  });
}

/**
 * The Dispatch Plans feed, in that page's own shape, across every company.
 *
 * `by_dispatch_date` + `include_unscheduled: false` is what makes this "bills
 * with a date filled in" — the server windows on the planned dispatch date and
 * drops bills that have none. `selected_only` and `exclude_jivo_mart_transfer`
 * match the Plans page so the board counts exactly the bills that page lists,
 * per company.
 *
 * The window reaches forward as well as back: the Plans page opens on a month
 * back through today, but a board about what has not gone out has to show what
 * is coming up too.
 */
export function useControlPlanBills(date: string, enabled = true) {
  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.planBills(date),
    queryFn: () =>
      dispatchPlansApi.getBills({
        ...warehouseControlPlanWindow(date),
        booking_status: 'all',
        exclude_jivo_mart_transfer: true,
        by_dispatch_date: true,
        include_unscheduled: false,
        selected_only: true,
        all_companies: true,
        limit: WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
      }),
    enabled: enabled && Boolean(date),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    retry: sapRetry,
  });
}

/**
 * The item-group dropdown of the pinned company.
 *
 * Read here rather than through the Non-Moving dashboard's own hook because that
 * one follows the active company: group codes differ per SAP schema (CONSUMABLES
 * is 111 in one company and 101 in another), so a code resolved in the active
 * company would name the wrong group in the pinned one.
 */
export function useControlNonMovingItemGroups(
  companyCode: string = WAREHOUSE_CONTROL_NON_MOVING_COMPANY,
  enabled = true,
) {
  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingItemGroups(companyCode),
    queryFn: () => nonMovingApi.getItemGroups(companyCode),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    retry: sapRetry,
    enabled,
  });
}

/** The non-moving stock report of the pinned company. */
export function useControlNonMovingReport(
  filters: NonMovingFilters,
  companyCode: string = WAREHOUSE_CONTROL_NON_MOVING_COMPANY,
  enabled = true,
) {
  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingReport(companyCode, filters),
    queryFn: () => nonMovingApi.getReport(filters, companyCode),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    retry: sapRetry,
    enabled,
  });
}

/**
 * One WMS collection, read across every company the user belongs to.
 *
 * Deliberately NOT the shared `wmsStore`: that store is the per-company cache
 * the WMS screens read and write through, and seeding it with a sibling
 * company's rows would show them a warehouse they cannot edit. This is a
 * separate, read-only copy that only this board holds.
 */
export function useControlWmsCollection<K extends WmsCollection>(collection: K, enabled = true) {
  return useQuery<WmsCollectionMap[K][]>({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.wmsCollection(collection),
    queryFn: () => getActiveWmsAdapter().list(collection, { allCompanies: true }),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    enabled,
  });
}
