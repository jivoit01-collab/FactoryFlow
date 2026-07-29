import { type LucideIcon, ServerCog } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ReconReport, ReconRow, ReconSummary } from '../api/reconciliation.api';
import { count } from '../constants/production-dashboard.constants';

function statusChip(status: string | undefined): { label: string; cls: string } {
  const s = (status || '').toUpperCase();
  if (s === 'MATCHED')
    return { label: 'Matched', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300' };
  if (s === 'PENDING_SYNC')
    return { label: 'Pending sync', cls: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300' };
  return { label: 'Mismatch', cls: 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300' };
}

const norm = (s: string | undefined) => (s || '').trim().toUpperCase();

/** Recompute a summary from a filtered subset of rows. */
function summarize(rows: ReconRow[]): ReconSummary {
  const app = rows.reduce((s, r) => s + r.app_qty, 0);
  const sap = rows.reduce((s, r) => s + r.sap_qty, 0);
  const diff = app - sap;
  const denom = Math.max(Math.abs(app), Math.abs(sap), 1);
  const pct = (diff / denom) * 100;
  let status = 'MATCHED';
  if (app > 0 && sap === 0) status = 'PENDING_SYNC';
  else if (!(app === 0 && sap === 0) && Math.abs(pct) > 1) status = 'MISMATCH';
  return {
    app_qty: round(app),
    sap_qty: round(sap),
    difference: round(diff),
    difference_pct: Number(pct.toFixed(2)),
    status,
    sku_count: rows.length,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

interface Props {
  title: string;
  icon: LucideIcon;
  report: ReconReport | undefined;
  isLoading: boolean;
  isError: boolean;
  unitNoun: string;
  /** Label for the app-side column (e.g. "Produced" for production). */
  appLabel?: string;
  /** Label for the second column (default "SAP"; e.g. "Issued" for material). */
  sapLabel?: string;
  /** Show an extra "In-progress" column (live segment output). */
  showInProgress?: boolean;
  /** Show only rows where the app produced something (hide pure SAP-only rows). */
  appOnly?: boolean;
  /**
   * App-only mode: render just the SKU + App columns (no SAP / Diff / Status).
   * Use when the SAP side can't be attributed to the current filter — e.g.
   * wastage by line, since SAP wastage (BH-WST) has no production line.
   */
  appColumnsOnly?: boolean;
  /** Hide rows where App, SAP and In-progress are all zero. */
  hideEmpty?: boolean;
  /** When set, only rows whose SKU is in this set are shown (matched by name). */
  filterSkus?: Set<string>;
  /** Empty-state text when the filter yields nothing. */
  emptyLabel?: string;
}

/**
 * App-vs-SAP reconciliation panel — summary tiles, a per-SKU table with
 * green/amber/red status chips. Optionally filtered to a set of SKU names
 * (e.g. only the SKUs running today), with the summary recomputed to match.
 */
export function ReconciliationPanel({
  title,
  icon: Icon,
  report,
  isLoading,
  isError,
  unitNoun,
  appLabel = 'App',
  sapLabel = 'SAP',
  showInProgress = false,
  appOnly = false,
  appColumnsOnly = false,
  hideEmpty = false,
  filterSkus,
  emptyLabel = 'No records in this range.',
}: Props) {
  const rows = useMemo(() => {
    if (!report) return [];
    let r = report.by_sku;
    if (filterSkus) r = r.filter((x) => filterSkus.has(norm(x.sku)));
    // In app-only mode, hide rows the app didn't touch (their SAP side is hidden).
    if (appOnly || appColumnsOnly) {
      r = r.filter((x) => (x.app_qty || 0) > 0 || (x.in_progress || 0) > 0);
    }
    if (hideEmpty) {
      r = r.filter((x) => (x.app_qty || 0) !== 0 || (x.sap_qty || 0) !== 0 || (x.in_progress || 0) !== 0);
    }
    return r;
  }, [report, filterSkus, appOnly, appColumnsOnly, hideEmpty]);

  const summary = useMemo(() => {
    if (!report) return undefined;
    return filterSkus || appOnly || appColumnsOnly || hideEmpty ? summarize(rows) : report.summary;
  }, [report, filterSkus, appOnly, appColumnsOnly, hideEmpty, rows]);

  const overall = statusChip(summary?.status);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {summary && !appColumnsOnly && (
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', overall.cls)}>
            {overall.label}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
            <ServerCog className="h-4 w-4" /> Couldn&apos;t reach SAP for reconciliation (SAP
            unavailable or not configured for this company).
          </div>
        ) : !report || !summary ? null : (
          <>
            {/* summary tiles */}
            {appColumnsOnly ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label={`${appLabel} (${unitNoun}s)`} value={count(summary.app_qty)} />
                <StatTile label="Materials" value={count(rows.length)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label={`${appLabel} (${unitNoun}s)`} value={count(summary.app_qty)} />
                <StatTile label={`${sapLabel} (${unitNoun}s)`} value={count(summary.sap_qty)} />
                <StatTile label="Difference" value={count(summary.difference)} />
                <StatTile label="Difference %" value={`${summary.difference_pct.toFixed(1)}%`} />
              </div>
            )}

            {/* per-SKU table */}
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">SKU</th>
                      <th className="py-2 px-2 text-right font-medium">{appLabel}</th>
                      {showInProgress && (
                        <th className="py-2 px-2 text-right font-medium">In-progress</th>
                      )}
                      {!appColumnsOnly && (
                        <>
                          <th className="py-2 px-2 text-right font-medium">{sapLabel}</th>
                          <th className="py-2 px-2 text-right font-medium">Diff</th>
                          <th className="py-2 px-2 text-right font-medium">Diff %</th>
                          <th className="py-2 pl-2 text-right font-medium">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const chip = statusChip(row.status);
                      return (
                        <tr key={`${row.sku}-${row.item_code}-${i}`} className="border-b last:border-0">
                          <td className="max-w-[220px] py-2 pr-2">
                            <div className="truncate font-medium" title={row.sku}>
                              {row.sku}
                            </div>
                            {row.item_code && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {row.item_code}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">{count(row.app_qty)}</td>
                          {showInProgress && (
                            <td className="py-2 px-2 text-right tabular-nums text-emerald-600">
                              {count(row.in_progress ?? 0)}
                            </td>
                          )}
                          {!appColumnsOnly && (
                            <>
                              <td className="py-2 px-2 text-right tabular-nums">{count(row.sap_qty)}</td>
                              <td className="py-2 px-2 text-right tabular-nums">{count(row.difference)}</td>
                              <td className="py-2 px-2 text-right tabular-nums">{row.difference_pct.toFixed(1)}%</td>
                              <td className="py-2 pl-2 text-right">
                                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', chip.cls)}>
                                  {chip.label}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {report.meta.note && (
              <p className="text-[11px] leading-snug text-muted-foreground">{report.meta.note}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
