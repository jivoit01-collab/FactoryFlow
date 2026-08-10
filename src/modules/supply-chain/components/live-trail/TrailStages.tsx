/** The five stages, left to right — the shape of the whole answer in one strip.
 *
 * Not a KPI row: the order is the argument. Orders come in, some ship from the
 * shelf, the rest has to be made, making it consumes materials, and some of
 * those materials are not there. Each tile is a link into the table that proves
 * it, because a number nobody can drill into is a number nobody believes.
 */
import { cn } from '@/shared/utils';

import type { LiveTrail } from '../../types';
import { inr, n0 } from './trail-format';

export type StageTab = 'orders' | 'skus' | 'materials' | 'buy' | 'capacity';

interface Stage {
  n: string;
  label: string;
  hero: string;
  sub: string;
  /** How full the bar reads — the share of the stage that is answered. */
  fill: number;
  color: string;
  tab: StageTab;
}

export function TrailStages({
  data,
  onOpen,
  active,
}: {
  data: LiveTrail;
  onOpen: (tab: StageTab) => void;
  active: StageTab;
}) {
  const s = data.summary;
  const covered = s.skus_demanded - s.skus_short;
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((100 * part) / whole) : 0);

  const stages: Stage[] = [
    {
      n: 'Stage 1',
      label: 'Orders pending',
      hero: n0(s.demand_units),
      sub: `pieces · ${inr(s.demand_value)} across ${n0(s.open_lines)} lines`,
      fill: 100,
      color: 'var(--trail-stock)',
      tab: 'orders',
    },
    {
      n: 'Stage 2',
      label: 'Deliverable from stock',
      hero: `${n0(covered)} / ${n0(s.skus_demanded)}`,
      sub: `SKUs fully covered · ${inr(s.shippable_value)} shippable today`,
      fill: pct(s.shippable_value, s.demand_value),
      color: 'var(--trail-stock)',
      tab: 'skus',
    },
    {
      n: 'Stage 3',
      label: 'Must be produced',
      hero: n0(s.units_to_produce),
      sub: `pieces across ${n0(s.skus_short)} SKUs, after netting work orders`,
      fill: pct(s.skus_short, s.skus_demanded),
      color: 'var(--trail-produce)',
      tab: 'skus',
    },
    {
      n: 'Stage 4',
      label: 'Materials that gap needs',
      hero: n0(s.components_touched),
      sub: `components exploded · ${n0(s.filling_litres)} L of filling`,
      fill: 100,
      color: 'var(--trail-wip)',
      tab: 'materials',
    },
    {
      n: 'Stage 5',
      label: 'Must be bought',
      hero: s.components_short === 0 ? '0' : inr(s.buy_value),
      sub: `${n0(s.components_short)} components short · rest covered by stock + live POs`,
      fill: pct(s.components_short, Math.max(s.components_touched, 1)),
      color: 'hsl(var(--destructive))',
      tab: 'buy',
    },
  ];

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-5">
      {stages.map((stage, index) => (
        <button
          key={stage.n}
          type="button"
          onClick={() => onOpen(stage.tab)}
          className={cn(
            'group border-b p-4 text-left transition-colors last:border-b-0 hover:bg-muted/50',
            'xl:border-b-0 xl:border-r xl:last:border-r-0',
            index % 2 === 0 && 'sm:border-r xl:border-r',
            active === stage.tab && 'bg-muted/40',
          )}
        >
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
            {stage.n}
          </p>
          <p className="mt-1 text-[12.5px] font-semibold">{stage.label}</p>
          <p className="mt-1.5 text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {stage.hero}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{stage.sub}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <i
              aria-hidden
              className="block h-full rounded-full"
              style={{ width: `${Math.max(stage.fill, 2)}%`, background: stage.color }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
