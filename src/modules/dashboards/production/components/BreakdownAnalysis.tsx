import { ChevronRight, Clock, Info, ListTree, Timer, TriangleAlert, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDowntimeParetoReport } from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams, DowntimeParetoItem } from '@/modules/production/execution/types';
import { DashboardError } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { CHART_COLORS, count, duration } from '../constants/production-dashboard.constants';

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold leading-none tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** The reason split for one category — only mounted while its row is open. */
function ReasonBreakdown({ item, color }: { item: DowntimeParetoItem; color: string }) {
  // `reasons` is absent, not empty, when this build is talking to a backend
  // that predates the nested-reasons change — the two repos deploy separately.
  const reasons = item.reasons;
  const maxMins = (reasons ?? []).reduce((m, r) => Math.max(m, r.total_minutes), 0) || 1;

  if (!reasons) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Reason detail isn&apos;t available from the server yet.
      </p>
    );
  }

  if (reasons.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        No reasons were recorded against this type.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-border/60 bg-muted/20 px-4 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2 font-medium">Reason</th>
            <th className="px-2 py-2 text-right font-medium">Times</th>
            <th className="px-2 py-2 text-right font-medium">Total lost</th>
            <th className="px-2 py-2 text-right font-medium">Avg each</th>
            <th className="min-w-[140px] py-2 pl-2 font-medium">Share of {item.category}</th>
          </tr>
        </thead>
        <tbody>
          {reasons.map((r) => (
            <tr key={r.reason} className="border-b last:border-0">
              <td className="max-w-[320px] py-2 pr-2">
                <span className="block truncate font-medium" title={r.reason}>
                  {r.reason}
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{count(r.count)}</td>
              <td className="px-2 py-2 text-right font-semibold tabular-nums">
                {duration(r.total_minutes)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {duration(r.avg_minutes)}
              </td>
              <td className="py-2 pl-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(r.total_minutes / maxMins) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {r.pct_of_category.toFixed(0)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Breakdown analysis — downtime by type, with each type opening to the reasons
 * logged under it.
 *
 * Types are the configurable BreakdownCategory master; reasons are the free
 * text the operator typed on the breakdown itself, so they are grouped by exact
 * string. Rows are Pareto-ordered (worst first) with a running cumulative share,
 * which is the read that tells you how few types account for most of the loss.
 */
export function BreakdownAnalysis({ params }: { params: AnalyticsParams }) {
  const query = useDowntimeParetoReport(params);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const rows = useMemo(() => query.data?.pareto ?? [], [query.data]);
  const maxMins = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.total_minutes), 0) || 1,
    [rows],
  );

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <DashboardError
        message={getErrorMessage(query.error, 'Failed to load the breakdown analysis.')}
        isPermissionError={(query.error as { status?: number })?.status === 403}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const summary = query.data?.summary;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          No breakdowns logged in this range. Nothing stopped the line — or nothing was recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={TriangleAlert}
          label="Breakdowns"
          value={count(summary?.total_breakdowns ?? 0)}
          hint={`${rows.length} type${rows.length === 1 ? '' : 's'}`}
        />
        <StatTile
          icon={Clock}
          label="Time lost"
          value={duration(summary?.total_breakdown_minutes ?? 0)}
          hint={`of ${duration(summary?.total_running_minutes ?? 0)} running`}
        />
        <StatTile
          icon={Timer}
          label="MTBF"
          value={duration(summary?.mtbf_minutes ?? 0)}
          hint="Mean time between failures"
        />
        <StatTile
          icon={Wrench}
          label="MTTR"
          value={duration(summary?.mttr_minutes ?? 0)}
          hint="Mean time to repair"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTree className="h-4 w-4 text-muted-foreground" />
            Downtime by type
            <span className="text-xs font-normal text-muted-foreground">
              — click a type to see its reasons
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.map((r, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            const isOpen = openCategory === r.category;
            return (
              <div key={r.category} className="border-b border-border/60 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : r.category)}
                  aria-expanded={isOpen}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40',
                    isOpen && 'bg-muted/30',
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-90',
                    )}
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold">{r.category}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {duration(r.total_minutes)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(r.total_minutes / maxMins) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="w-32 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {count(r.count)} stop{r.count === 1 ? '' : 's'} · {r.percentage.toFixed(0)}%
                        <span className="ml-1 opacity-70">(cum {r.cumulative_pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && <ReasonBreakdown item={r} color={color} />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Types come from the configurable <strong className="mx-1">Breakdown Categories</strong>{' '}
        master; reasons are the free text entered on each breakdown, so they group by exact wording
        — inconsistent phrasing shows up as separate reasons. Cumulative % is Pareto-ordered: the
        types above the 80% mark are where the downtime actually is.
      </p>
    </div>
  );
}
