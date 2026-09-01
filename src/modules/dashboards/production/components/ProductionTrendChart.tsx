import { TrendingUp } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/shared/utils';

import { BoardPanel } from '../../dispatch/components';
import { useWallPalette, type WallPalette } from '../../dispatch/constants/wall.palette';
import { compact, count, money } from '../../dispatch/utils/format';
import type { ProductionTrendPoint } from '../hooks';

interface ChartRow {
  date: string;
  label: string;
  cases: number;
  /** Null on a day nothing was costed — the line breaks rather than dropping
   *  to the floor, which would read as "we produced this for free". */
  perCase: number | null;
  cost: number;
  /** Bought-in material that day, shown in the tooltip whichever basis is on. */
  material: number;
  isToday: boolean;
}

/** 01/09 — short enough to fit fourteen of them across a panel. */
function dayLabel(iso: string): string {
  return iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso;
}

/**
 * A fortnight of output, with what it cost laid over it.
 *
 * Bars are cases off the line and come from the runs themselves; the line is
 * cost per case and comes from the costing engine. They are deliberately
 * different sources, and the gap between them is the point — a bar with no line
 * above it is a day that produced and was never costed, which is a Cost Master
 * problem the plant head can see from across the room.
 *
 * The shown day is drawn at full opacity and everything behind it is dimmed, so
 * the eye lands on "where are we against the run rate" without a legend lookup.
 *
 * The RM/PM switch lives here because this is where cost is read over time.
 * With it off the line is conversion cost only — what the plant added to
 * material it was handed. That is the comparison management actually wants
 * between months: the oil price moves on its own and drowns out everything the
 * floor did. The switch governs every cost figure on the board, not just this
 * line, so the tile above and the breakdown beside it can never be read on a
 * different basis from the chart.
 */
