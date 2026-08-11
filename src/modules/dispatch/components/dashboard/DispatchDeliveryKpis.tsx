import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  PackageX,
  Route,
  SignalZero,
  Timer,
  Undo2,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDispatchTrackingSummary } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';
import { ACCENTS, KpiStat } from '@/shared/components/dashboard';
import { getDefaultDateRange, getErrorMessage } from '@/shared/utils';

const BOARD = '/dispatch/tracking';

/** `null` reads as "no answer yet", which is not the same as zero. */
const orDash = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n);
const asPercent = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

/**
 * What happens to a truck *after* it leaves the gate — the delivery half of
 * dispatch. Every figure comes from the dispatch-tracking summary, whose current
 * status is the truck's latest logged update, so these tiles always agree with
 * the tracking board they link into.
 *
 * Tiles that mean "someone must act" (overdue, partially delivered, returned,
 * no update logged) carry a warm accent; the rest are informational.
 */
export function DispatchDeliveryKpis() {
  const navigate = useNavigate();
  const range = useMemo(() => getDefaultDateRange(), []);
  const query = useDispatchTrackingSummary({ from_date: range.from, to_date: range.to });
  const data = query.data;

  const openBoard = (status?: string) =>
    navigate(status ? `${BOARD}?status=${status}` : BOARD);

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

  const counts = data.status_counts;
  // "Reached" is the destination reached *or* being unloaded — both are trucks
  // that have arrived but not yet been signed off.
  const reached = (counts.REACHED_DESTINATION ?? 0) + (counts.UNLOADING ?? 0);
  const worstOverdue = data.late.trucks[0]?.days_overdue ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiStat
        icon={AlertTriangle}
        label="Overdue deliveries"
        value={data.late.count}
        sub={
          data.late.count > 0
            ? `worst ${worstOverdue} day${worstOverdue === 1 ? '' : 's'} past reach-by`
            : 'None past their reach-by date'
        }
        accent={ACCENTS.rose}
        onClick={() => openBoard()}
        delayMs={0}
      />
      <KpiStat
        icon={Route}
        label="In transit"
        value={counts.IN_TRANSIT ?? 0}
        sub={`${counts.DELAYED ?? 0} flagged delayed`}
        accent={ACCENTS.blue}
        onClick={() => openBoard('IN_TRANSIT')}
        delayMs={60}
      />
      <KpiStat
        icon={MapPin}
        label="Reached destination"
        value={reached}
        sub={`${counts.UNLOADING ?? 0} unloading`}
        accent={ACCENTS.cyan}
        onClick={() => openBoard('REACHED_DESTINATION')}
        delayMs={120}
      />
      <KpiStat
        icon={CheckCircle2}
        label="Delivered"
        value={counts.DELIVERED ?? 0}
        sub={`${data.delivered_today} today`}
        accent={ACCENTS.emerald}
        onClick={() => openBoard('DELIVERED')}
        delayMs={180}
      />
      <KpiStat
        icon={PackageX}
        label="Partially delivered"
        value={counts.PARTIALLY_DELIVERED ?? 0}
        sub="Short-delivered, stock coming back"
        accent={ACCENTS.amber}
        onClick={() => openBoard('PARTIALLY_DELIVERED')}
        delayMs={240}
      />
      <KpiStat
        icon={Undo2}
        label="Returned"
        value={counts.RETURNED ?? 0}
        sub="Came back undelivered"
        accent={ACCENTS.orange}
        onClick={() => openBoard('RETURNED')}
        delayMs={300}
      />
      <KpiStat
        icon={Gauge}
        label="On-time rate"
        value={asPercent(data.on_time_rate)}
        sub="Delivered on/before reach-by"
        accent={ACCENTS.violet}
        onClick={() => openBoard()}
        delayMs={360}
      />
      <KpiStat
        icon={Timer}
        label="Avg transit"
        value={data.avg_transit_days === null ? '—' : `${data.avg_transit_days} d`}
        sub="Gate-out to delivered"
        accent={ACCENTS.indigo}
        onClick={() => openBoard()}
        delayMs={420}
      />
      <KpiStat
        icon={SignalZero}
        label="No update yet"
        value={data.no_update_yet}
        sub="Dispatched, nothing logged since"
        accent={ACCENTS.slate}
        onClick={() => openBoard('DISPATCHED')}
        delayMs={480}
      />
      <KpiStat
        icon={Clock}
        label="Trips open"
        value={orDash(data.active)}
        sub={`${data.completed} of ${data.total_dispatched} closed`}
        accent={ACCENTS.teal}
        onClick={() => openBoard()}
        delayMs={540}
      />
    </div>
  );
}
