import { ChevronDown, ChevronRight, Factory, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { Badge, Checkbox, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { MATERIAL_TYPE_LABEL } from '../constants';
import type { RequirementRow } from '../types';
import { CommittedCell } from './CommitmentDialog';
import { money, qty, qtyPrecise, shortDate } from './format';
import { UrgencyPill } from './UrgencyPill';

interface Props {
  rows: RequirementRow[];
  /** Component codes the buyer has ticked. Undefined hides selection entirely. */
  selected?: Set<string>;
  onToggle?: (code: string) => void;
  onToggleAll?: (codes: string[], select: boolean) => void;
  /** Per-row order quantity override, keyed by component code. */
  overrides?: Record<string, string>;
  onOverride?: (code: string, value: string) => void;
  /** Opens the commitment breakdown for one item in one warehouse. */
  onShowCommitments?: (itemCode: string, warehouse: string) => void;
}

/**
 * The material requirement, one row per component.
 *
 * Aggregated by component rather than by SKU because that is the only shape a
 * purchase order can be raised from — one cap runs across a dozen SKUs, and a
 * per-SKU list is unbuyable. Expanding a row shows which SKUs drive the number
 * and where the stock sits, so the figure can be checked rather than believed.
 */
export function RequirementTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  overrides,
  onOverride,
  onShowCommitments,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const selectable = Boolean(selected && onToggle);

  // Only a shortage of a real purchased item can be ordered. Covered rows and
  // manufactured sub-assemblies are shown but not selectable, so a buyer cannot
  // accidentally raise an order for something nobody sells.
  const orderableCodes = rows
    .filter((row) => Number(row.shortage_qty) > 0 && row.is_purchased)
    .map((row) => row.component_code);
  const allSelected =
    orderableCodes.length > 0 && orderableCodes.every((code) => selected?.has(code));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1180px] text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            {selectable ? (
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    onToggleAll?.(orderableCodes, Boolean(checked))
                  }
                  aria-label="Select every orderable shortage"
                />
              </th>
            ) : null}
            <th className="w-8 px-1 py-2" />
            <th className="px-3 py-2 text-left font-medium">Component</th>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-right font-medium">Required</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
            <th className="px-3 py-2 text-right font-medium">On order</th>
            <th className="px-3 py-2 text-right font-medium">Short</th>
            <th className="px-3 py-2 text-right font-medium">Order qty</th>
            <th className="px-3 py-2 text-left font-medium">Order by</th>
            <th className="px-3 py-2 text-left font-medium">Supplier</th>
            <th className="px-3 py-2 text-right font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const code = row.component_code;
            const shortage = Number(row.shortage_qty);
            const isOpen = expanded === code;
            const orderable = shortage > 0 && row.is_purchased;
            const orderQty = overrides?.[code] ?? row.suggested_order_qty;

            return (
              <>
                <tr
                  key={code}
                  className={cn(
                    'border-t align-top',
                    shortage > 0 ? '' : 'text-muted-foreground',
                    selected?.has(code) ? 'bg-primary/5' : '',
                  )}
                >
                  {selectable ? (
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selected?.has(code) ?? false}
                        disabled={!orderable}
                        onCheckedChange={() => onToggle?.(code)}
                        aria-label={`Select ${code}`}
                      />
                    </td>
                  ) : null}

                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : code)}
                      className="rounded p-1 hover:bg-muted"
                      aria-label={isOpen ? 'Hide detail' : 'Show detail'}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-medium">{code}</span>
                      {row.has_own_bom ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px]"
                          title="Made in-house as well as bought. Not exploded further — make or buy is a business decision."
                        >
                          <Factory className="h-3 w-3" />
                          Made too
                        </Badge>
                      ) : null}
                      {row.is_over_committed ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
                          title="Committed stock already exceeds what is on hand — this material is over-promised before the plan is counted."
                        >
                          <TriangleAlert className="h-3 w-3" />
                          Over-committed
                        </Badge>
                      ) : null}
                    </div>
                    <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {row.component_name || '—'}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-xs">
                    {MATERIAL_TYPE_LABEL[row.material_type] ?? row.material_type}
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {qtyPrecise(row.required_qty)}
                    <span className="ml-1 text-[10px] text-muted-foreground">{row.uom}</span>
                  </td>

                  <td
                    className={cn(
                      'px-3 py-2 text-right font-mono tabular-nums',
                      Number(row.net_available_qty) < 0 ? 'text-destructive' : '',
                    )}
                  >
                    {qty(row.net_available_qty)}
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {Number(row.on_order_qty) > 0 ? (
                      <span title={`${row.open_po_lines} open PO line(s), earliest due ${shortDate(row.open_po_earliest_due)}`}>
                        {qty(row.on_order_qty)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td
                    className={cn(
                      'px-3 py-2 text-right font-mono font-semibold tabular-nums',
                      shortage > 0 ? 'text-destructive' : '',
                    )}
                  >
                    {shortage > 0 ? qty(shortage) : '—'}
                  </td>

                  <td className="px-3 py-2 text-right">
                    {orderable && onOverride ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <Input
                          value={orderQty}
                          onChange={(event) => onOverride(code, event.target.value)}
                          className="h-8 w-28 text-right font-mono text-xs"
                          inputMode="decimal"
                        />
                        {row.moq_applied ? (
                          <span
                            className="text-[10px] text-muted-foreground"
                            title="Rounded up to the supplier's minimum order quantity."
                          >
                            MOQ {qty(row.moq_applied)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="font-mono tabular-nums">
                        {shortage > 0 ? qty(orderQty) : '—'}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <UrgencyPill urgency={row.urgency} />
                      <span className="text-[11px] text-muted-foreground">
                        {row.order_by_date
                          ? shortDate(row.order_by_date)
                          : row.lead_time_days === null
                            ? 'lead time unknown'
                            : '—'}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="max-w-[180px] truncate text-xs" title={row.vendor_name}>
                      {row.vendor_name || (
                        <span className="text-muted-foreground">not on file</span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {Number(row.unit_price) > 0 ? (
                      money(row.estimated_value, row.currency)
                    ) : (
                      <span className="text-muted-foreground" title="No last purchase price on the item master, so the spend cannot be costed.">
                        no price
                      </span>
                    )}
                  </td>
                </tr>

                {isOpen ? (
                  <tr key={`${code}-detail`} className="border-t bg-muted/30">
                    <td colSpan={selectable ? 12 : 11} className="px-6 py-4">
                      <RequirementDetail
                        row={row}
                        onShowCommitments={onShowCommitments}
                      />
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}

          {!rows.length ? (
            <tr>
              <td
                colSpan={selectable ? 12 : 11}
                className="px-3 py-10 text-center text-sm text-muted-foreground"
              >
                Nothing to show. Either the plan has no exploded components, or every
                one of them is covered by stock and open purchase orders.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/** Why the number is what it is: which SKUs drive it, and where the stock sits. */
function RequirementDetail({
  row,
  onShowCommitments,
}: {
  row: RequirementRow;
  onShowCommitments?: (itemCode: string, warehouse: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Driven by {row.used_by.length} SKU{row.used_by.length === 1 ? '' : 's'}
        </h4>
        <div className="max-h-56 overflow-y-auto rounded border bg-background">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/70 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">SKU</th>
                <th className="px-2 py-1.5 text-right font-medium">Plan</th>
                <th className="px-2 py-1.5 text-right font-medium">Per unit</th>
                <th className="px-2 py-1.5 text-right font-medium">Needs</th>
              </tr>
            </thead>
            <tbody>
              {row.used_by.map((use) => (
                <tr key={use.item_code} className="border-t">
                  <td className="px-2 py-1.5">
                    <span className="font-mono">{use.item_code}</span>
                    <div className="max-w-[180px] truncate text-muted-foreground">
                      {use.item_name}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {qty(use.plan_qty)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {qtyPrecise(use.qty_per_unit)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {qtyPrecise(use.required_qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Stock by warehouse
          </h4>
          {row.warehouses.length ? (
            <div className="max-h-40 overflow-y-auto rounded border bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/70 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Warehouse</th>
                    <th className="px-2 py-1.5 text-right font-medium">On hand</th>
                    <th className="px-2 py-1.5 text-right font-medium">Committed</th>
                    <th className="px-2 py-1.5 text-right font-medium">Benchmark</th>
                  </tr>
                </thead>
                <tbody>
                  {row.warehouses.map((warehouse) => (
                    <tr key={warehouse.warehouse} className="border-t">
                      <td className="px-2 py-1.5 font-mono">{warehouse.warehouse}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {qty(warehouse.on_hand)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {onShowCommitments ? (
                          <CommittedCell
                            value={warehouse.committed}
                            onClick={() =>
                              onShowCommitments(row.component_code, warehouse.warehouse)
                            }
                          />
                        ) : (
                          <span className="font-mono tabular-nums">
                            {qty(warehouse.committed)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {Number(warehouse.min_stock) > 0 ? qty(warehouse.min_stock) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No stock record in any warehouse in scope.
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">Short before open POs</dt>
          <dd className="text-right font-mono tabular-nums">
            {qty(row.shortage_before_po_qty)}
          </dd>

          <dt className="text-muted-foreground">Lead time</dt>
          <dd className="text-right">
            {row.lead_time_days === null ? (
              <span className="text-amber-600 dark:text-amber-400">
                not on file
              </span>
            ) : (
              `${row.lead_time_days} days (${row.lead_time_source.toLowerCase()})`
            )}
          </dd>

          <dt className="text-muted-foreground">Needed by</dt>
          <dd className="text-right">{shortDate(row.need_by_date)}</dd>

          <dt className="text-muted-foreground">Unit price</dt>
          <dd className="text-right font-mono tabular-nums">
            {Number(row.unit_price) > 0
              ? `${money(row.unit_price, row.currency)} / ${row.uom}`
              : '—'}
          </dd>

          {row.last_po_price ? (
            <>
              <dt className="text-muted-foreground" title="In the supplier's purchase unit, which is often not the inventory unit. Reference only.">
                Last PO price
              </dt>
              <dd className="text-right font-mono tabular-nums text-muted-foreground">
                {money(row.last_po_price, row.currency)}
                {row.last_po_date ? ` · ${shortDate(row.last_po_date)}` : ''}
              </dd>
            </>
          ) : null}

          <dt className="text-muted-foreground">BOM issues from</dt>
          <dd className="text-right font-mono">{row.issue_warehouse || '—'}</dd>

          <dt className="text-muted-foreground">Item group</dt>
          <dd className="text-right">{row.item_group || '—'}</dd>
        </dl>
      </div>
    </div>
  );
}
