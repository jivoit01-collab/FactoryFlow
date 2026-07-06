import { useCallback, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IndianRupee, Target, TrendingUp, Truck } from 'lucide-react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  DashboardError,
  DashboardHeader,
  DashboardLoading,
  SummaryCard,
} from '@/shared/components/dashboard';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn, formatCurrency, formatNumber, getErrorMessage } from '@/shared/utils';

import { useDispatchFulfilment } from '../api';
import { DispatchBillsTable, DispatchFulfilmentFilters } from '../components';
import {
  createDefaultFulfilmentFilters,
  MEASURE_OPTIONS,
  SERIES_COLORS,
  STATUS_COLORS,
} from '../constants';
import type {
  DispatchedTotals,
  DispatchFulfilmentFilters as Filters,
  DispatchMeasure,
  PlannedTotals,
  TrendRow,
} from '../types';

// -------------------------------------------------------------------------- //
// measure accessors (exhaustive switches keep them type-safe)
// -------------------------------------------------------------------------- //
function plannedMeasure(p: PlannedTotals, m: DispatchMeasure): number | null {
  switch (m) {
    case 'amount':
      return p.amount;
    case 'weight':
      return p.weight;
    case 'litres':
      return p.litres;
    case 'boxes':
      return p.boxes;
  }
}

function dispatchedMeasure(d: DispatchedTotals, m: DispatchMeasure): number {
  switch (m) {
    case 'amount':
      return d.amount;
    case 'weight':
      return d.weight;
    case 'litres':
      return d.litres;
    case 'boxes':
      return d.boxes;
  }
}

function plannedTrend(r: TrendRow, m: DispatchMeasure): number | null {
  switch (m) {
    case 'amount':
      return r.planned_amount;
    case 'weight':
      return r.planned_weight;
    case 'litres':
      return r.planned_litres;
    case 'boxes':
      return null;
  }
}

function dispatchedTrend(r: TrendRow, m: DispatchMeasure): number {
  switch (m) {
    case 'amount':
      return r.dispatched_amount;
    case 'weight':
      return r.dispatched_weight;
    case 'litres':
      return r.dispatched_litres;
    case 'boxes':
      return r.dispatched_boxes;
  }
}

// -------------------------------------------------------------------------- //
// formatting
// -------------------------------------------------------------------------- //
function unitFor(m: DispatchMeasure): string {
  return MEASURE_OPTIONS.find((o) => o.key === m)?.unit ?? '';
}

function formatMeasure(value: number | null | undefined, m: DispatchMeasure): string {
  if (value === null || value === undefined) return '—';
  if (m === 'amount') return formatCurrency(value);
  const unit = unitFor(m);
  return `${formatNumber(value, 0)}${unit ? ` ${unit}` : ''}`;
}

function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function compact(value: number, m: DispatchMeasure): string {
  return m === 'amount' ? `₹${abbreviate(value)}` : abbreviate(value);
}

// Short value for the KPI tiles so big numbers never overflow the card.
function formatTile(value: number | null | undefined, m: DispatchMeasure): string {
  if (value === null || value === undefined) return '—';
  if (m === 'amount') return `₹${abbreviate(value)}`;
  const unit = unitFor(m);
  return `${abbreviate(value)}${unit ? ` ${unit}` : ''}`;
}

function percent(rate: number | null): string {
  return rate === null || rate === undefined ? '—' : `${(rate * 100).toFixed(1)}%`;
}

function shortDate(iso: string): string {
  // "2026-07-05" -> "07-05"
  return iso.length >= 10 ? iso.slice(5) : iso;
}

