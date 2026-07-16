import { Boxes, ClipboardList, IndianRupee, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useDispatchFulfilment } from '@/modules/dashboards/dispatch-fulfilment/api';
import { ACCENTS, KpiStat } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { formatCurrency, getDefaultDateRange, getErrorMessage } from '@/shared/utils';

function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}
const money = (v: number) => `₹${abbreviate(v)}`;
const shortDate = (iso: string) => (iso.length >= 10 ? iso.slice(5) : iso);

const STATUS_COLORS: Record<string, string> = {
  DISPATCHED: ACCENTS.emerald.hex,
  BOOKED: ACCENTS.blue.hex,
  PENDING: ACCENTS.amber.hex,
  CANCELLED: ACCENTS.rose.hex,
};

/**
 * Dispatch analytics — headline KPIs, a dispatched-value area trend, and the
 * open-backlog-by-status breakdown. Reuses the dispatch-fulfilment summary
 * (cross-company, anchored on actual gate-out date).
 */
export function DispatchAnalytics() {
  const navigate = useNavigate();
  const range = useMemo(() => getDefaultDateRange(), []);
  const query = useDispatchFulfilment(range);
  const data = query.data;

  const trend = useMemo(
    () => (data?.trend ?? []).map((r) => ({ date: shortDate(r.date), value: r.dispatched_amount })),
    [data],
  );
  const byStatus = useMemo(
    () => (data?.by_status ?? []).map((s) => ({ status: s.status, value: s.amount })),
    [data],
  );

  const goToFulfilment = () => navigate('/dashboards/dispatch-fulfilment');

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-destructive">
        {getErrorMessage(query.error, 'Failed to load dispatch analytics.')}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStat
          icon={IndianRupee}
          label="Dispatched value"
          value={money(data.totals.dispatched.amount)}
          sub={`${data.totals.dispatched.bills} invoices shipped`}
          accent={ACCENTS.emerald}
          onClick={goToFulfilment}
          delayMs={0}
        />
        <KpiStat
          icon={Truck}
          label="Trucks out"
          value={data.totals.dispatched.count}
          sub="Gate-outs in window"
          accent={ACCENTS.teal}
          onClick={goToFulfilment}
          delayMs={60}
        />
        <KpiStat
          icon={Boxes}
          label="Boxes dispatched"
          value={abbreviate(data.totals.dispatched.boxes)}
          sub={`${abbreviate(data.totals.dispatched.weight)} kg`}
          accent={ACCENTS.sky}
          onClick={goToFulfilment}
          delayMs={120}
        />
        <KpiStat
          icon={ClipboardList}
          label="Open backlog"
          value={money(data.totals.backlog.amount)}
          sub={`${data.totals.backlog.count} bills pending`}
          accent={ACCENTS.amber}
          onClick={goToFulfilment}
          delayMs={180}
        />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dispatched value · last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nothing dispatched in this window.
              </p>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dispTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENTS.emerald.hex} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={ACCENTS.emerald.hex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                    <YAxis
                      fontSize={10}
                      width={52}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => money(v)}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Dispatched']}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={ACCENTS.emerald.hex}
                      strokeWidth={2.5}
                      fill="url(#dispTrend)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open backlog by status</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatus.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">All caught up.</p>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStatus} layout="vertical" margin={{ left: 16, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={(v: number) => money(v)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="status" width={82} fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Pending']}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {byStatus.map((s) => (
                        <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? ACCENTS.slate.hex} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
