/**
 * The module's charts, and the rules they all obey.
 *
 * Five forms, each picked for the job its data does rather than for variety:
 *
 * | Question                                  | Form                        |
 * |-------------------------------------------|-----------------------------|
 * | How is one package made up?               | stacked composition bar     |
 * | How many people per department / rung?    | horizontal bars, one series |
 * | How are salaries spread?                  | column histogram, ordered   |
 * | Who joined and who left, month by month?  | two lines, one axis         |
 * | How big is each manager's team?           | stacked bars in a list      |
 *
 * The shared rules, applied here once instead of per chart:
 *
 * **Colour is by role, from validated tokens.** `--emp-series-1..3` are slots
 * 1–3 of the app's categorical order, validated as an all-pairs set against
 * both the light and dark chart surfaces. They are read as CSS variables, so
 * the theme toggle re-colours every chart without a re-render — and a series
 * keeps its hue when a filter removes its neighbours, because the colour
 * follows the thing, never its rank.
 *
 * **One series means one colour and no legend** — the card's title already
 * says what is plotted, and colouring bars by their own length would burn the
 * only free channel on information the bar's length already carries.
 *
 * **Text never wears the series colour.** Marks carry identity; labels, values
 * and axes use the app's text tokens. Slot 3 sits just under 3:1 on white, so
 * anywhere it appears the number is printed beside it as well.
 *
 * **Marks are thin and quiet**: bars capped at 22px with a 4px rounded
 * data-end and a square baseline, 2px lines with 8px markers, hairline solid
 * gridlines one step off the surface, and a 2px surface gap between touching
 * fills instead of a border.
 *
 * Every chart carries a tooltip, and every chart's numbers are also on the page
 * as text — so nothing is gated behind hovering, and the figures survive being
 * printed in black and white.
 *
 * Nothing animates in. A bar that grows from zero is a bar that reads as *empty*
 * for the first half-second — in print, in a screenshot, and on a slow render it
 * may never finish growing at all. The rest of the app's charts made the same
 * call.
 */
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/shared/utils';

const SERIES = {
  one: 'var(--emp-series-1)',
  two: 'var(--emp-series-2)',
  three: 'var(--emp-series-3)',
} as const;

const AXIS = 'hsl(var(--muted-foreground))';
const GRID = 'hsl(var(--border))';

/** Bar thickness cap: the band's leftover is deliberately left as air. */
const BAR_SIZE = 22;

