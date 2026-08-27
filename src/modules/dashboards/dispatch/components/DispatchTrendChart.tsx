import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/shared/utils';

import type { DispatchDayTotals, TrendPoint } from '../hooks';
import { compact, count, money, weight } from '../utils/format';

/** Every KPI tile above the chart, as a series. Colours are the tile colours —
 *  the legend has to read as "this is that card, over time". */
interface SeriesSpec {
  key: keyof Pick<TrendPoint, 'trucks' | 'amount' | 'bills' | 'boxes' | 'litres' | 'weightKg'>;
  label: string;
  hex: string;
  /** Renders the raw value for the legend and the tooltip. */
  format: (value: number) => string;
  /** SVG stroke pattern. Undefined draws solid. */
  dash?: string;
  /** Round caps turn a `1 n` pattern into actual round dots rather than ticks. */
  round?: boolean;
  /** The thick line the eye follows first. */
  hero?: boolean;
}

/**
 * Colour alone is not enough to tell six lines apart. Two of these hues sit
 * close together, a viewer with colour-vision deficiency may see no gap at all,
 * and across a lit room a 55" panel washes the difference out further. So every
 * series carries a stroke pattern as well, and the legend swatch draws that same
 * pattern rather than a plain dot — a coloured circle cannot tell you which line
 * is which once the colours stop being distinguishable.
 *
 * The money line stays solid and thick: it is the one the eye should land on
 * first, and a pattern would cost it that.
 */
const SERIES: SeriesSpec[] = [
  { key: 'amount', label: 'Dispatched value', hex: '#60a5fa', format: money, hero: true },
  { key: 'trucks', label: 'Trucks out', hex: '#34d399', format: count, dash: '9 5' },
  {
    key: 'bills',
    label: 'Invoices shipped',
    hex: '#22d3ee',
    format: count,
    dash: '1 5',
    round: true,
  },
  { key: 'boxes', label: 'Boxes out', hex: '#a78bfa', format: compact, dash: '12 4 2 4' },
  {
    key: 'litres',
    label: 'Volume out',
    hex: '#fbbf24',
    format: (v) => `${compact(v)} L`,
    dash: '5 5',
  },
  {
    key: 'weightKg',
    label: 'Weight out',
    hex: '#f472b6',
    format: weight,
    dash: '2 3',
    round: true,
  },
];

/** The legend/tooltip key: the series' actual stroke, not a generic dot. */
function SeriesSwatch({ series, muted }: { series: SeriesSpec; muted?: boolean }) {
  return (
    <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden className="shrink-0 overflow-visible">
      <line
        x1="1"
        y1="4"
        x2="19"
        y2="4"
        stroke={muted ? '#475569' : series.hex}
        strokeWidth={series.hero ? 3 : 2.25}
        strokeDasharray={series.dash}
        strokeLinecap={series.round ? 'round' : 'butt'}
      />
    </svg>
  );
}

/** Day label: 27/08 — short enough to fit fourteen of them. */
function dayLabel(iso: string): string {
  return iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso;
}

interface ChartRow extends Record<string, number | string | boolean | null> {
  date: string;
  label: string;
  isToday: boolean;
  /** Running best index of the hero series — the stepped ceiling. */
  best: number;
}

/**
 * Every KPI on one fortnight trend.
 *
 * Six tiles, six units — rupees, trucks, invoices, boxes, litres, kilos — and no
 * axis can carry all of them honestly. So each series is drawn as a percentage
 * of its OWN 14-day average: 100 means "a normal day for that measure", which
 * makes the *shapes* directly comparable. That is the reading that matters —
 * value down while trucks are up means the day shipped cheap stock, and no
 * single-unit axis can show you that.
 *
 * The real numbers are never hidden: the right axis is the rupee scale mapped
 * through the same transform, every legend chip carries today's actual figure,
 * and the tooltip lists all six in their own units.
 *
 * The stepped grey ceiling is the best day so far, the way a personal-best line
 * works. Today's point is drawn hollow because the day is still running —
 * a partial day and a finished one must not look alike.
 */
