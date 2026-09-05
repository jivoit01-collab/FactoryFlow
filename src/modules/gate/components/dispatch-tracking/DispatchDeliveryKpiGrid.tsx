import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  PackageX,
  Route,
  Timer,
  Truck,
  Undo2,
} from 'lucide-react';

import { type DispatchTrackingSummary } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.api';
import { ACCENTS, KpiStat } from '@/shared/components/dashboard';

/** `null` reads as "no answer yet", which is not the same as zero. */
const asPercent = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

export interface DispatchDeliveryKpiGridProps {
  data: DispatchTrackingSummary;
  /** Open the tracking board, optionally filtered to one status. */
  onOpen: (status?: string) => void;
}

/**
 * The post-dispatch KPI tiles — what happened to each truck after it left the
 * gate. Shared by the dispatch module dashboard and the Dispatch Tracking
 * dashboard so the two screens can never drift apart; each passes its own
 * summary (and so its own date window) in.
 *
 * Every figure comes from the tracking summary, whose current status is the
 * truck's latest logged update, so these agree with the board they link into.
 * Tiles that mean "someone must act" — overdue, partially delivered, returned,
 * no update logged — carry a warm accent; the rest are informational.
 */
export function DispatchDeliveryKpiGrid({ data, onOpen }: DispatchDeliveryKpiGridProps) {
  const counts = data.status_counts;
  // "Reached" is the destination reached *or* being unloaded — both are trucks
  // that have arrived but are not yet signed off.
  const reached = (counts.REACHED_DESTINATION ?? 0) + (counts.UNLOADING ?? 0);
  const worstOverdue = data.late.trucks[0]?.days_overdue ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiStat
        icon={Truck}
        label="Dispatch"
        // Trucks sitting at the DISPATCHED stage: through the gate, with no tracking
        // update logged against them since. NOT the window's total — that is
        // `total_dispatched`, which every other tile is a slice of, and it stays on
        // the Lifecycle bar and in Trips open's sub-line rather than as a tile.
        //
        // `no_update_yet` and `status_counts.DISPATCHED` are the same number by
        // construction: DISPATCHED is not a member of TruckDispatchStatus, so it is
        // only ever reached by the "no updates at all" branch of the summary. This
        // tile replaced a separate "No update yet" one that showed the identical
        // figure — two tiles that could never disagree.
        value={data.no_update_yet}
        sub="Gated out, nothing logged since"
        accent={ACCENTS.sky}
        onClick={() => onOpen('DISPATCHED')}
        delayMs={0}
      />
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
        // Deliberately unfiltered: "overdue" is past-reach-by while still on the
        // road, which spans IN_TRANSIT *and* DELAYED — no single status filter
        // reproduces this number, and one that half-matched would be worse.
        onClick={() => onOpen()}
        delayMs={60}
      />
      <KpiStat
        icon={Route}
        label="In transit"
        value={counts.IN_TRANSIT ?? 0}
        sub={`${counts.DELAYED ?? 0} flagged delayed`}
        accent={ACCENTS.blue}
        onClick={() => onOpen('IN_TRANSIT')}
        delayMs={120}
      />
      <KpiStat
        icon={MapPin}
        label="Reached destination"
        value={reached}
        sub={`${counts.UNLOADING ?? 0} unloading`}
        accent={ACCENTS.cyan}
        onClick={() => onOpen('REACHED_DESTINATION')}
        delayMs={180}
      />
      <KpiStat
        icon={CheckCircle2}
        label="Delivered"
        value={counts.DELIVERED ?? 0}
        sub={`${data.delivered_today} today`}
        accent={ACCENTS.emerald}
        onClick={() => onOpen('DELIVERED')}
        delayMs={240}
      />
      <KpiStat
        icon={PackageX}
        label="Partially delivered"
        // Kept out of "Delivered" on purpose: a short delivery has stock coming
        // back and a credit to raise, so folding it into Delivered would hide
        // the very thing that needs work.
        value={counts.PARTIALLY_DELIVERED ?? 0}
        sub="Short-delivered, stock coming back"
        accent={ACCENTS.amber}
        onClick={() => onOpen('PARTIALLY_DELIVERED')}
        delayMs={300}
      />
      <KpiStat
        icon={Undo2}
        label="Returned"
        value={counts.RETURNED ?? 0}
        sub="Came back undelivered"
        accent={ACCENTS.orange}
        onClick={() => onOpen('RETURNED')}
        delayMs={360}
      />
      <KpiStat
        icon={Gauge}
        label="On-time rate"
        value={asPercent(data.on_time_rate)}
        sub="Delivered on/before reach-by"
        accent={ACCENTS.violet}
        onClick={() => onOpen()}
        delayMs={420}
      />
      <KpiStat
        icon={Timer}
        label="Avg transit"
        value={data.avg_transit_days === null ? '—' : `${data.avg_transit_days} d`}
        sub="Gate-out to delivered"
        accent={ACCENTS.indigo}
        onClick={() => onOpen()}
        delayMs={480}
      />
      <KpiStat
        icon={Clock}
        label="Trips open"
        value={data.active}
        sub={`${data.completed} of ${data.total_dispatched} closed`}
        accent={ACCENTS.teal}
        onClick={() => onOpen()}
        delayMs={540}
      />
    </div>
  );
}
