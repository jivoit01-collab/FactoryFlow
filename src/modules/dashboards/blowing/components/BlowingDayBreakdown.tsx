import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DailyReport } from '@/modules/production/blowing/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  BLOWING_BENCHMARKS,
  CHART_COLORS,
  count,
  dayLabel,
  money,
  pct,
  rejectionPct,
  TOOLTIP_STYLE,
} from '../constants';

interface BlowingDayBreakdownProps {
  report?: DailyReport;
  day: string;
  isLoading?: boolean;
}

/**
 * The selected day, split two ways — by machine and by preform size. This is
 * the daily report endpoint, which is single-date only; the month-level panels
 * above cover the range.
 */
export function BlowingDayBreakdown({ report, day, isLoading }: BlowingDayBreakdownProps) {
  const machines = useMemo(
    () =>
      (report?.by_machine ?? [])
        .map((m) => ({
          name: m.machine_name,
          production: m.total_production,
          rejection: m.total_rejection,
          rejectionPct: rejectionPct(m.total_rejection, m.total_production),
          netCost: m.net_cost,
        }))
        .sort((a, b) => b.production - a.production),
    [report],
  );

  const preforms = useMemo(() => {
    const rows = (report?.by_preform ?? [])
      .map((p) => ({
        label: `${p.make} ${p.gram}g`,
        production: p.total_production,
        rejection: p.total_rejection,
        rejectionPct: rejectionPct(p.total_rejection, p.total_production),
        netCost: p.net_cost,
      }))
      .sort((a, b) => b.production - a.production);
    const max = rows.reduce((m, r) => Math.max(m, r.production), 0) || 1;
    return { rows, max };
  }, [report]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-[300px] animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-[300px] animate-pulse rounded-2xl bg-muted/50" />
      </div>
    );
  }

  const empty = machines.length === 0 && preforms.rows.length === 0;

  if (empty) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          No blowing runs on {dayLabel(day)}.
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(200, machines.length * 44);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By machine · {dayLabel(day)}</CardTitle>
        </CardHeader>
        <CardContent>
          {machines.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No machine ran.</p>
          ) : (
            <>
              <div style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={machines} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis
                      type="number"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [count(Number(value)), 'Bottles blown']}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar dataKey="production" radius={[0, 6, 6, 0]} maxBarSize={26}>
                      {machines.map((m) => (
                        <Cell
                          key={m.name}
                          fill={
                            m.rejectionPct <= BLOWING_BENCHMARKS.rejectionPct
                              ? ACCENTS.emerald.hex
                              : ACCENTS.orange.hex
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Machine</th>
                      <th className="px-2 py-2 text-right font-medium">Blown</th>
                      <th className="px-2 py-2 text-right font-medium">Rej %</th>
                      <th className="py-2 pl-2 text-right font-medium">Net cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((m) => (
                      <tr key={m.name} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{m.name}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{count(m.production)}</td>
                        <td
                          className={`px-2 py-2 text-right tabular-nums ${
                            m.rejectionPct > BLOWING_BENCHMARKS.rejectionPct
                              ? 'font-semibold text-orange-600 dark:text-orange-400'
                              : ''
                          }`}
                        >
                          {pct(m.rejectionPct)}
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums">{money(m.netCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By preform · {dayLabel(day)}</CardTitle>
        </CardHeader>
        <CardContent>
          {preforms.rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No preform consumed.</p>
          ) : (
            <div className="space-y-3">
              {preforms.rows.map((p, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <div key={p.label} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {p.label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{count(p.production)}</span>
                        {' bottles · '}
                        {pct(p.rejectionPct)} rej · {money(p.netCost)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p.production / preforms.max) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
