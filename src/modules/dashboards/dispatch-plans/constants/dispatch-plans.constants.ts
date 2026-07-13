import { format, startOfDay, subMonths } from 'date-fns';

import type { DispatchPlanFilters } from '../types';
import type { DispatchPlanStatus } from '../types';

export const DISPATCH_PLAN_STALE_TIME = 60_000;

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

export function createDefaultDispatchPlanFilters(): DispatchPlanFilters {
  const today = startOfDay(new Date());
  return {
    // Default window is one month back from today, so the "From" date sits a
    // month before the "To" date (today) out of the box.
    date_from: format(subMonths(today, 1), 'yyyy-MM-dd'),
    date_to: format(today, 'yyyy-MM-dd'),
    booking_status: 'all',
    // No user-facing row cap anymore — request the backend maximum so the table
    // shows the whole filtered window (paginated client-side). 2000 is the
    // backend's hard ceiling; a wider window that exceeds it needs a backend change.
    limit: 2000,
    exclude_jivo_mart_transfer: true,
  };
}
