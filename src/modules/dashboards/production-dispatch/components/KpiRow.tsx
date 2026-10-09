import { ArrowDownToLine, ArrowUpFromLine, Gauge, Scale, Truck } from 'lucide-react';

import { StatTile, StatTileRow } from '@/shared/components/page';

import {
  dispatchShare,
  fmtPallet,
  fmtShare,
  fmtTon,
  fmtWhole,
  isActive,
  type ItemRow,
  type Measure,
  netPallet,
  type Totals,
} from '../utils';

function sub(measure: Measure) {
  return `${fmtWhole(measure.litres)} L · ${fmtTon(measure.ton)} t`;
}

/** The range's headline: made, sent, the difference, and how the SKUs are moving. */
export function KpiRow({
  totals,
  items,
  windowDays,
}: {
  totals: Totals;
  items: ItemRow[];
  windowDays: number;
}) {
  const net = netPallet(totals);
  const active = items.filter(isActive);
  const fast = active.filter((row) => row.item.movement === 'FAST').length;

  return (
    <StatTileRow>
      <StatTile
        label="Production"
        value={`${fmtPallet(totals.production.pallet)} pallets`}
        sub={sub(totals.production)}
        icon={ArrowDownToLine}
        accent="indigo"
      />
      <StatTile
        label="Dispatch"
        value={`${fmtPallet(totals.dispatch.pallet)} pallets`}
        sub={sub(totals.dispatch)}
        icon={Truck}
        accent="emerald"
      />
      <StatTile
        label="Net (Prod − Dispatch)"
        value={`${net > 0 ? '+' : ''}${fmtPallet(net)} pallets`}
        sub={net >= 0 ? 'built up into stock' : 'drawn down from stock'}
        icon={Scale}
        accent={net > 0 ? 'amber' : 'slate'}
      />
      <StatTile
        label="Dispatch / Production"
        value={fmtShare(dispatchShare(totals))}
        sub="over 100% = stock drawn down"
        icon={ArrowUpFromLine}
        accent="cyan"
      />
      <StatTile
        label="SKUs moving"
        value={`${fast} FAST · ${active.length - fast} SLOW`}
        sub={`of ${active.length} SKUs, over the last ${windowDays} days`}
        icon={Gauge}
        accent="rose"
      />
    </StatTileRow>
  );
}
