import { Coins, Info, Recycle, Wallet } from 'lucide-react';
import { useMemo } from 'react';

import type { DailyReportTotals } from '@/modules/production/blowing/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { CHART_COLORS, count, money, perBottle } from '../constants';
import type { BlowingCostSlice } from '../types';

interface BlowingCostBreakdownProps {
  totals?: DailyReportTotals;
  isLoading?: boolean;
}

function CostTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint?: string;
  tone?: 'accent' | 'credit';
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-extrabold tabular-nums leading-none ${
          tone === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : ''
        } ${tone === 'accent' ? 'text-primary' : ''}`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * "Where the blowing cost goes" for the selected month.
 *
 * The buckets are the ones the monthly report rolls up. Packing sits inside
 * `total_cost` but isn't broken out by the report, so whatever `total_cost`
 * carries above the four named buckets is shown as a residual rather than
 * quietly dropped. Scrap recovery is a credit — net cost is gross minus it.
 */
export function BlowingCostBreakdown({ totals, isLoading }: BlowingCostBreakdownProps) {
  const slices = useMemo<BlowingCostSlice[]>(() => {
    if (!totals) return [];
    const named: BlowingCostSlice[] = [
      { name: 'Operator', amount: totals.operator_cost, credit: false },
      { name: 'Labour', amount: totals.labour_cost, credit: false },
      { name: 'Electricity', amount: totals.electricity_cost, credit: false },
      { name: 'Wastage (rejected preform)', amount: totals.wastage_cost, credit: false },
    ];
    const residual =
      totals.total_cost - named.reduce((s, r) => s + (r.amount || 0), 0);
    if (residual > 0.01) {
      named.push({ name: 'Packing & other', amount: residual, credit: false });
    }
    const rows = named.filter((r) => (r.amount || 0) > 0).sort((a, b) => b.amount - a.amount);
    if (totals.scrap_total > 0) {
      rows.push({ name: 'Scrap recovery', amount: totals.scrap_total, credit: true });
    }
    return rows;
  }, [totals]);

  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const gross = totals?.total_cost ?? 0;
  const production = totals?.total_production ?? 0;
  const rejection = totals?.total_rejection ?? 0;
  const goodBottles = Math.max(production - rejection, 0);

  if (!totals || gross <= 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          No cost for this month yet. Set rates in <strong>Cost Master</strong> and complete a run —
          cost is computed from each run&apos;s readings × those rates.
        </CardContent>
      </Card>
    );
  }

  const max = slices.reduce((m, r) => Math.max(m, r.amount), 0) || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CostTile icon={Wallet} label="Gross cost" value={money(gross)} hint={`${count(totals.run_count)} runs`} />
        <CostTile
          icon={Recycle}
          label="Scrap recovery"
          value={`−${money(totals.scrap_total)}`}
          hint="Rejected bottles + carton sale"
          tone="credit"
        />
        <CostTile
          icon={Coins}
          label="Net cost"
          value={money(totals.net_cost)}
          hint="Gross − scrap recovery"
          tone="accent"
        />
        <CostTile
          icon={Coins}
          label="Cost / bottle"
          value={perBottle(totals.avg_per_bottle_cost)}
          hint={goodBottles > 0 ? `over ${count(goodBottles)} good bottles` : undefined}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where the blowing cost goes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {slices.map((r, i) => {
            const share = (r.amount / gross) * 100;
            const color = r.credit ? '#059669' : CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={r.name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {r.name}
                    {r.credit && (
                      <span className="rounded bg-emerald-50 px-1 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        credit
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold">
                      {r.credit ? '−' : ''}
                      {money(r.amount)}
                    </span>
                    <span className="ml-1.5 text-muted-foreground">{share.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.amount / max) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}

          <p className="flex items-start gap-1.5 pt-1 text-[11px] leading-snug text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Percentages are of gross cost. This is the <strong className="mx-0.5">conversion</strong>{' '}
            cost only — the preform itself is charged separately at the spec&apos;s rate per bottle,
            and the run detail page shows both together as the total cost per bottle.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
