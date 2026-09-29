import { Boxes, Clock, Gauge, PackageCheck, TriangleAlert } from 'lucide-react';

import { ACCENTS, KpiStat } from '@/shared/components/dashboard';

import type { PmReqFilter, PmReqTotals } from '../types';
import { formatInrCompact, formatQtyCompact } from '../utils';

export interface PmReqHeadlineProps {
  totals?: PmReqTotals;
  isLoading: boolean;
  /** Each tile filters the table to the rows it counted. */
  onFilter: (filter: PmReqFilter) => void;
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="h-[148px] animate-pulse rounded-2xl border bg-muted/40" />
      ))}
    </div>
  );
}

/**
 * What the plan needs, in four numbers.
 *
 * The order is the order of the question: how big is the plan, how much of it
 * the stores cannot cover, how much more would leave them under their
 * benchmark, and so what has to be bought. Every tile filters the table to
 * exactly the rows it counted, so a number on a card and the rows behind it
 * can never be a different set.
 *
 * The buying figure is quoted in rupees as well as quantity. Quantity alone
 * leads with caps and labels every month — they are the components used in
 * the millions — while what a buyer has to find money for is a different list.
 *
 * Every quantity here is "units" and NOT "pcs", which the tiles used to say.
 * These are sums across all 197 components, and six of them are measured in
 * metres or kilograms — tape, tin strip, pouch roll — so the total is a count
 * of things in mixed units and calling it pieces was wrong. The table below
 * prints the real unit on each row, where there is one to print.
 */
export function PmReqHeadline({ totals, isLoading, onFilter }: PmReqHeadlineProps) {
  if (isLoading && !totals) return <Skeleton />;
  if (!totals) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiStat
        icon={Boxes}
        accent={ACCENTS.slate}
        label="Components on the plan"
        value={totals.item_count}
        sub={`${formatQtyCompact(totals.planning_qty)} units needed · ${formatQtyCompact(
          totals.issued_pc_qty,
        )} already on the floor`}
        onClick={() => onFilter('all')}
        delayMs={0}
      />

      <KpiStat
        icon={TriangleAlert}
        accent={ACCENTS.amber}
        label="Short for the plan"
        value={totals.short_before_po_count}
        sub={`${formatQtyCompact(totals.short_before_po_qty)} units · ${formatInrCompact(
          totals.short_before_po_value,
        )} short of the rest of the plan`}
        onClick={() => onFilter('plan-short')}
        delayMs={60}
      />

      {/* The plan is made, but the stores end it under their minimum. A
          restock rather than a threat to this month, and counted apart so
          the two are never read as one. */}
      <KpiStat
        icon={Gauge}
        accent={ACCENTS.orange}
        label="Under benchmark"
        value={totals.benchmark_gap_count}
        sub={`Plan covered, but it leaves the stores under their benchmark · ${
          totals.benchmark_count
        } of ${totals.item_count} carry one in SAP`}
        onClick={() => onFilter('benchmark')}
        delayMs={120}
      />

      {/* The buying list. Rose when there is one, emerald when there is not:
          "0 to buy" is genuinely good news and should not read as an alarm
          that happens to be at zero. */}
      <KpiStat
        icon={totals.short_after_benchmark_count ? TriangleAlert : PackageCheck}
        accent={totals.short_after_benchmark_count ? ACCENTS.rose : ACCENTS.emerald}
        label="To buy"
        value={totals.short_after_benchmark_count}
        sub={
          totals.short_after_benchmark_count
            ? `${formatQtyCompact(totals.short_after_benchmark_qty)} units · ${formatInrCompact(
                totals.short_after_benchmark_value,
              )} for the plan and the benchmark`
            : 'The stores cover the rest of the plan and their benchmark'
        }
        onClick={() => onFilter('short')}
        delayMs={180}
      />

      {/* A fifth tile only when there is something on it to say. An
          over-issue is a question about the plan rather than about buying,
          and a permanent "0" would train people to stop reading the row. */}
      {totals.over_issued_count > 0 && (
        <KpiStat
          icon={Clock}
          accent={ACCENTS.violet}
          label="Drawn past the plan"
          value={totals.over_issued_count}
          sub="The floor took more of these than the plan called for — check the plan, not the buying"
          onClick={() => onFilter('over-issued')}
          delayMs={240}
        />
      )}
    </div>
  );
}
