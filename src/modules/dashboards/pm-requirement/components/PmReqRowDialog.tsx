import { Clock } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { formatDay, STATUS_LABELS } from '../constants';
import type { PmReqMeta, PmReqPoLine, PmReqRow } from '../types';
import { formatInr, formatQty, formatQtyWithUom, formatSignedWithUom, rowStatus } from '../utils';
import { PmReqPoDocDialog } from './PmReqPoDocDialog';

/** A PO line's identity: the document and the row on it. */
function poLineKey(line: PmReqPoLine): string {
  return `${line.doc_entry}-${line.line_num}`;
}

export interface PmReqRowDialogProps {
  row: PmReqRow | null;
  meta?: PmReqMeta;
  onClose: () => void;
}

function Line({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'short' | 'good';
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <p
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          tone === 'short' && 'text-rose-600 dark:text-rose-400',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Why one row says what it says.
 *
 * The arithmetic restated as a sum somebody can follow down the page, then
 * the open orders for the item, then the products that drive the requirement.
 * This exists because the figure it replaces was hand-typed into a
 * spreadsheet: for the first month or two the buyer will and should want to
 * check the number rather than believe it, and "1,102,500 caps" is only
 * checkable if the nine SKUs behind it are named. The orders are here for the
 * same reason and one more — a shortage is closed by ringing a supplier, and
 * that takes an order number and a name, not a quantity.
 */
export function PmReqRowDialog({ row, meta, onClose }: PmReqRowDialogProps) {
  const open = !!row;
  const status = row ? rowStatus(row) : 'covered';
  // Defaulted rather than read straight off the row: the two repos deploy
  // separately, and a front end that reaches a backend one release behind
  // must open this dialog without the order list, not fail to open it.
  const poDetails = row?.po_details ?? [];
  // Which order is open on top of this one, held as its key and looked back
  // up rather than stored as the line itself. That is what closes it when the
  // dialog moves to another component: a PO line belongs to one item, so its
  // key is not on the next row's list and the order falls away with the row
  // it was opened from. No effect, and nothing stale left stacked on top.
  const [openPoKey, setOpenPoKey] = useState<string | null>(null);
  const openPo = poDetails.find((line) => poLineKey(line) === openPoKey) ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        {/* Capped and scrolled rather than left to grow.
          This dialog is as long as the row is interesting: eight driving
          products and a dozen open orders run well past a laptop screen, and
          without a height the whole thing centres on the viewport and loses
          its title off the top and its last drivers off the bottom. The
          header stays put and only the body moves -- which matters here,
          because the title is the only place the component is named. */}
        <DialogContent className="grid max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          {row && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{row.item_name || row.item_code}</DialogTitle>
                <DialogDescription>
                  {row.item_code}
                  {row.sub_group ? ` · ${row.sub_group}` : ''}
                  {row.uom ? ` · in ${row.uom}` : ''} · {STATUS_LABELS[status]}
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-5">
                {/* The sum, in the order the columns read. */}
                <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    How the requirement is worked out
                  </h4>
                  <Line
                    label="Planning"
                    value={formatQtyWithUom(row.planning_qty, row.uom)}
                    hint={`What the plan needs, across ${row.driver_count || row.sku_count} ${
                      (row.driver_count || row.sku_count) === 1 ? 'product' : 'products'
                    }`}
                  />
                  <Line
                    label="Less issued to the floor"
                    value={formatQtyWithUom(row.issued_pc_qty, row.uom)}
                    hint={
                      meta
                        ? `Into ${meta.issue_warehouses.join(', ')}, ${formatDay(
                            meta.date_from,
                          )} to ${formatDay(meta.date_to, true)}`
                        : undefined
                    }
                  />
                  <Line
                    label="Rest of the plan"
                    value={formatSignedWithUom(row.rest_planning_qty, row.uom)}
                    tone={row.rest_planning_qty < 0 ? 'good' : undefined}
                    hint={
                      row.over_issued
                        ? 'Negative: the floor drew more than the plan called for'
                        : undefined
                    }
                  />
                  <Line
                    label="On hand in the stores"
                    value={formatQtyWithUom(row.on_hand_qty, row.uom)}
                    hint={meta ? meta.supply_warehouses.join(', ') : undefined}
                  />
                  <Line
                    label="Left after the plan"
                    value={formatSignedWithUom(row.req_qty, row.uom)}
                    tone={row.req_qty < 0 ? 'short' : undefined}
                    hint="On hand less the rest of the plan"
                  />
                  <Line
                    label="Less the benchmark"
                    value={
                      row.benchmark_qty > 0 ? formatQtyWithUom(row.benchmark_qty, row.uom) : '—'
                    }
                    hint={
                      row.benchmark_qty > 0
                        ? `The minimum SAP holds for it${
                            meta ? ` in ${meta.supply_warehouses.join(', ')}` : ''
                          }`
                        : 'SAP holds no benchmark for this item'
                    }
                  />
                  <Line
                    label="Req"
                    value={formatSignedWithUom(row.req_after_benchmark_qty, row.uom)}
                    tone={row.req_after_benchmark_qty < 0 ? 'short' : 'good'}
                    hint={
                      row.short_after_benchmark_value > 0
                        ? `${formatInr(row.short_after_benchmark_value)} at the last cost SAP holds`
                        : undefined
                    }
                  />
                </section>

                {/* The orders themselves, NOT netted off `Req` above -- the
                  board dropped its PO columns and answers what stock has to
                  cover. They stay here so a buyer about to raise an order
                  can see the one already placed, and has the order number to
                  quote and the supplier to ring. */}
                {poDetails.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Already on order · not counted in Req
                      {row.po_lines > poDetails.length &&
                        ` · soonest ${poDetails.length} of ${row.po_lines}`}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th scope="col" className="py-1.5 text-left font-medium">
                              Order
                            </th>
                            <th scope="col" className="py-1.5 text-left font-medium">
                              Due
                            </th>
                            <th scope="col" className="py-1.5 text-right font-medium">
                              Ordered
                            </th>
                            <th scope="col" className="py-1.5 text-right font-medium">
                              Received
                            </th>
                            <th scope="col" className="py-1.5 text-right font-medium">
                              Still open
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {poDetails.map((line) => {
                            // Late against the day the board was read, not
                            // against the browser's clock: every other date on
                            // this dialog is measured from `as_of`, and a
                            // cached response read tomorrow must not quietly
                            // start calling one more order late.
                            const overdue = !!(
                              line.due_date &&
                              meta?.as_of &&
                              line.due_date < meta.as_of
                            );
                            return (
                              <tr
                                key={poLineKey(line)}
                                className="group cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40"
                                onClick={() => setOpenPoKey(poLineKey(line))}
                                title={`Open purchase order ${line.doc_num} as SAP prints it`}
                              >
                                <td className="py-1.5 pr-3">
                                  <span className="block truncate" title={line.card_name}>
                                    {line.card_name || line.card_code || '—'}
                                  </span>
                                  <span className="block font-mono text-[11px] text-muted-foreground group-hover:text-foreground group-hover:underline">
                                    PO {line.doc_num}
                                    {line.doc_date ? ` · ${formatDay(line.doc_date, true)}` : ''}
                                  </span>
                                </td>
                                <td className="py-1.5 pr-3">
                                  {line.due_date ? (
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 whitespace-nowrap',
                                        overdue && 'text-orange-600 dark:text-orange-400',
                                      )}
                                      title={
                                        overdue
                                          ? 'Due date has gone by and the goods have not arrived'
                                          : undefined
                                      }
                                    >
                                      {overdue && <Clock className="h-3 w-3 shrink-0" />}
                                      {formatDay(line.due_date, true)}
                                    </span>
                                  ) : (
                                    <span
                                      className="text-muted-foreground"
                                      title="SAP holds no due date for this line, so it cannot be counted as cover for a date"
                                    >
                                      no date
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                  {formatQtyWithUom(line.ordered_qty, row.uom)}
                                </td>
                                <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                  {line.received_qty > 0
                                    ? formatQtyWithUom(line.received_qty, row.uom)
                                    : '—'}
                                </td>
                                <td className="py-1.5 text-right font-medium tabular-nums">
                                  {formatQtyWithUom(line.open_qty, row.uom)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.po_lines > poDetails.length
                        ? `The ${poDetails.length} soonest due of ${row.po_lines} open lines, ${formatQtyWithUom(row.open_po_qty, row.uom)} still to arrive across all of them. Open one for the order itself.`
                        : 'Still open is what has yet to arrive. Open one for the order itself.'}
                    </p>
                  </section>
                )}

                {/* The caveat that changes what the arithmetic means. */}
                {row.issued_produced_qty > 0 && (
                  <p className="rounded-lg border border-violet-300/60 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                    {formatQtyWithUom(row.issued_produced_qty, row.uom)} of the issued figure was
                    made in-house straight onto the floor rather than drawn from the stores
                    {row.issued_transfer_qty > 0
                      ? `, and ${formatQtyWithUom(row.issued_transfer_qty, row.uom)} was transferred up`
                      : ''}
                    . Both count as plan produced, but the in-house part never depleted the stores —
                    so this is not a component to buy, it is one to make.
                  </p>
                )}

                {/* What drives the requirement. */}
                {row.drivers.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Products that need it
                      {row.driver_count > row.drivers.length &&
                        ` · top ${row.drivers.length} of ${row.driver_count}`}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th scope="col" className="py-1.5 text-left font-medium">
                              Product
                            </th>
                            <th scope="col" className="py-1.5 text-right font-medium">
                              Plan
                            </th>
                            <th scope="col" className="py-1.5 text-right font-medium">
                              Per unit
                            </th>
                            <th scope="col" className="py-1.5 text-right font-medium">
                              Needs
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.drivers.map((driver) => (
                            <tr key={driver.parent_code} className="border-b last:border-0">
                              <td className="py-1.5 pr-3">
                                <span className="block truncate" title={driver.parent_name}>
                                  {driver.parent_name || driver.parent_code}
                                </span>
                                <span className="block font-mono text-[11px] text-muted-foreground">
                                  {driver.parent_code}
                                </span>
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {formatQty(driver.plan_qty)}
                              </td>
                              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                {driver.qty_per_unit}
                              </td>
                              <td className="py-1.5 text-right font-medium tabular-nums">
                                {formatQtyWithUom(driver.required_qty, row.uom)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {row.driver_count > row.drivers.length && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        The {row.drivers.length} biggest are listed; Planning is the sum of all{' '}
                        {row.driver_count}.
                      </p>
                    )}
                  </section>
                )}

                {meta && !meta.nets_committed && row.req_after_benchmark_qty < 0 && (
                  <p className="text-xs text-muted-foreground">
                    Stock committed to production orders is not subtracted here. On a packing
                    material that commitment is mostly this plan&rsquo;s own orders, so netting it
                    would count the same demand twice — once as Planning and once as committed.
                  </p>
                )}
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* A sibling rather than a child, so the order's own dialog is not a row
          of the grid this one lays its header and body out with. Radix stacks
          the two, and closing the order comes back to the component. */}
      <PmReqPoDocDialog
        docEntry={openPo?.doc_entry ?? null}
        docNum={openPo?.doc_num ?? null}
        onClose={() => setOpenPoKey(null)}
      />
    </>
  );
}
