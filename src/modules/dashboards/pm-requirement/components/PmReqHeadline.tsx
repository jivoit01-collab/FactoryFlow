import { Boxes, Clock, PackageCheck, PackagePlus, ShoppingCart, TriangleAlert } from 'lucide-react';

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
 * is not covered, how much of that is already bought, and how much is still
 * a hole. Every tile filters the table to exactly the rows it counted, so a
 * number on a card and the rows behind it can never be a different set.
 *
 * The headline shortage is the one AFTER open orders and it is quoted in
 * rupees as well as pieces. Pieces alone lead with caps and labels every
 * month — they are the components used in the millions — while what a buyer
 * has to find money for is a different list.
 */
export function PmReqHeadline({ totals, isLoading, onFilter }: PmReqHeadlineProps) {
  if (isLoading && !totals) return <Skeleton />;
  if (!totals) return null;

  const atRisk = totals.short_after_po_count + totals.po_overdue_count;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiStat
        icon={Boxes}
        accent={ACCENTS.slate}
        label="Components on the plan"
        value={totals.item_count}
        sub={`${formatQtyCompact(totals.planning_qty)} pcs needed · ${formatQtyCompact(
          totals.issued_pc_qty,
        )} already on the floor`}
        onClick={() => onFilter('all')}
        delayMs={0}
      />

      <KpiStat
        icon={TriangleAlert}
        accent={ACCENTS.amber}
        label="Short before orders"
        value={totals.short_before_po_count}
        sub={`${formatQtyCompact(totals.short_before_po_qty)} pcs short of the rest of the plan`}
        onClick={() => onFilter('at-risk')}
        delayMs={60}
      />

      <KpiStat
        icon={ShoppingCart}
        accent={ACCENTS.blue}
        label="Gaps closed by open orders"
        value={totals.covered_by_po_count}
        sub={
          totals.po_overdue_count
            ? `${formatQtyCompact(totals.open_po_qty)} pcs on order · ${
                totals.po_overdue_count
              } leaning on a late one`
            : `${formatQtyCompact(totals.open_po_qty)} pcs on order`
        }
        onClick={() => onFilter('at-risk')}
        delayMs={120}
      />

      {/* The buying list. Rose when there is one, emerald when there is not:
          "0 still short" is genuinely good news and should not read as an
          alarm that happens to be at zero. */}
      <KpiStat
        icon={totals.short_after_po_count ? TriangleAlert : PackageCheck}
        accent={totals.short_after_po_count ? ACCENTS.rose : ACCENTS.emerald}
        label="Still short after orders"
        value={totals.short_after_po_count}
        sub={
          totals.short_after_po_count
            ? `${formatQtyCompact(totals.short_after_po_qty)} pcs · ${formatInrCompact(
                totals.short_after_po_value,
              )} to buy`
            : 'Stock and open orders cover the rest of the plan'
        }
        onClick={() => onFilter('short')}
        delayMs={180}
      />

      {/* A fifth tile only when there is something on it to say. An
          over-issue is a question about the plan rather than about buying,
          and a permanent "0" would train people to stop reading the row. */}
      {(totals.over_issued_count > 0 ||
        totals.over_purchased_count > 0 ||
        atRisk > totals.short_after_po_count) && (
        <div className="sm:col-span-2 xl:col-span-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            {totals.po_overdue_count > 0 && (
              <KpiStat
                icon={Clock}
                accent={ACCENTS.orange}
                label="Waiting on a late order"
                value={totals.po_overdue_count}
                sub="Short, and the order meant to cover it is already past its due date"
                onClick={() => onFilter('at-risk')}
                delayMs={300}
              />
            )}
            {/* Money already committed to material the plan does not need.
                The rupee figure leads the sub-line because that is what makes
                it worth somebody's afternoon: an over-buy of labels and an
                over-buy of bottles are the same number of pieces and nothing
                like the same problem. */}
            {totals.over_purchased_count > 0 && (
              <KpiStat
                icon={PackagePlus}
                accent={ACCENTS.amber}
                label="Over-purchased"
                value={totals.over_purchased_count}
                sub={`${formatInrCompact(totals.over_purchase_value)} · ${formatQtyCompact(
                  totals.over_purchase_qty,
                )} pcs on order beyond what the plan still needs`}
                onClick={() => onFilter('over-purchased')}
                delayMs={360}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
