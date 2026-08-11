import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDispatchTrackingSummary } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';
import { DispatchDeliveryKpiGrid } from '@/modules/gate/components/dispatch-tracking';
import { getDefaultDateRange, getErrorMessage } from '@/shared/utils';

const BOARD = '/dispatch/tracking';

/**
 * The delivery half of dispatch on the module dashboard — what happened to each
 * truck after it left the gate, over the dashboard's default window.
 *
 * The tiles themselves live in {@link DispatchDeliveryKpiGrid}, shared with the
 * Dispatch Tracking dashboard; this only supplies the window and the fetch.
 */
export function DispatchDeliveryKpis() {
  const navigate = useNavigate();
  const range = useMemo(() => getDefaultDateRange(), []);
  const query = useDispatchTrackingSummary({ from_date: range.from, to_date: range.to });
  const data = query.data;

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-destructive">
        {getErrorMessage(query.error, 'Failed to load delivery tracking.')}
      </div>
    );
  }

  if (!data) return null;

  return (
    <DispatchDeliveryKpiGrid
      data={data}
      onOpen={(status) => navigate(status ? `${BOARD}?status=${status}` : BOARD)}
    />
  );
}
