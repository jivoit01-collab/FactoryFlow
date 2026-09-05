import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  type DispatchTrackingSummary,
  type TruckDispatchStatus,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.api';
import { useDispatchTrackingSummary } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';
import { DispatchDeliveryKpiGrid } from '@/modules/gate/components/dispatch-tracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { cn } from '@/shared/utils/cn';

/** Board path — the dashboard deep-links here, optionally filtered. */
const BOARD = '/dispatch/tracking';

/** Every status, in lifecycle order, with its board label and chip colour. The
 * palette mirrors the tracking board's StatusBadge so the two screens agree. */
const STATUS_META: Record<
  TruckDispatchStatus | 'DISPATCHED',
  { label: string; dot: string; chip: string }
> = {
  DISPATCHED: { label: 'Dispatched', dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  IN_TRANSIT: { label: 'In Transit', dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' },
  REACHED_DESTINATION: { label: 'Reached', dot: 'bg-cyan-500', chip: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300' },
  UNLOADING: { label: 'Unloading', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  DELIVERED: { label: 'Delivered', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  PARTIALLY_DELIVERED: { label: 'Partially Delivered', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
  RETURNED: { label: 'Returned', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  DELAYED: { label: 'Delayed', dot: 'bg-yellow-500', chip: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300' },
  CLOSED: { label: 'Closed', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300' },
};

const STATUS_ORDER: (TruckDispatchStatus | 'DISPATCHED')[] = [
  'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'REACHED_DESTINATION', 'UNLOADING',
  'DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'CLOSED',
];

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
}
function todayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export default function DispatchTrackingDashboardPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayISO);

  const filters = useMemo(() => ({ from_date: from, to_date: to }), [from, to]);
  const { data, isLoading, isError } = useDispatchTrackingSummary(filters);

  const goBoard = (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    navigate(`${BOARD}${qs}`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where every dispatched truck is right now — status, delays, and deliveries at a glance.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col text-xs text-muted-foreground">
            From
            <input
              type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            To
            <input
              type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <button
            onClick={() => goBoard()}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Open board <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {isError ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Could not load the dispatch summary. Please try again.
        </CardContent></Card>
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <DashboardBody data={data} goBoard={goBoard} />
      )}
    </div>
  );
}

function DashboardBody({
  data,
  goBoard,
}: {
  data: DispatchTrackingSummary;
  goBoard: (params?: Record<string, string>) => void;
}) {
  const s = data.status_counts;

  return (
    <div className="space-y-6">
      {/* Headline KPIs — shared with the dispatch module dashboard */}
      <DispatchDeliveryKpiGrid
        data={data}
        onOpen={(status) => goBoard(status ? { status } : undefined)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lifecycle funnel */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lifecycle</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.funnel.map((stage) => {
              const p = pct(stage.count, data.total_dispatched);
              return (
                <div key={stage.stage}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {stage.count} <span className="text-xs">· {p}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.max(p, stage.count > 0 ? 2 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              How far this window's trucks have progressed — each stage counts trucks at or beyond it.
            </p>
          </CardContent>
        </Card>

        {/* Late / overdue list — the funnel's counterpart: what is stuck, by name.
            (On-time rate, avg transit, delivered-today and no-update-yet used to
            sit here as a "Delivery performance" card; they are tiles in the KPI
            grid above now, and showing them twice on one screen invites the two
            copies to disagree.) */}
        <LateTrucksCard data={data} goBoard={goBoard} />
      </div>

      {/* Status breakdown */}
      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">By status</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUS_ORDER.map((key) => {
              const meta = STATUS_META[key];
              const count = s[key] ?? 0;
              return (
                <button key={key} onClick={() => goBoard({ status: key })}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:opacity-90',
                    meta.chip,
                  )}>
                  <span className="flex items-center gap-2 truncate">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                    <span className="truncate">{meta.label}</span>
                  </span>
                  <span className="ml-2 font-semibold tabular-nums">{count}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** The overdue trucks by name — the funnel tells you how many are stuck, this
 *  tells you which, with the driver's number so the chase can start here. */
function LateTrucksCard({
  data,
  goBoard,
}: {
  data: DispatchTrackingSummary;
  goBoard: (params?: Record<string, string>) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Late / overdue</CardTitle>
        {data.late.count > 0 && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {data.late.count} truck{data.late.count === 1 ? '' : 's'}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {data.late.trucks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No trucks are overdue in this window. 🎉
          </p>
        ) : (
          <ul className="divide-y">
            {data.late.trucks.map((t) => (
              <li key={t.arrival}>
                <button onClick={() => goBoard({ search: t.vehicle_number || t.arrival_no })}
                  className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:bg-accent/50">
                  <span className="min-w-0">
                    <span className="font-medium">{t.vehicle_number || t.arrival_no}</span>
                    {/* The escalation path, in the order you use it: whose truck
                        it is, then the driver to call. */}
                    {t.transporter_name ? (
                      <span className="block truncate text-xs font-medium text-foreground">
                        {t.transporter_name}
                      </span>
                    ) : null}
                    <span className="block truncate text-xs text-muted-foreground">
                      Reach by {t.expected_reach_date ?? '—'} · {t.arrival_no}
                    </span>
                    {t.driver_name || t.driver_mobile ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.driver_name || 'Driver'}
                        {t.driver_mobile ? ` · ${t.driver_mobile}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    {t.days_overdue}d overdue
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* eleven tiles — matches DispatchDeliveryKpiGrid, so the page does not jump
          as the summary lands. Count this up whenever a tile is added there. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