const AXIS_TICK = { fill: AXIS, fontSize: 11 } as const;

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Tooltip in the app's own surface and text tokens, not recharts' default. */
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string | number;
  formatter?: (value: number | string, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-2 text-xs shadow-md">
      {label !== undefined && <p className="mb-1 font-semibold text-popover-foreground">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-popover-foreground">
            {formatter
              ? formatter(entry.value ?? 0, entry.name)
              : Number(entry.value ?? 0).toLocaleString('en-IN')}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface CountRow {
  name: string;
  count: number;
  /** Set on the one row the reader is being pointed at, if any. */
  highlight?: boolean;
}

/**
 * Headcount by category — one series, one colour, bars along the x-axis.
 *
 * Horizontal because the categories are names: a department called "Human
 * Resources" needs a readable label, and rotated column labels are the most
 * common way a headcount chart becomes unreadable.
 */
export function CountBarChart({
  rows,
  height,
  valueLabel = 'People',
}: {
  rows: CountRow[];
  height?: number;
  valueLabel?: string;
}) {
  // Sized from the rows so the x-axis band is always inside the box — a fixed
  // height is how a chart card ends up with its own little scrollbar.
  const computedHeight = height ?? Math.max(140, rows.length * 30 + 36);
  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          stroke={GRID}
          allowDecimals={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          stroke={GRID}
          width={120}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.4 }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="count"
          name={valueLabel}
          fill={SERIES.one}
          radius={[0, 4, 4, 0]}
          barSize={BAR_SIZE}
          isAnimationActive={false}
          // The value at the tip: bars carry their number so the chart reads
          // without the axis and without hovering.
          label={{ position: 'right', fill: AXIS, fontSize: 11 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Salary distribution — ordered bands, so a column histogram.
 *
 * Columns rather than bars because the bands have a natural left-to-right
 * order (cheapest to dearest) and reading them in that direction is the point.
 */
export function DistributionChart({
  rows,
  height = 220,
}: {
  rows: { label: string; count: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={{ ...AXIS_TICK, fontSize: 10 }}
          stroke={GRID}
          tickLine={false}
          interval={0}
        />
        <YAxis tick={AXIS_TICK} stroke={GRID} allowDecimals={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.4 }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="count"
          name="Employees"
          fill={SERIES.one}
          radius={[4, 4, 0, 0]}
          barSize={BAR_SIZE}
          isAnimationActive={false}
          label={{ position: 'top', fill: AXIS, fontSize: 11 }}
        >
          {rows.map((row) => (
            <Cell key={row.label} fill={SERIES.one} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Joiners and leavers, month by month.
 *
 * Two series on **one** axis — both are counts of people, so they share a
 * scale honestly. A legend is present because there are two, and the lines are
 * 2px with 8px end markers ringed in the surface colour so they stay legible
 * where they cross.
 */
export function HeadcountTrendChart({
  rows,
  height = 240,
}: {
  rows: { label: string; joined: number; exits: number }[];
  height?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: SERIES.one }} />
          <span className="text-muted-foreground">Joined</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: SERIES.two }} />
          <span className="text-muted-foreground">Left</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
          <XAxis dataKey="label" tick={AXIS_TICK} stroke={GRID} tickLine={false} />
          <YAxis tick={AXIS_TICK} stroke={GRID} allowDecimals={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="joined"
            name="Joined"
            stroke={SERIES.one}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES.one, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="exits"
            name="Left"
            stroke={SERIES.two}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES.two, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface CompositionSlice {
  label: string;
  amount: number;
  color: string;
}

/** The three series colours, by the part of the package they stand for. */
export const COMPOSITION_COLORS = {
  basic: SERIES.one,
  allowances: SERIES.two,
  bonuses: SERIES.three,
} as const;

/**
 * One salary package, as a part-to-whole bar plus its numbers.
 *
 * Built in plain CSS rather than as a chart, because at three segments a chart
 * library is all overhead: the bar is three flex children with a 2px surface
 * gap between them, and the legend underneath *is* the table — every segment's
 * name, rupee figure and share, printed. That is also what satisfies the
 * contrast relief rule for the third hue, which sits just under 3:1 on white.
 */
export function CompositionBar({
  slices,
  total,
  formatAmount,
  className,
}: {
  slices: CompositionSlice[];
  total: number;
  formatAmount: (amount: number) => string;
  className?: string;
}) {
  const positive = slices.filter((slice) => slice.amount > 0);
  const sum = positive.reduce((running, slice) => running + slice.amount, 0) || 1;

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img"
        aria-label={positive
          .map((slice) => `${slice.label} ${formatAmount(slice.amount)}`)
          .join(', ')}
      >
        {positive.map((slice, index) => (
          <div
            key={slice.label}
            style={{
              width: `${(slice.amount / sum) * 100}%`,
              backgroundColor: slice.color,
              // The 2px surface gap that separates touching fills, instead of
              // a border drawn around them.
              marginLeft: index === 0 ? 0 : 2,
            }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      <dl className="space-y-1.5">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <dt className="text-muted-foreground">{slice.label}</dt>
            <dd className="ml-auto flex items-center gap-2">
              <span className="font-medium tabular-nums">{formatAmount(slice.amount)}</span>
              <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                {total ? `${Math.round((slice.amount / total) * 100)}%` : '—'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Team sizes, as a list of stacked bars.
 *
 * Two segments per manager — their direct reports, then everyone else
 * underneath — which is part-to-whole of the same total and so a legitimate
 * stack. A list rather than a chart because the interesting column is the
 * *names*, and twenty-five names on a chart axis is a chart nobody reads.
 */
export function TeamSizeBars({
  rows,
  className,
}: {
  rows: { id: number; name: string; department: string; direct_reports: number; total_reports: number }[];
  className?: string;
}) {
  const widest = Math.max(1, ...rows.map((row) => row.total_reports));
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COMPOSITION_COLORS.basic }}
          />
          <span className="text-muted-foreground">Direct reports</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COMPOSITION_COLORS.allowances }}
          />
          <span className="text-muted-foreground">Further down their team</span>
        </span>
      </div>
      {rows.map((row) => {
        const indirect = Math.max(0, row.total_reports - row.direct_reports);
        return (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{row.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{row.department}</div>
            </div>
            <div className="flex h-2.5 items-center">
              <div
                style={{
                  width: `${(row.direct_reports / widest) * 100}%`,
                  backgroundColor: COMPOSITION_COLORS.basic,
                }}
                className="h-full rounded-l-full"
              />
              {indirect > 0 && (
                <div
                  style={{
                    width: `${(indirect / widest) * 100}%`,
                    backgroundColor: COMPOSITION_COLORS.allowances,
                    marginLeft: 2,
                  }}
                  className="h-full rounded-r-full"
                />
              )}
            </div>
            <div className="text-right text-sm tabular-nums">
              <span className="font-semibold">{row.direct_reports}</span>
              {indirect > 0 && (
                <span className="text-muted-foreground"> / {row.total_reports}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
