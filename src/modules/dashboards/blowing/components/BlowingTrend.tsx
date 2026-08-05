import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MonthlyReport } from '@/modules/production/blowing/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { BLOWING_BENCHMARKS, count, dayLabel, rejectionPct, TOOLTIP_STYLE } from '../constants';

interface BlowingTrendProps {
  report?: MonthlyReport;
  isLoading?: boolean;
  /** Highlights the day the breakdown below is showing. */
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
}

/**
 * Day-wise trend for the selected month — output against cost per bottle, and
 * the rejection share against its target. Days with no run are omitted by the
 * backend, so the axis is the days that actually ran.
 */
export function BlowingTrend({ report, isLoading, selectedDay, onSelectDay }: BlowingTrendProps) {
  const rows = useMemo(
    () =>
      (report?.daywise ?? []).map((d) => ({
        date: d.date,
        label: dayLabel(d.date),
        production: d.total_production,
        rejection: d.total_rejection,
        rejectionPct: rejectionPct(d.total_rejection, d.total_production),
        units: d.total_units,
        netCost: d.net_cost,
        perBottle: d.avg_per_bottle_cost,
      })),
    [report],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[320px] animate-pulse rounded-2xl bg-muted/50 lg:col-span-2" />
        <div className="h-[320px] animate-pulse rounded-2xl bg-muted/50" />
      </div>
    );
  }

  const selectedLabel = rows.find((r) => r.date === selectedDay)?.label;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Day-wise output · cost per bottle</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No runs in this month.
            </p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={rows}
                  margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
                  onClick={(state) => {
                    const row = rows[Number(state?.activeTooltipIndex ?? -1)];
                    if (row && onSelectDay) onSelectDay(row.date);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    fontSize={10}
                    width={46}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={10}
                    width={46}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${v.toFixed(1)}`}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === 'Cost / bottle'
                        ? [`₹${Number(value).toFixed(4)}`, name]
                        : [count(Number(value)), name]
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                  {selectedLabel && (
                    <ReferenceLine
                      yAxisId="left"
                      x={selectedLabel}
                      stroke={ACCENTS.slate.hex}
                      strokeDasharray="4 4"
                    />
                  )}
                  <Bar
                    yAxisId="left"
                    dataKey="production"
                    name="Bottles blown"
                    fill={ACCENTS.blue.hex}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="rejection"
                    name="Rejected"
                    fill={ACCENTS.rose.hex}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="perBottle"
                    name="Cost / bottle"
                    stroke={ACCENTS.amber.hex}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          {rows.length > 0 && onSelectDay && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Click a day to load its machine and preform breakdown below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rejection %</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No runs in this month.</p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="blowingRejectionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENTS.rose.hex} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={ACCENTS.rose.hex} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis
                    fontSize={10}
                    width={38}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Rejection']}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <ReferenceLine
                    y={BLOWING_BENCHMARKS.rejectionPct}
                    stroke={ACCENTS.emerald.hex}
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="rejectionPct"
                    stroke={ACCENTS.rose.hex}
                    strokeWidth={2}
                    fill="url(#blowingRejectionFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Dashed line is the {BLOWING_BENCHMARKS.rejectionPct}% target. Per-preform standards are
            graded in the variance table below.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