export function ProductionTrendChart({
  trend,
  unitNoun,
  includeMaterial,
  onToggleMaterial,
  className,
}: {
  trend: ProductionTrendPoint[];
  unitNoun: string;
  includeMaterial: boolean;
  onToggleMaterial: () => void;
  className?: string;
}) {
  const palette = useWallPalette();

  const rows: ChartRow[] = trend.map((point) => ({
    date: point.date,
    label: dayLabel(point.date),
    cases: point.cases,
    perCase: point.perCase > 0 ? point.perCase : null,
    cost: point.cost,
    material: point.material,
    isToday: point.isToday,
  }));

  // Averaged over the finished days only: the shown day may still be running,
  // and letting it drag the baseline down makes every morning look like a
  // collapse.
  const finished = rows.filter((row) => !row.isToday);
  const average = finished.length
    ? finished.reduce((sum, row) => sum + row.cases, 0) / finished.length
    : 0;

  const today = rows[rows.length - 1];
  const uncosted = trend.filter((point) => point.costMissing).length;

  return (
    <BoardPanel
      title={`Last ${rows.length} days`}
      icon={TrendingUp}
      hex={palette.hue('cases')}
      className={className}
      aside={
        <>
          <MaterialSwitch
            on={includeMaterial}
            onToggle={onToggleMaterial}
            hex={palette.hue('cost')}
          />
          <span className="rounded-full border border-black/[0.09] bg-black/[0.035] px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground/75 dark:border-white/10 dark:bg-white/5">
            avg {compact(average)} {unitNoun}s/day
          </span>
          {uncosted > 0 && (
            <span
              title="Those days produced but have no run cost behind them — the cost line has a gap rather than a zero."
              className="rounded-full border border-amber-600/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
            >
              {uncosted} uncosted
            </span>
          )}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid
                stroke={palette.chart.grid}
                strokeOpacity={palette.chart.gridOpacity}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: palette.chart.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                interval={0}
              />
              <YAxis
                yAxisId="cases"
                tick={{ fill: palette.chart.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(value: number) => compact(value)}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                tick={{ fill: palette.chart.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(value: number) => money(value)}
              />

              {average > 0 && (
                <ReferenceLine
                  yAxisId="cases"
                  y={average}
                  stroke={palette.chart.baseline}
                  strokeOpacity={0.4}
                  strokeDasharray="2 8"
                />
              )}

              <Bar yAxisId="cases" dataKey="cases" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {rows.map((row) => (
                  <Cell
                    key={row.date}
                    fill={palette.hue('cases')}
                    fillOpacity={row.isToday ? 1 : 0.42}
                  />
                ))}
              </Bar>

              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="perCase"
                stroke={palette.hue('cost')}
                strokeWidth={2.5}
                dot={{ r: 2.2, strokeWidth: 0, fill: palette.hue('cost') }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />

              <Tooltip
                cursor={{ fill: palette.chart.grid, fillOpacity: 0.06 }}
                content={
                  <TrendTooltip
                    palette={palette}
                    unitNoun={unitNoun}
                    includeMaterial={includeMaterial}
                  />
                }
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: palette.hue('cases') }}
              />
              {unitNoun}s produced
              <span className="font-bold tabular-nums text-foreground">
                {count(today?.cases ?? 0)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="18" height="6" viewBox="0 0 18 6" aria-hidden className="shrink-0">
                <line x1="1" y1="3" x2="17" y2="3" stroke={palette.hue('cost')} strokeWidth="2.5" />
              </svg>
              cost / {unitNoun}
              <span className="font-bold tabular-nums text-foreground">
                {today?.perCase == null ? '—' : money(today.perCase)}
              </span>
              {!includeMaterial && (
                <span className="font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  excl. RM/PM
                </span>
              )}
            </span>
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
            {rows[0]?.label} → {today?.isToday ? 'the day shown' : today?.label}
          </span>
        </div>
      </div>
    </BoardPanel>
  );
}

function TrendTooltip({
  palette,
  unitNoun,
  includeMaterial,
  active,
  payload,
}: {
  palette: WallPalette;
  unitNoun: string;
  includeMaterial: boolean;
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div
      className="rounded-xl border px-3 py-2 shadow-xl"
      style={{ background: palette.chart.tooltipBg, borderColor: palette.chart.tooltipBorder }}
    >
      <p className="mb-1 text-xs font-bold text-foreground">
        {row.label}
        {row.isToday ? ' · the day shown' : ''}
      </p>
      <ul className="space-y-0.5 text-[11px]">
        <li className="flex items-center gap-3">
          <span className="text-muted-foreground">{unitNoun}s</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {count(row.cases)}
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Run cost{includeMaterial ? '' : ' (conversion)'}
          </span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {row.cost > 0 ? money(row.cost) : 'not costed'}
          </span>
        </li>
        {row.material > 0 && (
          <li className="flex items-center gap-3">
            <span className="text-muted-foreground">
              RM/PM {includeMaterial ? 'included' : 'excluded'}
            </span>
            <span
              className={cn(
                'ml-auto font-semibold tabular-nums',
                includeMaterial ? 'text-foreground' : 'text-amber-700 dark:text-amber-300',
              )}
            >
              {includeMaterial ? '' : '−'}
              {money(row.material)}
            </span>
          </li>
        )}
        <li className="flex items-center gap-3">
          <span className="text-muted-foreground">Cost / {unitNoun}</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {row.perCase == null ? '—' : money(row.perCase)}
          </span>
        </li>
      </ul>
    </div>
  );
}

/**
 * RM/PM in or out.
 *
 * A switch rather than two chips: the board only ever shows one basis, and a
 * pair of chips would suggest the numbers beside them could be added together.
 * The off state is drawn amber and repeated on the legend and the cost tile —
 * a conversion cost mistaken for a full cost is the one error this control can
 * cause, so it is never left to the switch alone to say which is on show.
 */
function MaterialSwitch({ on, onToggle, hex }: { on: boolean; onToggle: () => void; hex: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={
        on
          ? 'Cost includes raw and packing material. Switch off for conversion cost only.'
          : 'Conversion cost only — raw and packing material is excluded. Switch on for the full cost.'
      }
      className={cn(
        'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
        on
          ? 'border-black/[0.09] bg-black/[0.035] text-foreground/75 dark:border-white/10 dark:bg-white/5'
          : 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300',
      )}
    >
      <span
        aria-hidden
        className="relative h-3.5 w-6 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: on ? hex : 'rgba(120,113,108,0.35)' }}
      >
        <span
          className={cn(
            'absolute top-[3px] h-2 w-2 rounded-full bg-white transition-all duration-200',
            on ? 'left-[15px]' : 'left-[3px]',
          )}
        />
      </span>
      RM/PM
    </button>
  );
}
