import { Layers, ServerCog } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { MaterialReport } from '../api/reconciliation.api';
import { count } from '../constants/production-dashboard.constants';

function statusChip(status: string | undefined): { label: string; cls: string } {
  const s = (status || '').toUpperCase();
  if (s === 'MATCHED')
    return { label: 'Matched', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300' };
  if (s === 'PENDING_SYNC')
    return { label: 'Pending sync', cls: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300' };
  return { label: 'Mismatch', cls: 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300' };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Material variance — three quantities per component:
 * Should-use (BOM × FG produced) · App issued · SAP issued. Status compares
 * App-issued vs SAP-issued. All-zero rows are hidden.
 */
export function MaterialVariancePanel({
  report,
  isLoading,
  isError,
}: {
  report: MaterialReport | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const rows = useMemo(
    () =>
      (report?.by_sku ?? []).filter(
        (r) => r.should_use !== 0 || r.app_issued !== 0 || r.sap_issued !== 0,
      ),
    [report],
  );

  const totals = useMemo(() => {
    const should = rows.reduce((s, r) => s + r.should_use, 0);
    const app = rows.reduce((s, r) => s + r.app_issued, 0);
    const sap = rows.reduce((s, r) => s + r.sap_issued, 0);
    const denom = Math.max(Math.abs(app), Math.abs(sap), 1);
    const pct = ((app - sap) / denom) * 100;
    let status = 'MATCHED';
    if (app > 0 && sap === 0) status = 'PENDING_SYNC';
    else if (!(app === 0 && sap === 0) && Math.abs(pct) > 1) status = 'MISMATCH';
    return { should, app, sap, pct, status };
  }, [rows]);

  const overall = statusChip(totals.status);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-muted-foreground" />
          Material variance · App issued vs SAP issued
        </CardTitle>
        {report && (
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
            <ServerCog className="h-4 w-4" /> Couldn&apos;t load material data (SAP unavailable for
            the issued side).
          </div>
        ) : !report ? null : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Expected usage" value={count(totals.should)} />
              <StatTile label="App issued" value={count(totals.app)} />
              <StatTile label="SAP issued" value={count(totals.sap)} />
              <StatTile label="App vs SAP %" value={`${totals.pct.toFixed(1)}%`} />
            </div>

            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No BOM material for this range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Material</th>
                      <th className="py-2 px-2 text-right font-medium">Expected usage</th>
                      <th className="py-2 px-2 text-right font-medium">App issued</th>
                      <th className="py-2 px-2 text-right font-medium">SAP issued</th>
                      <th className="py-2 pl-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const chip = statusChip(row.status);
                      return (
                        <tr key={`${row.item_code}-${i}`} className="border-b last:border-0">
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
                          <td className="py-2 px-2 text-right tabular-nums">{count(row.should_use)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{count(row.app_issued)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{count(row.sap_issued)}</td>
                          <td className="py-2 pl-2 text-right">
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', chip.cls)}>
                              {chip.label}
                            </span>
                          </td>
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
