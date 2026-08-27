import { Boxes, ClipboardList, Droplets, IndianRupee, Receipt, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { DispatchDayTotals } from '../hooks';
import { compact, count, deltaPct, money, weight } from '../utils/format';
import { WallStat } from './WallStat';

/**
 * The six numbers an admin wants before they have finished sitting down: what
 * left today, what it was worth, and what is still owed.
 *
 * All six are anchored on the real gate-out, not the plan date, so they agree
 * with the sales-dispatch register rather than with the schedule.
 */
export function DispatchDayKpis({ totals }: { totals: DispatchDayTotals }) {
  const navigate = useNavigate();
  const openFulfilment = () => navigate('/dashboards/dispatch-fulfilment');
  const openPlans = () => navigate('/dispatch/plans');

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <WallStat
        icon={Truck}
        label="Trucks out"
        value={count(totals.trucks)}
        sub={`avg ${totals.avgTrucks.toFixed(1)}/day · 14 days`}
        hex="#34d399"
        delta={deltaPct(totals.trucks, totals.yesterdayTrucks)}
        spark={totals.trend}
        sparkKey="trucks"
        delayMs={0}
        onClick={openFulfilment}
      />
      <WallStat
        icon={IndianRupee}
        label="Dispatched value"
        value={money(totals.amount)}
        sub={`yesterday ${money(totals.yesterdayAmount)}`}
        hex="#60a5fa"
        delta={deltaPct(totals.amount, totals.yesterdayAmount)}
        spark={totals.trend}
        sparkKey="amount"
        delayMs={60}
        onClick={openFulfilment}
      />
      <WallStat
        icon={Receipt}
        label="Invoices shipped"
        value={count(totals.bills)}
        sub={totals.trucks > 0 ? `${(totals.bills / totals.trucks).toFixed(1)} per truck` : '—'}
        hex="#22d3ee"
        delayMs={120}
        onClick={openFulfilment}
      />
      <WallStat
        icon={Boxes}
        label="Boxes out"
        value={compact(totals.boxes)}
        sub={weight(totals.weightKg)}
        hex="#a78bfa"
        delayMs={180}
        onClick={openFulfilment}
      />
      <WallStat
        icon={Droplets}
        label="Volume out"
        value={totals.litres > 0 ? `${compact(totals.litres)} L` : '—'}
        sub={totals.litres > 0 ? weight(totals.weightKg) : 'litres not recorded on these gate-outs'}
        hex="#fbbf24"
        delayMs={240}
        onClick={openFulfilment}
      />
      <WallStat
        icon={ClipboardList}
        label="Open backlog"
        value={money(totals.backlogAmount)}
        sub={`${count(totals.backlogCount)} bills · ${weight(totals.backlogWeightKg)}`}
        hex="#fb923c"
        delayMs={300}
        onClick={openPlans}
      />
    </div>
  );
}
