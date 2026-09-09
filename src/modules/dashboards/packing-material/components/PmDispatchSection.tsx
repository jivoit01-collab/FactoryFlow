import { Truck } from 'lucide-react';

import { ACCENTS } from '@/shared/components/dashboard';

import type { PackingMaterialSource, PmDispatchResponse } from '../types';
import { formatPct, formatQty } from '../utils';
import { PmDispatchSourceToggle } from './PmDispatchSourceToggle';
import { PmTopTable } from './PmTopTable';

export interface PmDispatchSectionProps {
  report?: PmDispatchResponse;
  isLoading: boolean;
  top: number;
  source: PackingMaterialSource;
  onSourceChange: (source: PackingMaterialSource) => void;
}

/**
 * Section two: the packing material that went out inside what was dispatched.
 *
 * Bills over the month, the SKUs on them, each SKU's production recipe, and
 * the packing material that recipe calls for — summed per packing item.
 *
 * The footer carries the three things that make the number readable: how many
 * bills it came off, how much of what shipped had a recipe to explode at all,
 * and what is deliberately NOT in the list. Without the coverage figure a
 * board that explains 40% of the month looks exactly like one that explains
 * all of it.
 */
export function PmDispatchSection({
  report,
  isLoading,
  top,
  source,
  onSourceChange,
}: PmDispatchSectionProps) {
  const summary = report?.summary;
  const coverage = report?.coverage;
  const gatedOut = report?.meta.basis === 'gated-out';

  return (
    <PmTopTable
      icon={Truck}
      accent={ACCENTS.emerald}
      title={`Top ${top} into dispatch`}
      description="Packing material that left inside the finished goods dispatched"
      items={report?.items ?? []}
      totals={report?.totals}
      isLoading={isLoading}
      emptyMessage={
        gatedOut
          ? 'No bills went out through docking in this month.'
          : 'Nothing was invoiced in this month.'
      }
      headerAction={
        <PmDispatchSourceToggle
          source={source}
          onSourceChange={onSourceChange}
          disabled={isLoading}
        />
      }
      footer={
        summary && coverage ? (
          <div className="space-y-1">
            <p>
              <span className="font-medium text-foreground">{summary.document_count} bills</span>
              {summary.gate_out_count !== null && (
                <> on {summary.gate_out_count} trucks</>
              )} carrying{' '}
              <span className="font-medium text-foreground">
                {formatQty(summary.fg_dispatched_qty)} pcs
              </span>{' '}
              of finished goods
              {gatedOut ? ' out through the gate' : ', net of credit notes'}. Exploded through{' '}
              {coverage.fg_items_with_bom} of {coverage.fg_items} recipes —{' '}
              <span className="font-medium text-foreground">
                {formatPct(coverage.qty_covered_pct)}
              </span>{' '}
              of the volume.
            </p>

            {coverage.fg_items_without_bom_count > 0 && (
              <p>
                {coverage.fg_items_without_bom_count} dispatched item
                {coverage.fg_items_without_bom_count === 1 ? '' : 's'} had no production recipe and
                contributed no packaging:{' '}
                <span className="font-mono text-[11px]">
                  {coverage.fg_items_without_bom.join(', ')}
                </span>
                {coverage.fg_items_without_bom_count > coverage.fg_items_without_bom.length && ' …'}
              </p>
            )}

            {coverage.direct_pm_items > 0 && (
              <p>
                {/* It left the factory, but not inside a finished good, so it
                    is not a BOM explosion and is not in the list. Counted
                    here rather than dropped. */}
                {coverage.direct_pm_items} packing item
                {coverage.direct_pm_items === 1 ? ' was' : 's were'} billed as{' '}
                {coverage.direct_pm_items === 1 ? 'itself' : 'themselves'} (
                {formatQty(coverage.direct_pm_qty)}) — not inside a finished good, so not in this
                list.
              </p>
            )}

            <p>
              {report?.meta.intercompany_known ? (
                <>
                  Group-company bills are included: {formatQty(summary.fg_intercompany_qty)} pcs of
                  the {formatQty(summary.fg_dispatched_qty)} went to a group company, and that
                  packaging left the factory just the same.
                </>
              ) : (
                <>
                  The gate register cannot tell a group-company truck from any other, so there is no
                  intercompany split on this source. Switch to SAP bills for it.
                </>
              )}
            </p>
          </div>
        ) : null
      }
    />
  );
}
