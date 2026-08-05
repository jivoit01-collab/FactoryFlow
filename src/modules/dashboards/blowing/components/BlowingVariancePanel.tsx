import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { VarianceCell, VarianceReport } from '@/modules/production/blowing/types';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { pct } from '../constants';

interface BlowingVariancePanelProps {
  report?: VarianceReport;
  isLoading?: boolean;
}

/** Actual vs standard, with the breach flag the backend already computed. */
function CellView({ cell, format }: { cell: VarianceCell; format: (v: number) => string }) {
  return (
    <div className="text-right">
      <div
        className={`font-semibold tabular-nums ${
          cell.breach ? 'text-rose-600 dark:text-rose-400' : ''
        }`}
      >
        {format(cell.actual)}
      </div>
      <div className="text-[11px] tabular-nums text-muted-foreground">
        {cell.std == null ? 'no std' : `std ${format(cell.std)}`}
        {cell.variance_pct != null && (
          <span className={cell.breach ? ' text-rose-500' : ''}>
            {' '}
            ({cell.variance_pct > 0 ? '+' : ''}
            {cell.variance_pct.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Runs graded against the preform spec's standards — make cost per bottle,
 * rejection %, and electricity units per bottle. A breach is the backend's
 * call (actual worse than target by more than its tolerance), not ours.
 */
export function BlowingVariancePanel({ report, isLoading }: BlowingVariancePanelProps) {
  const navigate = useNavigate();
  const [breachesOnly, setBreachesOnly] = useState(true);

  const rows = useMemo(() => {
    const all = report?.rows ?? [];
    const filtered = breachesOnly ? all.filter((r) => r.any_breach) : all;
    return [...filtered].sort(
      (a, b) => b.date.localeCompare(a.date) || b.run_number - a.run_number,
    );
  }, [report, breachesOnly]);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const summary = report?.summary;
  const clean = !!summary && summary.breaches === 0 && summary.runs > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          Standards check
          {summary && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                clean
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
              }`}
            >
              {clean ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <TriangleAlert className="h-3 w-3" />
              )}
              {summary.breaches} of {summary.runs} runs off target
            </span>
          )}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setBreachesOnly((v) => !v)}>
          {breachesOnly ? 'Show all runs' : 'Breaches only'}
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {breachesOnly && (summary?.runs ?? 0) > 0
              ? 'Every run met its standard this month.'
              : 'No runs to grade. Standards come from the preform spec — set std make cost, reject % and units per bottle under Master Data.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Date · run</th>
                  <th className="px-2 py-2 font-medium">Preform</th>
                  <th className="px-2 py-2 text-right font-medium">Make ₹ / bottle</th>
                  <th className="px-2 py-2 text-right font-medium">Reject %</th>
                  <th className="px-2 py-2 text-right font-medium">Units / bottle</th>
                  <th className="py-2 pl-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.run_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/production/blowing/runs/${r.run_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/production/blowing/runs/${r.run_id}`);
                      }
                    }}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40"
                  >
                    <td className="py-2 pr-2">
                      <div className="font-medium">{r.date}</div>
                      <div className="text-[11px] text-muted-foreground">
                        #{r.run_number} · {r.machine_name}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{r.preform}</td>
                    <td className="px-2 py-2">
                      <CellView cell={r.make_cost} format={(v) => `₹${v.toFixed(4)}`} />
                    </td>
                    <td className="px-2 py-2">
                      <CellView cell={r.reject_pct} format={(v) => pct(v, 2)} />
                    </td>
                    <td className="px-2 py-2">
                      <CellView cell={r.units_per_bottle} format={(v) => v.toFixed(4)} />
                    </td>
                    <td className="py-2 pl-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.any_breach
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        }`}
                      >
                        {r.any_breach ? 'Breach' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
