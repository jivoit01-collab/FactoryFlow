/**
 * A range of days drawn as a line per series (a commodity), and the row of
 * switches above it that say which lines are drawn: the switches are the
 * legend, each keyed with its line's stroke.
 *
 * One axis, in rupees. The tooltip reads every line drawn at the day under the
 * pointer, dearest first, so nobody has to land on a two-pixel line to get a
 * figure; the table under the chart has the same figures without hovering.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { SeriesKey } from './PriceBits';
import { axisRupees, type DayRow, type SeriesDef, shortDay, tooltipDay } from './priceFormat';

const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

function TrendTooltip({
  active,
  payload,
  series,
  format,
}: {
  series: SeriesDef[];
  format: (value: number) => string;
  active?: boolean;
  payload?: { payload?: DayRow }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const items = series
    .map((s) => {
      const value = row[s.slot];
      return { s, value: typeof value === 'number' ? value : null };
    })
    .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  return (
    <div className="max-w-[17rem] rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <p className="mb-1.5 text-xs font-semibold">{tooltipDay(row.date)}</p>
      <ul className="space-y-0.5">
        {items.map(({ s, value }) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            <SeriesKey color={s.color} dash={s.dash} />
            <span className="font-semibold tabular-nums">
              {value === null ? 'not quoted' : format(value)}
            </span>
            <span className="min-w-0 truncate text-muted-foreground">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({
  rows,
  series,
  format,
  dim,
  className,
}: {
  rows: DayRow[];
  /** The lines to draw: those switched on. */
  series: SeriesDef[];
  /** A figure for the tooltip: `₹ 1,234.50`. */
  format: (value: number) => string;
  /** Drawn faded while the next range is read, rather than blanked. */
  dim?: boolean;
  className?: string;
}) {
  // A dot a day reads on a month; on a quarter it hides the line.
  const dots = rows.length <= 31;
  return (
    <div
      className={cn(
        'h-[300px] w-full transition-opacity sm:h-[360px]',
        dim && 'opacity-60',
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.8} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDay}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickMargin={8}
            minTickGap={28}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={axisRupees}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            content={<TrendTooltip series={series} format={format} />}
            cursor={{
              stroke: 'hsl(var(--muted-foreground))',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            wrapperStyle={{ zIndex: 20 }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.slot}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dash}
              dot={dots ? { r: 2.5, strokeWidth: 0, fill: s.color } : false}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              // A day a commodity was not quoted is not a price of nothing.
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Which lines are drawn: a switch per series, keyed with its stroke, then All and None. */
export function SeriesToggles({
  series,
  selected,
  onToggle,
  onAll,
  onNone,
  label,
}: {
  series: SeriesDef[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onAll: () => void;
  onNone: () => void;
  /** What the switches choose, for a screen reader: "Commodities drawn". */
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {series.map((s) => {
        const on = selected.has(s.key);
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(s.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              on
                ? 'border-foreground/15 bg-muted text-foreground'
                : 'border-dashed text-muted-foreground hover:text-foreground',
            )}
          >
            <SeriesKey color={s.color} dash={s.dash} muted={!on} />
            {s.label}
          </button>
        );
      })}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAll}>
        All
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onNone}>
        None
      </Button>
    </div>
  );
}
