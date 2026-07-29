import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useCostAnalysisReport } from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams } from '@/modules/production/execution/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils';

import {
  CHART_COLORS,
  money,
  prettyLabel,
  type ProductionVariant,
} from '../constants/production-dashboard.constants';

const shortDate = (iso: string) => (iso?.length >= 10 ? iso.slice(5) : iso);

/**
 * Cost economics — where the money goes per unit. Shows the cost-category
 * breakdown (donut), the cost-per-unit trend, and cost-per-unit by line.
 */
export function ProductionEconomics({
  params,
  variant,
}: {
  params: AnalyticsParams;
  variant: ProductionVariant;
}) {
  const query = useCostAnalysisReport(params);
  const data = query.data;

  const distribution = useMemo(() => {
    const dist = data?.cost_distribution ?? {};
    return Object.entries(dist)
      .map(([key, v]) => ({ name: prettyLabel(key), amount: v.amount, percentage: v.percentage }))
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  const trend = useMemo(
    () =>
      (data?.trend ?? []).map((t) => ({
        date: shortDate(t.date),
        perUnit: t.per_unit_cost / (variant.unitsPerCase || 1),
      })),
    [data, variant.unitsPerCase],
  );

  const byLine = useMemo(
    () =>
      (data?.by_line ?? []).map((l) => ({
        line: l.line,
        perUnit: l.avg_per_unit / (variant.unitsPerCase || 1),
      })),
    [data, variant.unitsPerCase],
  );

  if (query.isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* cost breakdown donut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {distribution.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No cost data.</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
              <div className="h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {distribution.map((d, i) => (
                        <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {distribution.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="font-medium tabular-nums">{money(d.amount)}</span>
                    <span className="w-10 text-right tabular-nums text-muted-foreground">
                      {d.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* cost / unit trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Cost per {variant.unitNoun} · trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No trend data.</p>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={variant.accent.hex} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={variant.accent.hex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} width={54} axisLine={false} tickLine={false} tickFormatter={(v: number) => money(v)} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), `Per ${variant.unitNoun}`]}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="perUnit"
                    stroke={variant.accent.hex}
                    strokeWidth={2.5}
                    fill="url(#costTrend)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* cost per unit by line */}
          {byLine.length > 0 && (
            <div className="mt-4 h-[140px]">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Cost per {variant.unitNoun} by line
              </p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byLine} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={(v: number) => money(v)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="line" width={90} fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), `Per ${variant.unitNoun}`]}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Bar dataKey="perUnit" radius={[0, 6, 6, 0]} fill={ACCENTS.amber.hex} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
