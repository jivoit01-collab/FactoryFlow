import { Coins, Factory, Info, Layers, Receipt } from 'lucide-react';
import { useMemo } from 'react';

import { useCostAnalysisReport } from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams } from '@/modules/production/execution/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils';

import {
  CHART_COLORS,
  count,
  money,
  prettyLabel,
  type ProductionVariant,
} from '../constants/production-dashboard.constants';

/** A headline KPI tile. */
function KpiTile({
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
 * Cost analysis — plain-language view of what each case costs. A KPI strip,
 * a "where the money goes" category breakdown, and a per-SKU cost table
 * (the clearest read for a single day). Cost is derived on the backend from
 * running hours × Cost Master rates.
 */
export function ProductionEconomics({
  params,
  variant,
}: {
  params: AnalyticsParams;
  variant: ProductionVariant;
}) {
  const query = useCostAnalysisReport(params);
  const data = query.data;

  const totals = useMemo(() => {
    const s = data?.summary;
    if (!s) return undefined;
    return {
      totalCost: s.total_cost,
      wasteRecovery: s.total_waste_recovery ?? 0,
      netCost: s.total_net_cost ?? s.total_cost,
      perCase: s.avg_per_unit,
      runCount: s.run_count,
    };
  }, [data]);

  // "Where the money goes" — granular cost lines (same categories as the
  // per-run Run Cost page). Falls back to the rolled-up distribution.
  const breakdown = useMemo(() => {
    const cats = data?.category_breakdown;
    let rows: { name: string; amount: number; credit: boolean }[];
    if (cats && cats.length) {
      rows = cats
        .filter((c) => c.amount > 0)
        .map((c) => ({ name: c.label, amount: c.amount, credit: c.is_credit }));
    } else {
      rows = Object.entries(data?.cost_distribution ?? {})
        .map(([key, v]) => ({ name: prettyLabel(key), amount: v.amount, credit: false }))
        .filter((d) => d.amount > 0);
    }
    rows.sort((a, b) => b.amount - a.amount);
    const max = rows.reduce((m, r) => Math.max(m, r.amount), 0) || 1;
    return { rows, max };
  }, [data]);

  // Per-SKU cost — one row per run (a line usually runs one SKU per day).
  const skuRows = useMemo(
    () =>
      (data?.per_run ?? [])
        .map((r) => ({
          sku: r.product,
          line: r.line,
          cases: r.produced_qty,
          total: r.net_cost || r.total_cost,
          perCase: r.per_unit_cost,
        }))
        .sort((a, b) => b.total - a.total),
    [data],
  );

  if (query.isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const hasCost = !!totals && totals.totalCost > 0;

  if (!hasCost || !totals) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          No cost yet for this day. Set rates in <strong>Cost Master</strong> and complete a run —
          cost is computed from running hours × rates.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={Receipt} label="Total production cost" value={formatCurrency(totals.totalCost)} />
        {totals.wasteRecovery > 0 ? (
          <KpiTile
            icon={Coins}
            label="Net cost (after waste sale)"
            value={formatCurrency(totals.netCost)}
            hint={`Waste recovery −${money(totals.wasteRecovery)}`}
          />
        ) : (
          <KpiTile icon={Factory} label="Runs costed" value={String(totals.runCount)} />
        )}
        <KpiTile
          icon={Coins}
          label={`Avg cost / ${variant.unitNoun}`}
          value={formatCurrency(totals.perCase)}
          tone="accent"
        />
        <KpiTile
          icon={Layers}
          label="Cheapest → dearest / case"
          value={
            skuRows.length
              ? `${money(skuRows[skuRows.length - 1].perCase)} – ${money(skuRows[0].perCase)}`
              : '—'
          }
        />
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Cost is computed automatically from each run&apos;s <strong className="mx-0.5">running
        hours</strong> × <strong className="mx-0.5">Cost Master</strong> rates (per-line override
        &gt; company default), plus BOM material at last purchase price.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* where the money goes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where the cost goes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdown.rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No cost categories.</p>
            ) : (
              breakdown.rows.map((r, i) => {
                const pct = (r.amount / totals.totalCost) * 100;
                const color = r.credit ? '#059669' : CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <div key={r.name} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
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
                        <span className="ml-1.5 text-muted-foreground">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(r.amount / breakdown.max) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* per-SKU cost table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cost by SKU</CardTitle>
          </CardHeader>
          <CardContent>
            {skuRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No runs costed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">SKU / line</th>
                      <th className="py-2 px-2 text-right font-medium">Cases</th>
                      <th className="py-2 px-2 text-right font-medium">Total cost</th>
                      <th className="py-2 pl-2 text-right font-medium">Cost / {variant.unitNoun}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuRows.map((r, i) => (
                      <tr key={`${r.sku}-${i}`} className="border-b last:border-0">
                        <td className="max-w-[260px] py-2 pr-2">
                          <div className="truncate font-medium" title={r.sku}>
                            {r.sku}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">{r.line}</div>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">{count(r.cases)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{money(r.total)}</td>
                        <td className="py-2 pl-2 text-right font-semibold tabular-nums text-primary">
                          {formatCurrency(r.perCase)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-semibold">
                      <td className="py-2 pr-2">Total · {totals.runCount} runs</td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {count(skuRows.reduce((s, r) => s + r.cases, 0))}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{money(totals.totalCost)}</td>
                      <td className="py-2 pl-2 text-right tabular-nums text-primary">
                        {formatCurrency(totals.perCase)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
