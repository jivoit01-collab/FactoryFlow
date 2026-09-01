import { Boxes, ClipboardList, Droplets, IndianRupee, Receipt, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useWallPalette } from '../constants/wall.palette';
import type { DispatchDayTotals, TrendPoint } from '../hooks';
import { useBoardDay } from '../hooks';
import { compact, count, deltaPct, money, weight } from '../utils/format';
import { type SparkPoint, WallStat } from './WallStat';

/** One trend field as a sparkline series. */
function spark(trend: TrendPoint[], field: 'trucks' | 'amount'): SparkPoint[] {
  return trend.map((point) => ({
    key: point.date,
    value: point[field],
    isToday: point.isToday,
  }));
}

/**
 * The six numbers an admin wants before they have finished sitting down: what
 * left today, what it was worth, and what is still owed.
 *
 * Five of the six are anchored on the real gate-out, not the plan date, so they
 * agree with the sales-dispatch register and hold for whatever day is picked.
 *
 * Open backlog is the exception and has to say so on its face. The backend
 * reports it as a live snapshot of everything still unshipped, not as a figure
 * bound to the window — so on a back-dated board it is the backlog RIGHT NOW
 * sitting beside five figures from that Tuesday. Unlabelled, it would read as
 * that day's closing backlog, which it is not.
 */
export function DispatchDayKpis({ totals }: { totals: DispatchDayTotals }) {
  const navigate = useNavigate();
  const day = useBoardDay();
  const palette = useWallPalette();
  const openFulfilment = () => navigate('/dashboards/dispatch-fulfilment');
  const openPlans = () => navigate('/dispatch/plans');

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <WallStat
        icon={Truck}
        label="Trucks out"
        value={count(totals.trucks)}
        sub={`avg ${totals.avgTrucks.toFixed(1)}/day · 14 days`}
        hex={palette.hue('trucks')}
        delta={deltaPct(totals.trucks, totals.yesterdayTrucks)}
        spark={spark(totals.trend, 'trucks')}
        delayMs={0}
        onClick={openFulfilment}
      />
      <WallStat
        icon={IndianRupee}
        label="Dispatched value"
        value={money(totals.amount)}
        sub={`yesterday ${money(totals.yesterdayAmount)}`}
        hex={palette.hue('value')}
        delta={deltaPct(totals.amount, totals.yesterdayAmount)}
        spark={spark(totals.trend, 'amount')}
        delayMs={60}
        onClick={openFulfilment}
      />
      <WallStat
        icon={Receipt}
        label="Invoices shipped"
        value={count(totals.bills)}
        sub={totals.trucks > 0 ? `${(totals.bills / totals.trucks).toFixed(1)} per truck` : '—'}
        hex={palette.hue('invoices')}
        delayMs={120}
        onClick={openFulfilment}
      />
      <WallStat
        icon={Boxes}
        label="Boxes out"
        value={compact(totals.boxes)}
        sub={weight(totals.weightKg)}
        hex={palette.hue('boxes')}
        delayMs={180}
        onClick={openFulfilment}
      />
      <WallStat
        icon={Droplets}
        label="Volume out"
        value={totals.litres > 0 ? `${compact(totals.litres)} L` : '—'}
        sub={totals.litres > 0 ? weight(totals.weightKg) : 'litres not recorded on these gate-outs'}
        hex={palette.hue('volume')}
        delayMs={240}
        onClick={openFulfilment}
      />
      <WallStat
        icon={ClipboardList}
        label={day.isToday ? 'Open backlog' : 'Open backlog (live now)'}
        value={money(totals.backlogAmount)}
        sub={
          day.isToday
            ? `${count(totals.backlogCount)} bills · ${weight(totals.backlogWeightKg)}`
            : `${count(totals.backlogCount)} bills · not that day's backlog`
        }
        hex={palette.hue('backlog')}
        delayMs={300}
        onClick={openPlans}
      />
    </div>
  );
}
