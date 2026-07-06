import { useCallback, useMemo, useState } from 'react';
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
import { Boxes, ClipboardList, IndianRupee, Truck } from 'lucide-react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  DashboardError,
  DashboardHeader,
  DashboardLoading,
  SummaryCard,
} from '@/shared/components/dashboard';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { formatCurrency, formatNumber, getErrorMessage } from '@/shared/utils';

import { useDispatchFulfilment } from '../api';
import { DispatchBillsTable, DispatchFulfilmentFilters } from '../components';
import {
  createDefaultFulfilmentFilters,
  MEASURE_OPTIONS,
  SERIES_COLORS,
  STATUS_COLORS,
} from '../constants';
import type {
  CustomerRow,
  DispatchedTotals,
  DispatchFulfilmentFilters as Filters,
  DispatchMeasure,
} from '../types';

// -------------------------------------------------------------------------- //
// measure accessors (exhaustive switches keep them type-safe)
// -------------------------------------------------------------------------- //
function dispQty(d: DispatchedTotals, m: DispatchMeasure): number {
  switch (m) {
    case 'weight':
      return d.weight;
    case 'litres':
      return d.litres;
    case 'boxes':
      return d.boxes;
  }
}

function custQty(c: CustomerRow, m: DispatchMeasure): number {
  switch (m) {
    case 'weight':
      return c.dispatched_weight;
    case 'litres':
      return c.dispatched_litres;
    case 'boxes':
      return c.dispatched_boxes;
  }
}

// -------------------------------------------------------------------------- //
// formatting
// -------------------------------------------------------------------------- //
function unitFor(m: DispatchMeasure): string {
  return MEASURE_OPTIONS.find((o) => o.key === m)?.unit ?? '';
}

function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function money(value: number): string {
  return `₹${abbreviate(value)}`;
}

function qty(value: number, m: DispatchMeasure): string {
  const unit = unitFor(m);
  return `${abbreviate(value)}${unit ? ` ${unit}` : ''}`;
}

function shortDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(5) : iso;
}

// -------------------------------------------------------------------------- //
// page
// -------------------------------------------------------------------------- //
export default function DispatchFulfilmentDashboardPage() {
  const { hasPermission } = usePermission();
  const canView = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS);

  const [filters, setFilters] = useState<Filters>(() => createDefaultFulfilmentFilters());
  const [measure, setMeasure] = useState<DispatchMeasure>('weight');
  const handleChange = useCallback((next: Filters) => setFilters(next), []);

  const query = useDispatchFulfilment(filters);
  const data = query.data;

  const trendData = useMemo(
    () =>
      (data?.trend ?? []).map((r) => ({
        date: shortDate(r.date),
        value: r.dispatched_amount,
        trucks: r.trucks,
      })),
    [data],
  );

  const statusData = useMemo(
    () =>
      (data?.by_status ?? []).map((s) => ({
        status: s.status,
        value: s.amount,
        count: s.count,
      })),
    [data],
  );

  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          You don&apos;t have permission to view the Dispatch Fulfilment dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Fulfilment"
        description="Billed & dispatched value, physical quantity, and the pending backlog — across all your companies, by actual dispatch date."
      />

      <DispatchFulfilmentFilters
        filters={filters}
        isFetching={query.isFetching}
        onChange={handleChange}
        onRefresh={() => void query.refetch()}
      />

      {/* quantity measure toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Quantity:</span>
        {MEASURE_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            size="sm"
            variant={measure === opt.key ? 'default' : 'outline'}
            onClick={() => setMeasure(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <DashboardLoading />
      ) : query.isError ? (
        <DashboardError
          message={getErrorMessage(query.error, 'Failed to load the dispatch fulfilment data.')}
          isPermissionError={(query.error as { status?: number })?.status === 403}
          onRetry={() => void query.refetch()}
        />
      ) : !data ? null : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Billed & dispatched"
              value={money(data.totals.dispatched.amount)}
              icon={IndianRupee}
              details={[{ label: 'Invoices shipped', value: data.totals.dispatched.bills }]}
            />
            <SummaryCard
              title={`Dispatched (${unitFor(measure) || 'qty'})`}
              value={qty(dispQty(data.totals.dispatched, measure), measure)}
              icon={Boxes}
              details={[{ label: 'Measure', value: unitFor(measure) || measure }]}
            />
            <SummaryCard
              title="Trucks out"
              value={formatNumber(data.totals.dispatched.count, 0)}
              icon={Truck}
              details={[{ label: 'In the selected window', value: `${data.filters.from} → ${data.filters.to}` }]}
            />
            <SummaryCard
              title="Open backlog"
              value={money(data.totals.backlog.amount)}
              icon={ClipboardList}
              details={[{ label: 'Bills pending', value: data.totals.backlog.count }]}
            />
          </div>

          {/* dispatched value over time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispatched value over time (₹)</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Nothing dispatched in this date range.
                </p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ left: 8, right: 16, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" />
                      <XAxis dataKey="date" fontSize={11} tickMargin={8} />
                      <YAxis fontSize={11} width={64} tickFormatter={(v: number) => money(v)} />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), 'Dispatched']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Dispatched"
                        stroke={SERIES_COLORS.dispatched}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* backlog by status + top customers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open backlog by status (₹)</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nothing pending — all caught up.
                  </p>
                ) : (
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statusData}
                        layout="vertical"
                        margin={{ left: 24, right: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
                        <XAxis
                          type="number"
                          fontSize={11}
                          tickFormatter={(v: number) => money(v)}
                        />
                        <YAxis type="category" dataKey="status" width={90} fontSize={11} />
                        <Tooltip
                          formatter={(value) => [formatCurrency(Number(value)), 'Pending']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {statusData.map((s) => (
                            <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? '#898781'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top customers (dispatched)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.by_customer.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No dispatches.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Customer</th>
                        <th className="py-2 px-2 text-right font-medium">Value</th>
                        <th className="py-2 px-2 text-right font-medium">
                          {unitFor(measure) || 'Qty'}
                        </th>
                        <th className="py-2 pl-2 text-right font-medium">Trucks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_customer.slice(0, 12).map((c) => (
                        <tr key={c.customer_code} className="border-b last:border-0">
                          <td className="max-w-[160px] truncate py-2 pr-2" title={c.customer_name}>
                            {c.customer_name || c.customer_code}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {formatCurrency(c.dispatched_amount)}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {formatNumber(custQty(c, measure), 0)}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums">{c.trucks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* bill-wise drill-down */}
          <DispatchBillsTable from={filters.from} to={filters.to} />

          <p className="text-xs text-muted-foreground">
            {data.filters.company_count} compan
            {data.filters.company_count === 1 ? 'y' : 'ies'} · {data.filters.from} →{' '}
            {data.filters.to}. Anchored on the <strong>actual dispatch date</strong> (gate-out), so
            it matches the sales-dispatch section. &ldquo;Billed &amp; dispatched&rdquo; is the SAP
            invoice value of trucks that left; &ldquo;Open backlog&rdquo; is invoices still pending.
          </p>
        </>
      )}
    </div>
  );
}
