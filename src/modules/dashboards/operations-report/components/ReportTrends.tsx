import { TrendingUp } from 'lucide-react';
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

import type { ReportPalette } from '../constants';
import type { OperationsReport, ReportDaySummary } from '../types';
import { axisTick, perLitre, rupees, shortDay, weekdayDay, whole } from '../utils';
import { ReportPanel } from './ReportPanel';

interface Measure {
  key: string;
  title: string;
  unit: string;
  pick: (day: ReportDaySummary) => number | null;
  /** The figure in a tooltip. */
  exact: (value: number) => string;
  /** The figure on an axis tick. */
  tick: (value: number) => string;
  hue: string;
  form: 'bar' | 'line';
}

function TrendTooltip({
  active,
  payload,
  measure,
}: {
  active?: boolean;
  payload?: { payload: ReportDaySummary & { value: number | null } }[];
  measure: Measure;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{weekdayDay(point.date)}</p>
      <p className="mt-0.5 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: measure.hue }}
          aria-hidden
        />
        <span className="text-muted-foreground">{measure.title}</span>
        <span className="ml-auto font-semibold tabular-nums">
          {point.value === null ? '—' : measure.exact(point.value)}
        </span>
      </p>
    </div>
  );
}

/** One measure, one small chart, one axis. */
function SmallChart({
  measure,
  days,
  palette,
  highlight,
  onSelectDay,
}: {
  measure: Measure;
  days: ReportDaySummary[];
  palette: ReportPalette;
  highlight: string | null;
  onSelectDay: (date: string) => void;
}) {
  const data = days.map((day) => ({ ...day, value: measure.pick(day) }));
  const axis = {
    tick: { fontSize: 10, fill: palette.axis },
    tickLine: false,
  } as const;

  const chrome = (
    <>
      <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="date"
        tickFormatter={(date: string) => String(Number(date.slice(8)))}
        axisLine={{ stroke: palette.grid }}
        minTickGap={8}
        {...axis}
      />
      <YAxis axisLine={false} tickFormatter={measure.tick} width={48} {...axis} />
      <Tooltip
        content={<TrendTooltip measure={measure} />}
        cursor={
          measure.form === 'bar'
            ? { fill: palette.grid, opacity: 0.5 }
            : { stroke: palette.axis, strokeDasharray: '4 4' }
        }
      />
    </>
  );

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{measure.title}</p>
        <p className="text-[11px] text-muted-foreground">{measure.unit}</p>
      </div>
      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {measure.form === 'bar' ? (
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              {chrome}
              <Bar
                dataKey="value"
                fill={measure.hue}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                className="cursor-pointer"
                onClick={(bar) => {
                  const date = (bar.payload as ReportDaySummary | undefined)?.date;
                  if (date) onSelectDay(date);
                }}
              >
                {data.map((day) => (
                  <Cell
                    key={day.date}
                    fillOpacity={highlight === null || highlight === day.date ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              {chrome}
              <Line
                type="monotone"
                dataKey="value"
                stroke={measure.hue}
                strokeWidth={2}
                // A shut day has no cost per litre; the line breaks there rather
                // than diving to a zero nobody paid.
                connectNulls={false}
                dot={(props: { cx?: number; cy?: number; payload?: ReportDaySummary }) =>
                  props.payload?.date === highlight && props.cx != null && props.cy != null ? (
                    <circle
                      key={props.payload.date}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={measure.hue}
                      stroke="var(--background, #fff)"
                      strokeWidth={2}
                    />
                  ) : (
                    <g key={props.payload?.date} />
                  )
                }
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Day by day, one small chart per measure.
 *
 * Small multiples rather than one chart with every series on it: litres,
 * rupees and kilowatt-hours are different units, and putting two of them on one
 * chart means two scales — where the lines cross is then wherever the scales
 * happen to put them, and means nothing.
 *
 * On the month view the bars are the month's days. On the day view they are
 * the fortnight to the day, with the day itself picked out. A bar opens its day.
 */
export function ReportTrends({
  report,
  palette,
  onSelectDay,
}: {
  report: OperationsReport;
  palette: ReportPalette;
  onSelectDay: (date: string) => void;
}) {
  const measures: Measure[] = [
    {
      key: 'production',
      title: 'Production',
      unit: 'litres',
      pick: (day) => day.litres,
      exact: (value) => `${whole(value)} L`,
      tick: axisTick,
      hue: palette.production,
      form: 'bar',
    },
    {
      key: 'wastage',
      title: 'Wastage',
      unit: '₹',
      pick: (day) => day.wastageValue,
      exact: rupees,
      tick: axisTick,
      hue: palette.wastage,
      form: 'bar',
    },
    {
      key: 'labour',
      title: 'Labour',
      unit: '₹',
      pick: (day) => day.labourCost,
      exact: rupees,
      tick: axisTick,
      hue: palette.labour,
      form: 'bar',
    },
    {
      key: 'electricity',
      title: 'Electricity',
      unit: 'kWh',
      pick: (day) => day.kwh,
      exact: (value) => `${whole(value)} kWh`,
      tick: axisTick,
      hue: palette.power,
      form: 'bar',
    },
    {
      key: 'per-litre',
      title: 'Cost per litre',
      unit: '₹ / L',
      pick: (day) => day.perLitre.total,
      exact: perLitre,
      tick: (value) => value.toFixed(1),
      hue: palette.total,
      form: 'line',
    },
    {
      key: 'returns',
      title: 'Goods Return (GR)',
      unit: '₹',
      pick: (day) => day.grValue,
      exact: rupees,
      tick: axisTick,
      hue: palette.returns,
      form: 'bar',
    },
  ];

  const highlight = report.view === 'day' ? report.from : null;
  const first = report.daily[0]?.date;
  const last = report.daily[report.daily.length - 1]?.date;

  return (
    <ReportPanel
      title="Day by day"
      subtitle={
        report.view === 'day'
          ? `The fortnight to ${shortDay(report.from)}, the day itself picked out. Click a bar to open its day.`
          : 'Each day of the month. Click a bar to open its day.'
      }
      icon={TrendingUp}
      accent="indigo"
      aside={
        first && last ? (
          <span className="text-xs text-muted-foreground">
            {shortDay(first)} – {shortDay(last)}
          </span>
        ) : null
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {measures.map((measure) => (
          <SmallChart
            key={measure.key}
            measure={measure}
            days={report.daily}
            palette={palette}
            highlight={highlight}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </ReportPanel>
  );
}
