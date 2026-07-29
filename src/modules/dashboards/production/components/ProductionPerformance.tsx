import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useOEETrendReport } from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams } from '@/modules/production/execution/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { ProductionVariant } from '../constants/production-dashboard.constants';

/** OEE performance — the OEE trend with A/P/Q, and OEE by line vs the target. */
export function ProductionPerformance({
  params,
  variant,
}: {
  params: AnalyticsParams;
  variant: ProductionVariant;
}) {
  const query = useOEETrendReport({ ...params, group_by: 'daily' });
  const data = query.data;

  const trend = useMemo(
    () =>
      (data?.trend ?? []).map((t) => ({
        period: t.period?.length >= 10 ? t.period.slice(5) : t.period,
        OEE: t.avg_oee,
        Availability: t.avg_availability,
        Performance: t.avg_performance,
        Quality: t.avg_quality,
      })),
    [data],
  );

  const byLine = useMemo(() => data?.by_line ?? [], [data]);

  if (query.isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* OEE trend with A/P/Q */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">OEE trend · availability / performance / quality</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No OEE data.</p>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="period" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} width={38} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <ReferenceLine y={variant.benchmarks.oee} stroke={ACCENTS.rose.hex} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="OEE" stroke={variant.accent.hex} strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Availability" stroke={ACCENTS.blue.hex} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="Performance" stroke={ACCENTS.violet.hex} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="Quality" stroke={ACCENTS.emerald.hex} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OEE by line */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">OEE by line</CardTitle>
        </CardHeader>
        <CardContent>
          {byLine.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No lines.</p>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byLine} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="line" width={90} fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'OEE']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <ReferenceLine x={variant.benchmarks.oee} stroke={ACCENTS.rose.hex} strokeDasharray="4 4" />
                  <Bar dataKey="avg_oee" radius={[0, 6, 6, 0]}>
                    {byLine.map((l) => (
                      <Cell
                        key={l.line}
                        fill={l.avg_oee >= variant.benchmarks.oee ? ACCENTS.emerald.hex : ACCENTS.orange.hex}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
