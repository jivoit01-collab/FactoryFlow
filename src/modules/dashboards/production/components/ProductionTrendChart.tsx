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
 */
export function ProductionTrendChart({
  trend,
  unitNoun,
  className,
}: {
  trend: ProductionTrendPoint[];
  unitNoun: string;
  className?: string;
}) {
  const palette = useWallPalette();

  const rows: ChartRow[] = trend.map((point) => ({
    date: point.date,
    label: dayLabel(point.date),
    cases: point.cases,
    perCase: point.perCase > 0 ? point.perCase : null,
    cost: point.cost,
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
                content={<TrendTooltip palette={palette} unitNoun={unitNoun} />}
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
  active,
  payload,
}: {
  palette: WallPalette;
  unitNoun: string;
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
          <span className="text-muted-foreground">Run cost</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {row.cost > 0 ? money(row.cost) : 'not costed'}
          </span>
        </li>
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
