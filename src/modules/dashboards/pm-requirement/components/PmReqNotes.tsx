import { AlertTriangle, Info } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

import type { PmReqCoverage, PmReqMeta, PmReqUnplanned } from '../types';
import { formatPct, formatQtyCompact } from '../utils';

export interface PmReqNotesProps {
  meta?: PmReqMeta;
  coverage?: PmReqCoverage;
  unplanned?: PmReqUnplanned;
}

function Note({
  tone,
  children,
}: {
  tone: 'warn' | 'info';
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl border px-4 py-3 text-sm',
        tone === 'warn'
          ? 'border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
          : 'border-border/60 bg-muted/40 text-muted-foreground',
      )}
    >
      {tone === 'warn' ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * What the table does not say on its own.
 *
 * Three things can make the requirement below understate the month, and none
 * of them is visible in a column of numbers:
 *
 *   - SAP has renumbered or renamed the packaging item group
 *   - a planned SKU has no bill of material, so its packaging is missing
 *     entirely rather than showing as zero
 *   - material reached the floor that the plan does not describe at all
 *
 * Each note appears only when there is something to say. A permanently
 * displayed "0 items without a BOM" is a line people learn to skip, and then
 * do skip on the month it matters.
 */
export function PmReqNotes({ meta, coverage, unplanned }: PmReqNotesProps) {
  const groupMismatch = meta ? !meta.pm_item_group_matches : false;
  const missingBom = (coverage?.items_without_bom ?? 0) > 0;
  const hasUnplanned = (unplanned?.item_count ?? 0) > 0;

  if (!groupMismatch && !missingBom && !hasUnplanned) return null;

  return (
    <div className="space-y-2">
      {groupMismatch && meta && (
        <Note tone="warn">
          SAP item group {meta.pm_item_group} is now called{' '}
          <span className="font-medium">{meta.pm_item_group_name || '(no name)'}</span>, not
          &ldquo;PACKAGING MATERIAL&rdquo;. Every figure here is still counted on group{' '}
          {meta.pm_item_group} — check with whoever changed it before ordering against these
          numbers.
        </Note>
      )}

      {missingBom && coverage && (
        <Note tone="warn">
          <span className="font-medium">
            {coverage.items_without_bom} planned{' '}
            {coverage.items_without_bom === 1 ? 'product has' : 'products have'} no bill of
            material in SAP
          </span>{' '}
          — {formatQtyCompact(coverage.items_without_bom_qty)} of{' '}
          {formatQtyCompact(coverage.plan_qty)} planned pieces, so the requirement below covers{' '}
          {formatPct(coverage.qty_covered_pct)} of the plan and no packaging at all is counted for
          the rest.
          {coverage.items_without_bom_list.length > 0 && (
            <>
              {' '}
              Biggest:{' '}
              {coverage.items_without_bom_list.slice(0, 3).map((item, index) => (
                <span key={item.item_code}>
                  {index > 0 && ', '}
                  <span className="font-medium">{item.item_name || item.item_code}</span> (
                  {formatQtyCompact(item.plan_qty)})
                </span>
              ))}
              .
            </>
          )}
        </Note>
      )}

      {hasUnplanned && unplanned && meta && (
        <Note tone="info">
          {unplanned.item_count} packing-material{' '}
          {unplanned.item_count === 1 ? 'item' : 'items'} went into{' '}
          {meta.issue_warehouses.join(', ') || 'the floor'} this period —{' '}
          {formatQtyCompact(unplanned.qty)} pieces — that this plan&rsquo;s bills of material do
          not call for. Those are not rows below, because the table answers what the plan needs.
          It usually means production the plan does not describe, or a recipe that is out of date.
        </Note>
      )}
    </div>
  );
}
