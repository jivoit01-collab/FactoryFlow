import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useWasteTrendReport } from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams } from '@/modules/production/execution/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { count } from '../constants/production-dashboard.constants';

const shortDate = (iso: string) => (iso?.length >= 10 ? iso.slice(5) : iso);

/** Waste & scrap — quantity trend and the top waste reasons. */
export function ProductionWaste({ params }: { params: AnalyticsParams }) {
  const query = useWasteTrendReport(params);
  const data = query.data;

  const trend = useMemo(
    () => (data?.trend ?? []).map((t) => ({ date: shortDate(t.date), qty: t.total_qty })),
    [data],
  );
  const byReason = useMemo(
    () =>
      [...(data?.by_reason ?? [])]
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 8)
        .map((r) => ({ reason: r.reason || '—', qty: r.total_qty })),
    [data],
  );

  if (query.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waste quantity · trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">No waste logged.</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wasteTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENTS.rose.hex} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={ACCENTS.rose.hex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} width={44} axisLine={false} tickLine={false} tickFormatter={(v: number) => count(v)} />
                  <Tooltip
                    formatter={(value) => [count(Number(value)), 'Waste qty']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="qty" stroke={ACCENTS.rose.hex} strokeWidth={2.5} fill="url(#wasteTrend)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top waste reasons</CardTitle>
        </CardHeader>
        <CardContent>
          {byReason.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">No waste reasons.</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byReason} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => count(v)} />
                  <YAxis type="category" dataKey="reason" width={110} fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [count(Number(value)), 'Waste qty']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Bar dataKey="qty" radius={[0, 6, 6, 0]} fill={ACCENTS.amber.hex} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
