import { Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import type { MakeVsBuyReport, MakeVsBuyVerdict } from '@/modules/production/blowing/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { count, money, perBottle } from '../constants';

interface BlowingMakeVsBuyPanelProps {
  report?: MakeVsBuyReport;
  isLoading?: boolean;
}

const VERDICT_BADGE: Record<MakeVsBuyVerdict, string> = {
  MAKE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  BUY: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  NO_BUY_PRICE: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
};

const VERDICT_LABEL: Record<MakeVsBuyVerdict, string> = {
  MAKE: 'Make',
  BUY: 'Buy',
  NO_BUY_PRICE: 'No buy price',
};

/**
 * Make-vs-buy for the month — whether blowing bottles in-house beat the landed
 * price of buying them, in total and per bottle size. Sizes with no active buy
 * price can't be judged and say so rather than defaulting to "make".
 */
export function BlowingMakeVsBuyPanel({ report, isLoading }: BlowingMakeVsBuyPanelProps) {
  const rows = useMemo(
    () => [...(report?.rows ?? [])].sort((a, b) => b.good_bottles - a.good_bottles),
    [report],
  );

  /** Widest per-bottle figure across make and buy — scales both bars alike. */
  const scale = useMemo(
    () =>
      rows.reduce(
        (m, r) => Math.max(m, r.make_cost_per_bottle, r.buy_landed_per_bottle ?? 0),
        0,
      ) || 1,
    [rows],
  );

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const totals = report?.totals;
  const savings = totals?.period_savings ?? 0;
  const making = totals?.verdict === 'MAKE';
  const judged = !!totals && totals.verdict !== 'NO_BUY_PRICE';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Make vs buy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {judged ? (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${
              making
                ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/10'
                : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/25 dark:bg-rose-500/10'
            }`}
          >
            {making ? (
              <TrendingDown className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingUp className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            )}
            <div className="min-w-0">
              <p className="text-lg font-bold">
                {making ? 'Making is cheaper' : 'Buying is cheaper'}
              </p>
              <p className="text-sm text-muted-foreground">
                {money(Math.abs(savings))} {making ? 'saved' : 'lost'} this month over{' '}
                {count(totals?.good_bottles ?? 0)} good bottles · {money(Math.abs(savings) * 12)}{' '}
                annualised at this rate
              </p>
            </div>
            <div className="ml-auto flex gap-6 text-right">
              <div>
                <div className="text-[11px] text-muted-foreground">Make cost</div>
                <div className="text-lg font-bold tabular-nums">{money(totals?.make_cost ?? 0)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Buy cost</div>
                <div className="text-lg font-bold tabular-nums">{money(totals?.buy_cost ?? 0)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            <Scale className="h-4 w-4 shrink-0" />
            No supplier buy price is on file for the bottles blown this month — add one under{' '}
            <strong className="mx-1">Master Data → Buy Prices</strong> to get a verdict.
          </div>
        )}

        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No costed runs to compare in this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Bottle</th>
                  <th className="px-2 py-2 text-right font-medium">Volume</th>
                  <th className="px-2 py-2 font-medium">Make vs buy / bottle</th>
                  <th className="px-2 py-2 text-right font-medium">Δ / bottle</th>
                  <th className="px-2 py-2 text-right font-medium">Breakeven</th>
                  <th className="px-2 py-2 text-right font-medium">Savings</th>
                  <th className="py-2 pl-2 font-medium">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.preform_spec_id} className="border-b last:border-0">
                    <td className="py-2 pr-2 whitespace-nowrap font-medium">
                      {r.make} {r.gram}g
                      {r.supplier && (
                        <div className="text-[11px] font-normal text-muted-foreground">
                          {r.supplier}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{count(r.good_bottles)}</td>
                    <td className="min-w-[180px] px-2 py-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-9 shrink-0 text-[10px] text-muted-foreground">Make</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(r.make_cost_per_bottle / scale) * 100}%`,
                                backgroundColor: ACCENTS.emerald.hex,
                              }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] tabular-nums">
                            {perBottle(r.make_cost_per_bottle)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-9 shrink-0 text-[10px] text-muted-foreground">Buy</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${((r.buy_landed_per_bottle ?? 0) / scale) * 100}%`,
                                backgroundColor: ACCENTS.rose.hex,
                              }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] tabular-nums">
                            {perBottle(r.buy_landed_per_bottle)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-semibold tabular-nums ${
                        r.delta_per_bottle == null
                          ? ''
                          : r.delta_per_bottle < 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {perBottle(r.delta_per_bottle)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.breakeven_bottles == null ? '—' : count(r.breakeven_bottles)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.period_savings == null ? '—' : money(r.period_savings)}
                    </td>
                    <td className="py-2 pl-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${VERDICT_BADGE[r.verdict]}`}
                      >
                        {VERDICT_LABEL[r.verdict]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] leading-snug text-muted-foreground">
          Buy price is the <strong>landed</strong> cost — supplier price plus freight, duties,
          carrying, QA allowance and risk premium. Breakeven is the volume at which making covers
          its fixed cost.
        </p>
      </CardContent>
    </Card>
  );
}