// -------------------------------------------------------------------------- //
// page
// -------------------------------------------------------------------------- //
export default function DispatchFulfilmentDashboardPage() {
  const { hasPermission } = usePermission();
  const canView = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS);

  const [filters, setFilters] = useState<Filters>(() => createDefaultFulfilmentFilters());
  const [measure, setMeasure] = useState<DispatchMeasure>('amount');
  const handleChange = useCallback((next: Filters) => setFilters(next), []);

  const query = useDispatchFulfilment(filters);
  const data = query.data;

  const trendData = useMemo(
    () =>
      (data?.trend ?? []).map((r) => ({
        date: shortDate(r.date),
        planned: plannedTrend(r, measure),
        dispatched: dispatchedTrend(r, measure),
        billed: measure === 'amount' ? r.billed_amount : null,
      })),
    [data, measure],
  );

  const statusData = useMemo(
    () =>
      (data?.by_status ?? []).map((s) => ({
        status: s.status,
        value: measure === 'amount' ? s.amount : measure === 'litres' ? s.litres : s.weight,
        count: s.count,
      })),
    [data, measure],
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

  const measurable = measure === 'boxes' ? 'weight' : measure; // boxes has no plan side

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Fulfilment"
        description="Billed vs Planned vs Dispatched — how much was invoiced, scheduled to ship, and actually dispatched."
      />

      <DispatchFulfilmentFilters
        filters={filters}
        isFetching={query.isFetching}
        onChange={handleChange}
        onRefresh={() => void query.refetch()}
      />

      {/* measure toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Measure:</span>
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
              title="Billed"
              value={formatTile(data.totals.billed.amount, 'amount')}
              icon={IndianRupee}
              details={[{ label: 'Invoices', value: data.totals.billed.count }]}
            />
            <SummaryCard
              title={`Planned${measure === 'amount' ? '' : ` (${unitFor(measurable) || 'qty'})`}`}
              value={formatTile(plannedMeasure(data.totals.planned, measurable), measurable)}
              icon={Target}
              details={[{ label: 'Plans', value: data.totals.planned.count }]}
            />
            <SummaryCard
              title={`Dispatched${measure === 'amount' ? '' : ` (${unitFor(measure) || 'qty'})`}`}
              value={formatTile(dispatchedMeasure(data.totals.dispatched, measure), measure)}
              icon={Truck}
              details={[{ label: 'Trucks out', value: data.totals.dispatched.count }]}
            />
            <SummaryCard
              title="Fulfilment"
              value={percent(
                measure === 'boxes'
                  ? null
                  : data.totals.fulfillment_rate[measure],
              )}
              icon={TrendingUp}
              details={[
                {
                  label: 'Dispatched ÷ Planned',
                  value: measure === 'amount' ? '₹ basis' : `${unitFor(measurable)} basis`,
                },
              ]}
            />
          </div>

          {measure === 'boxes' && (
            <p className="text-xs text-muted-foreground">
              Plans don&apos;t record box counts — the Planned tile falls back to weight; only
              Dispatched has boxes.
            </p>
          )}

          {/* trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planned vs Dispatched over time</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No data in this date range.
                </p>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ left: 8, right: 16, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" />
                      <XAxis dataKey="date" fontSize={11} tickMargin={8} />
                      <YAxis
                        fontSize={11}
                        width={64}
                        tickFormatter={(v: number) => compact(v, measure)}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatMeasure(Number(value), measure),
                          name,
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="planned"
                        name="Planned"
                        stroke={SERIES_COLORS.planned}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="dispatched"
                        name="Dispatched"
                        stroke={SERIES_COLORS.dispatched}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      {measure === 'amount' && (
                        <Line
                          type="monotone"
                          dataKey="billed"
                          name="Billed"
                          stroke={SERIES_COLORS.billed}
                          strokeWidth={2}
                          strokeDasharray="5 4"
                          dot={false}
                          connectNulls
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* status backlog + customers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan backlog by status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No plans.</p>
                ) : (
                  <div className="h-[260px]">
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
                          tickFormatter={(v: number) => compact(v, measure)}
                        />
                        <YAxis type="category" dataKey="status" width={90} fontSize={11} />
                        <Tooltip
                          formatter={(value) => [formatMeasure(Number(value), measure), 'Value']}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.by_status.map((s) => (
                    <Badge
                      key={s.status}
                      variant="outline"
                      style={{ borderColor: STATUS_COLORS[s.status] ?? '#898781' }}
                    >
                      {s.status}: {s.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top customers</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.by_customer.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No customers.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Customer</th>
                        <th className="py-2 px-2 text-right font-medium">Planned</th>
                        <th className="py-2 px-2 text-right font-medium">Dispatched</th>
                        <th className="py-2 pl-2 text-right font-medium">Fulfil %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_customer.slice(0, 12).map((c) => (
                        <tr key={c.customer_code} className="border-b last:border-0">
                          <td className="max-w-[160px] truncate py-2 pr-2" title={c.customer_name}>
                            {c.customer_name || c.customer_code}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {formatMeasure(
                              measurable === 'amount'
                                ? c.planned_amount
                                : measurable === 'litres'
                                  ? c.planned_litres
                                  : c.planned_weight,
                              measurable,
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {formatMeasure(
                              measure === 'amount'
                                ? c.dispatched_amount
                                : measure === 'litres'
                                  ? c.dispatched_litres
                                  : measure === 'boxes'
                                    ? c.dispatched_boxes
                                    : c.dispatched_weight,
                              measure,
                            )}
                          </td>
                          <td
                            className={cn(
                              'py-2 pl-2 text-right tabular-nums',
                              c.fulfillment_rate !== null &&
                                c.fulfillment_rate < 0.5 &&
                                'text-destructive',
                            )}
                          >
                            {percent(c.fulfillment_rate)}
                          </td>
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
            {data.filters.company_name} · {data.filters.from} → {data.filters.to}. This is an
            invoice-first flow, so <strong>Billed ≈ Planned</strong>; the meaningful gap is
            Planned → Dispatched (the not-yet-shipped backlog). Figures come from Postgres-mirrored
            SAP fields.
          </p>
        </>
      )}
    </div>
  );
}