export function DispatchTrendChart({ totals }: { totals: DispatchDayTotals }) {
  // On a wall nobody can click, so every series starts visible. Toggling is for
  // whoever opens the same board at a desk.
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { rows, averages, live, dead, maxIndex } = useMemo(() => {
    const points = totals.trend;
    // Averaged over COMPLETED days only: today is still running, and letting it
    // drag the baseline down would make every morning look like a collapse.
    const finished = points.filter((point) => !point.isToday);

    const averages = {} as Record<SeriesSpec['key'], number>;
    const live: SeriesSpec[] = [];
    const dead: SeriesSpec[] = [];

    for (const series of SERIES) {
      const values = finished
        .map((point) => point[series.key])
        .filter((value): value is number => typeof value === 'number');
      const total = values.reduce((sum, value) => sum + value, 0);
      const mean = values.length ? total / values.length : 0;
      averages[series.key] = mean;
      // No history, or a fortnight of nothing: either way there is no shape to
      // draw, and a flat line on the floor would read as real data.
      if (values.length === 0 || mean <= 0) dead.push(series);
      else live.push(series);
    }

    // Plain loops rather than map/forEach: the running `best` and `maxIndex`
    // accumulate across rows, and a closure that reassigns them is exactly what
    // the compiler's immutability rule (rightly) rejects.
    const rows: ChartRow[] = [];
    let best = 0;
    let peak = 100;

    for (const point of points) {
      const row: ChartRow = {
        date: point.date,
        label: dayLabel(point.date),
        isToday: point.isToday,
        best: 0,
      };
      for (const series of live) {
        const raw = point[series.key];
        const value = typeof raw === 'number' ? raw : 0;
        const index = (value / averages[series.key]) * 100;
        row[series.key] = index;
        row[`${series.key}__raw`] = value;
        if (index > peak) peak = index;
      }
      // The ceiling tracks the hero series and never steps down. Today is
      // excluded: a part-finished day cannot set a record.
      const heroIndex = typeof row.amount === 'number' ? row.amount : 0;
      if (!point.isToday && heroIndex > best) best = heroIndex;
      row.best = best;
      rows.push(row);
    }

    return { rows, averages, live, dead, maxIndex: Math.ceil(peak / 25) * 25 };
  }, [totals.trend]);

  const visible = live.filter((series) => !hidden.has(series.key));
  const today = totals.trend.find((point) => point.isToday);

  // Five evenly-spaced ticks across the same domain the lines use.
  const moneyTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => (maxIndex / 4) * index),
    [maxIndex],
  );

  const toggle = (key: string) =>
    setHidden((previous) => {
      const next = new Set(previous);
      // Never let the last line be switched off — an empty chart is a fault
      // state, not a view.
      if (next.has(key)) next.delete(key);
      else if (visible.length > 1) next.add(key);
      return next;
    });

  return (
    <section className="flex h-[236px] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.035] px-4 pb-2 pt-3">
      <header className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          14-day trend
        </h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          % of own 14-day average
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {live.map((series) => {
            const off = hidden.has(series.key);
            const raw = today?.[series.key];
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggle(series.key)}
                title={`${series.label} — today ${
                  typeof raw === 'number' ? series.format(raw) : '—'
                }`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-opacity',
                  off
                    ? 'border-white/10 bg-transparent text-slate-600 opacity-50'
                    : 'border-white/10 bg-white/5 text-slate-300',
                )}
              >
                <SeriesSwatch series={series} muted={off} />
                {series.label}
                <span className="font-bold tabular-nums text-white">
                  {typeof raw === 'number' ? series.format(raw) : '—'}
                </span>
              </button>
            );
          })}
          {dead.map((series) => (
            <span
              key={series.key}
              title="The backend reports no daily history for this measure."
              className="flex items-center gap-1.5 rounded-full border border-dashed border-white/10 px-2 py-0.5 text-[11px] text-slate-600"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-slate-700" />
              {series.label}
              <span className="italic">no history</span>
            </span>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#ffffff" strokeOpacity={0.06} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickMargin={6}
              interval={0}
            />
            {/* left: the shared index every series is drawn against */}
            <YAxis
              yAxisId="index"
              domain={[0, maxIndex]}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(value: number) => `${value}%`}
            />
            {/* right: the SAME scale read back in rupees, so the money line can
                be read off the edge without doing the percentage in your head.
                Ticks are passed explicitly — no series is bound to this axis
                (every line is drawn against the index), and recharts derives
                nothing for an axis with no data, so it would otherwise render
                blank. */}
            <YAxis
              yAxisId="money"
              orientation="right"
              domain={[0, maxIndex]}
              ticks={moneyTicks}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={58}
              tickFormatter={(value: number) => money((value / 100) * averages.amount)}
            />

            <ReferenceLine
              yAxisId="index"
              y={100}
              stroke="#94a3b8"
              strokeOpacity={0.35}
              // Sparser than any series pattern, so the baseline never reads as
              // one of the six lines.
              strokeDasharray="2 8"
            />

            {/* best day so far — the stepped ceiling */}
            <Line
              yAxisId="index"
              type="stepAfter"
              dataKey="best"
              stroke="#94a3b8"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name="__best"
            />

            {visible.map((series) => (
              <Line
                key={series.key}
                yAxisId="index"
                type="monotone"
                dataKey={series.key}
                stroke={series.hex}
                strokeWidth={series.hero ? 3 : 2}
                strokeDasharray={series.dash}
                strokeLinecap={series.round ? 'round' : 'butt'}
                dot={<SeriesDot hex={series.hex} />}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
                name={series.label}
              />
            ))}

            <Tooltip
              cursor={{ stroke: '#ffffff', strokeOpacity: 0.15 }}
              content={<TrendTooltip series={visible} />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/** Solid dot for a finished day, hollow for today — the day is not done yet. */
function SeriesDot(props: { hex: string; cx?: number; cy?: number; payload?: ChartRow }) {
  const { hex, cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const isToday = payload?.isToday === true;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isToday ? 4 : 2.4}
      fill={isToday ? '#070b14' : hex}
      stroke={hex}
      strokeWidth={isToday ? 2 : 0}
    />
  );
}

/** Every visible series for that day, in its own real unit. */
function TrendTooltip({
  series,
  active,
  payload,
}: {
  series: SeriesSpec[];
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1424] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-bold text-white">
        {row.label}
        {row.isToday ? ' · today (still running)' : ''}
      </p>
      <ul className="space-y-0.5">
        {series.map((spec) => {
          const raw = row[`${spec.key}__raw`];
          const index = row[spec.key];
          return (
            <li key={spec.key} className="flex items-center gap-2 text-[11px]">
              <SeriesSwatch series={spec} />
              <span className="text-slate-400">{spec.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-white">
                {typeof raw === 'number' ? spec.format(raw) : '—'}
              </span>
              <span className="w-11 shrink-0 text-right tabular-nums text-slate-500">
                {typeof index === 'number' ? `${Math.round(index)}%` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
