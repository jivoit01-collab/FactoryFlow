/**
 * Reads behind the Warehouse Control board.
 *
 * Nothing new is fetched from the server here — every panel rides an existing
 * feed. The non-moving snapshot deliberately reuses the Non-Moving dashboard's
 * own hooks so both screens share one React Query cache entry; the dispatch
 * reads are thin wrappers that add an `enabled` flag, so a panel the user may
 * not see never costs a request.
 */
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';
import { dispatchPlansApi } from '@/modules/dashboards/dispatch-plans/api';
import { dispatchLinkingApi } from '@/modules/vehicle-management/api';

import {
  WAREHOUSE_CONTROL_BILLS_FETCH_LIMIT,
  WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT,
  WAREHOUSE_CONTROL_STALE_TIME,
} from '../constants';

export const WAREHOUSE_CONTROL_QUERY_KEYS = {
  all: ['warehouse-control'] as const,

  todaysBills: (date: string, companyId?: number | string) =>
    [...WAREHOUSE_CONTROL_QUERY_KEYS.all, 'todays-bills', companyId, date] as const,

  linkingFeed: (date: string, companyId?: number | string) =>
    [...WAREHOUSE_CONTROL_QUERY_KEYS.all, 'linking-feed', companyId, date] as const,
};

/** SAP hiccups are worth one retry; an auth/permission answer is not. */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

/**
 * Every SAP bill raised on `date`. Windowed on the invoice date (not the planned
 * dispatch date) — "today's bills" means the invoices cut today.
 */
export function useControlTodaysBills(date: string, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.todaysBills(date, currentCompany?.company_id),
    queryFn: () =>
      dispatchPlansApi.getBills({
        date_from: date,
        date_to: date,
        limit: WAREHOUSE_CONTROL_BILLS_FETCH_LIMIT,
      }),
    enabled: enabled && Boolean(date),
    staleTime: WAREHOUSE_CONTROL_STALE_TIME,
    retry: sapRetry,
  });
}

/**
 * One read of every dispatch-dated bill in the linking window. Both the truck
 * fold and the pending-linking queue are derived from this, so the board asks
 * for the feed once rather than once per bucket.
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
