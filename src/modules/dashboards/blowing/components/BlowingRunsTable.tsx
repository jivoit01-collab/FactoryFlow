import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { BlowingRun, WarehouseApprovalStatus } from '@/modules/production/blowing/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  BLOWING_BENCHMARKS,
  count,
  LIVE_STATUS_BADGE,
  LIVE_STATUS_LABELS,
  money,
  num,
  pct,
  perBottle,
} from '../constants';

interface BlowingRunsTableProps {
  runs?: BlowingRun[];
  isLoading?: boolean;
  monthLabel: string;
}

const WH_LABELS: Record<WarehouseApprovalStatus, string> = {
  NOT_REQUESTED: 'Not requested',
  PENDING: 'WH pending',
  APPROVED: 'WH approved',
  PARTIALLY_APPROVED: 'WH partial',
  REJECTED: 'WH rejected',
};

const WH_BADGE: Record<WarehouseApprovalStatus, string> = {
  NOT_REQUESTED: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  PARTIALLY_APPROVED: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

/**
 * Every run in the selected month (optionally one machine). Rows link straight
 * into the run detail page in the blowing section — this dashboard reads, the
 * section acts.
 */
export function BlowingRunsTable({ runs, isLoading, monthLabel }: BlowingRunsTableProps) {
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      [...(runs ?? [])].sort(
        (a, b) => b.date.localeCompare(a.date) || b.run_number - a.run_number,
      ),
    [runs],
  );

  const footer = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          production: acc.production + r.total_counter_production,
          rejection: acc.rejection + r.rejection_pcs,
          netCost: acc.netCost + num(r.net_cost),
        }),
        { production: 0, rejection: 0, netCost: 0 },
      ),
    [rows],
  );

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Runs · {monthLabel}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {rows.length} run{rows.length === 1 ? '' : 's'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted-foreground">
            No runs in this month for the selected machine.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Date · run</th>
                  <th className="px-2 py-2 font-medium">Machine</th>
                  <th className="px-2 py-2 font-medium">Preform</th>
                  <th className="px-2 py-2 text-right font-medium">Blown</th>
                  <th className="px-2 py-2 text-right font-medium">Rej %</th>
                  <th className="px-2 py-2 text-right font-medium">Units</th>
                  <th className="px-2 py-2 text-right font-medium">Manpower</th>
                  <th className="px-2 py-2 text-right font-medium">₹ / bottle</th>
                  <th className="px-2 py-2 text-right font-medium">Net cost</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rej = num(r.rejection_pct);
                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/production/blowing/runs/${r.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/production/blowing/runs/${r.id}`);
                        }
                      }}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40"
                    >
                      <td className="py-2 pr-2">
                        <div className="font-medium">{r.date}</div>
                        <div className="text-[11px] text-muted-foreground">Run #{r.run_number}</div>
                      </td>
                      <td className="px-2 py-2">{r.machine_name}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.preform_make} {num(r.preform_gram)}g
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {count(r.total_counter_production)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right tabular-nums ${
                          rej > BLOWING_BENCHMARKS.rejectionPct
                            ? 'font-semibold text-orange-600 dark:text-orange-400'
                            : ''
                        }`}
                      >
                        {pct(rej)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{count(num(r.total_units))}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.total_manpower}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-primary">
                        {r.per_bottle_cost == null ? '—' : perBottle(num(r.per_bottle_cost))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {r.net_cost == null ? '—' : money(num(r.net_cost))}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              LIVE_STATUS_BADGE[r.live_status] ?? LIVE_STATUS_BADGE.DRAFT
                            }`}
                          >
                            {LIVE_STATUS_LABELS[r.live_status] ?? r.live_status}
                          </span>
                          {r.warehouse_approval_status !== 'APPROVED' && (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                WH_BADGE[r.warehouse_approval_status]
                              }`}
                            >
                              {WH_LABELS[r.warehouse_approval_status]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <ChevronRight className="inline h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 text-xs font-semibold">
                  <td className="py-2 pr-2">Total</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">{count(footer.production)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {pct(footer.production ? (footer.rejection / footer.production) * 100 : 0)}
                  </td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">{money(footer.netCost)}</td>
                  <td className="px-2 py-2" />
                  <td className="py-2 pl-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
