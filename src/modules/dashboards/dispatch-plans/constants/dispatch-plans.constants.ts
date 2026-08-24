import { format, startOfDay, subMonths } from 'date-fns';

import type { DispatchBillOrdering, DispatchPlanFilters } from '../types';
import type { DispatchPlanStatus } from '../types';

export const DISPATCH_PLAN_STALE_TIME = 60_000;

/** The window both pages open on: one month back through today. */
export function defaultDateRange(): { from: string; to: string } {
  const today = startOfDay(new Date());
  return {
    from: format(subMonths(today, 1), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  };
}

export const BOOKING_STATUS_OPTIONS: Array<{
  value: DispatchPlanStatus | 'all';
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const EDIT_BOOKING_STATUS_OPTIONS: Array<{
  value: DispatchPlanStatus;
  label: string;
}> = BOOKING_STATUS_OPTIONS.filter(
  (option): option is { value: DispatchPlanStatus; label: string } => option.value !== 'all',
);

/**
 * Filters for Bill Selection — the step before planning, where bills are picked
 * out of SAP, so its window is the date the bill was CREATED. The Plans page
 * windows on the dispatch date instead; see createDefaultDispatchDateFilters.
 */
export function createDefaultDispatchPlanFilters(): DispatchPlanFilters {
  const range = defaultDateRange();
  return {
    // Default window is one month back from today, so the "From" date sits a
    // month before the "To" date (today) out of the box.
    date_from: range.from,
    date_to: range.to,
    booking_status: 'all',
    // No row cap and no paging — omitting both `limit` and the page params gets
    // the backend's whole date-bounded window, which the selection board shows
    // in one list.
    exclude_jivo_mart_transfer: true,
  };
}

/** Rows-per-page choices for the server-paged bill feed. */
export const DISPATCH_PLAN_PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
export const DISPATCH_PLAN_DEFAULT_PAGE_SIZE = 50;

/** The sort dropdown on the Plans page. These keys go to the server, which
 *  orders the whole filtered set before slicing out the requested page. */
export const DISPATCH_PLAN_SORT_OPTIONS: Array<{
  value: DispatchBillOrdering;
  label: string;
}> = [
  { value: 'default', label: 'Default order' },
  { value: 'dispatch_date_asc', label: 'Dispatch date (earliest)' },
  { value: 'dispatch_date_desc', label: 'Dispatch date (latest)' },
  { value: 'customer_asc', label: 'Customer (A → Z)' },
  { value: 'customer_desc', label: 'Customer (Z → A)' },
  { value: 'city_asc', label: 'City (A → Z)' },
  { value: 'litres_desc', label: 'Litres (high → low)' },
  { value: 'litres_asc', label: 'Litres (low → high)' },
  { value: 'date_desc', label: 'Invoice date (newest)' },
  { value: 'date_asc', label: 'Invoice date (oldest)' },
  { value: 'docnum_asc', label: 'Invoice no. (A → Z)' },
];

/**
 * Filters for the Dispatch Plans page. Its window is the DISPATCH date the
 * planner set — not the SAP invoice date — because the page answers "what is
 * going out when". It opens on the last month up to today; the Today toggle
 * narrows it to a single day and back. Bills with no dispatch date yet ride
 * along in every window (`include_unscheduled`), since this is the page where
 * those dates get typed.
 */
export function createDefaultDispatchDateFilters(): DispatchPlanFilters {
  const range = defaultDateRange();
  return {
    date_from: range.from,
    date_to: range.to,
    booking_status: 'all',
    exclude_jivo_mart_transfer: true,
    by_dispatch_date: true,
    include_unscheduled: true,
    selected_only: true,
    ordering: 'default',
    page: 1,
    page_size: DISPATCH_PLAN_DEFAULT_PAGE_SIZE,
  };
}
