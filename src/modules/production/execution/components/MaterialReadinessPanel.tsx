import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  ClipboardCheck,
  Loader2,
  PackageSearch,
  Truck,
} from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type {
  MaterialReadinessStatus,
  PlanCheckMaterialRow,
  PlanCheckMaterialSummary,
} from '../types';

export interface ReadinessRow {
  /** `useFieldArray` id. Keying rows on it is what makes an input pick up a
   *  re-scaled quantity: a stable key reuses the DOM node and the field keeps
   *  showing the old number. */
  id: string;
  material_code: string;
  material_name: string;
  uom: string;
  /** BOM quantity for ONE box, as authored in SAP. */
  per_case?: number;
  check?: PlanCheckMaterialRow;
}

interface MaterialReadinessPanelProps {
  rows: ReadinessRow[];
  summary?: PlanCheckMaterialSummary;
  warehouses?: string[];
  /** Per-material-type warehouse scope, so the header can be specific rather
   *  than listing every warehouse and leaving the operator to guess. */
  warehouseScope?: Partial<Record<'RAW' | 'PACKAGING' | 'OTHER', string[]>>;
  unusable?: { item_code: string; item_name: string; reason: string }[];
  resourceLines?: { item_code: string; item_name: string }[];
  /** True while the plan-check request is in flight — the numbers are stale. */
  isChecking?: boolean;
  /** Set when the stock read itself failed; the rows carry no figures. */
  stockError?: string;
  bomLoading?: boolean;
  hasSku: boolean;
  requiredQtyEntered: boolean;
  /** Renders the editable required-quantity input for row `index`. */
  renderRequiredInput: (index: number) => ReactNode;
}

const STATUS_STYLE: Record<
  MaterialReadinessStatus,
  { label: string; className: string; icon: typeof CircleCheck }
> = {
  OK: {
    label: 'Ready',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    icon: CircleCheck,
  },
  TIGHT: {
    label: 'Committed elsewhere',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    icon: CircleAlert,
  },
  CONTESTED: {
    label: 'Claimed by another plan',
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
    icon: AlertTriangle,
  },
  SHORT: {
    label: 'Short',
    className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    icon: AlertTriangle,
  },
  NO_STOCK_RECORD: {
    label: 'Not in RM register',
    className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    icon: AlertTriangle,
  },
  UNKNOWN: {
    label: 'Not checked',
    className: 'bg-muted text-muted-foreground',
    icon: CircleHelp,
  },
};

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  RAW: 'RM',
  PACKAGING: 'PM',
  OTHER: 'Other',
};

const qty = (value?: number | null, digits = 3) =>
  value === null || value === undefined
    ? '—'
    : value.toLocaleString(undefined, { maximumFractionDigits: digits });

function StatusPill({ status }: { status: MaterialReadinessStatus }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.UNKNOWN;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
}

/**
 * The heart of the planning screen: for every RM and PM line, what the run
 * needs against what the warehouse actually holds, and who else has already
 * claimed it.
 *
 * Two figures deliberately sit side by side. **In stock** is physical on-hand,
 * and it is what a shortfall is judged on — the material is in the building, so
 * the line can physically run it. **Free** nets off what SAP has reserved
 * against other documents; on this data most components are over-committed, so
 * judging on free would read almost every plan as blocked. Showing both keeps
 * the over-commitment visible without letting it veto a plan.
 */
export function MaterialReadinessPanel({
  rows,
  summary,
  warehouses,
  warehouseScope,
  unusable = [],
  resourceLines = [],
  isChecking,
  stockError,
  bomLoading,
  hasSku,
  requiredQtyEntered,
  renderRequiredInput,
}: MaterialReadinessPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // RM and PM are read from different warehouses, so "checked against" has to
  // be stated per kind of material — pooling all five reads as though oil could
  // be drawn from a carton store.
  const scopeParts = (
    [
      { key: 'RAW', label: 'RM' },
      { key: 'PACKAGING', label: 'PM' },
    ] as const
  )
    .map(({ key, label }) => ({ label, codes: warehouseScope?.[key] ?? [] }))
    .filter((part) => part.codes.length > 0);

  const toggle = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const shortCount = summary?.short_lines ?? 0;
  const contestedCount = summary?.contested_lines ?? 0;
  const tightCount = summary?.tight_lines ?? 0;
  const okCount = summary?.ok_lines ?? 0;

  return (
    <Card
      className={
        shortCount > 0
          ? 'border-red-300 dark:border-red-900'
          : contestedCount > 0
            ? 'border-amber-300 dark:border-amber-900'
            : undefined
      }
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <PackageSearch className="h-4 w-4 text-muted-foreground" />
          Material readiness — RM &amp; PM
          {bomLoading && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading BOM...
            </span>
          )}
          {isChecking && !bomLoading && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking stock...
            </span>
          )}
          {summary && summary.total_lines > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {summary.total_lines} component{summary.total_lines > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        {(scopeParts.length > 0 || (warehouses?.length ?? 0) > 0) && (
          <p className="text-xs text-muted-foreground">
            RM from the Raw Material register the warehouse keeps
            {scopeParts.length > 0
              ? ` · PM in ${(warehouseScope?.PACKAGING ?? []).join(', ')}`
              : warehouses?.length
                ? ` · PM in ${warehouses.join(', ')}`
                : ''}
            . Scrap and rejected stock (BH-WST) is never counted.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasSku && (
          <p className="text-sm text-muted-foreground">
            Pick a product SKU to load its BOM and check the warehouse.
          </p>
        )}

        {hasSku && !requiredQtyEntered && rows.length > 0 && (
          <p className="text-sm text-amber-600">
            Enter the FG quantity above — the requirement, and so the stock check, scales from it.
          </p>
        )}

        {stockError && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <CircleHelp className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Stock could not be read from SAP</p>
              <p className="text-xs text-muted-foreground">
                {stockError} The requirement below is still correct; availability is unknown, so
                nothing here is evidence of a shortage.
              </p>
            </div>
          </div>
        )}

        {summary && summary.total_lines > 0 && !stockError && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Ready', value: okCount, tone: 'text-emerald-700 dark:text-emerald-400' },
              {
                label: 'Committed elsewhere',
                value: tightCount,
                tone: 'text-sky-700 dark:text-sky-400',
              },
              {
                label: 'Claimed by another plan',
                value: contestedCount,
                tone: 'text-amber-700 dark:text-amber-400',
              },
              { label: 'Short', value: shortCount, tone: 'text-red-700 dark:text-red-400' },
            ].map((tile) => (
              <div key={tile.label} className="rounded-md border bg-background px-3 py-2">
                <p className={`text-xl font-semibold ${tile.tone}`}>{tile.value}</p>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
              </div>
            ))}
          </div>
        )}

        {shortCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950/40">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="font-medium">
                {shortCount} component{shortCount > 1 ? 's are' : ' is'} short in the warehouse
              </p>
              <p className="text-xs text-muted-foreground">
                The line cannot run the full quantity on what is in stock today. Either cut the
                quantity, get the material in, or give a reason below and plan it anyway.
              </p>
            </div>
          </div>
        )}

        {shortCount === 0 && contestedCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">
                Enough stock for this plan alone, but another plan wants the same material
              </p>
              <p className="text-xs text-muted-foreground">
                Both plans cannot draw their full quantity. Expand the row to see which runs are
                competing.
              </p>
            </div>
          </div>
        )}

        {summary && summary.total_lines > 0 && !stockError && (
          <p className="text-xs text-muted-foreground">
            {summary.approval_lines === 0 ? (
              <>
                Nothing goes to the warehouse — there is no raw material on this bill and all
                packing material is already at BH-PC.
              </>
            ) : (
              <>
                {summary.approval_lines} line{summary.approval_lines > 1 ? 's' : ''} will be sent
                to the warehouse, as two separate requests: raw material always goes in full and
                is settled against the register, packing material only for what has to be fetched
                from a godown other than BH-PC.
              </>
            )}
          </p>
        )}

        {rows.length > 0 && (
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-8" />
                  <th className="text-left py-2 px-3">Component</th>
                  <th className="text-right py-2 px-3">Per case</th>
                  <th className="text-left py-2 px-3">Required</th>
                  <th className="text-right py-2 px-3">In stock</th>
                  <th className="text-right py-2 px-3">Free</th>
                  <th className="text-right py-2 px-3">Other plans</th>
                  <th className="text-right py-2 px-3">Balance</th>
                  <th className="text-left py-2 px-3">Approval</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const check = row.check;
                  const status: MaterialReadinessStatus = check?.status ?? 'UNKNOWN';
                  const isOpen = expanded.has(row.material_code);
                  const balance = check?.balance_after_this_plan;
                  const hasDetail =
                    !!check &&
                    ((check.warehouses?.length ?? 0) > 0 ||
                      (check.competing_runs?.length ?? 0) > 0 ||
                      check.on_order_qty !== null);

                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={`border-b last:border-0 ${
                          status === 'SHORT' || status === 'NO_STOCK_RECORD'
                            ? 'bg-red-50/60 dark:bg-red-950/20'
                            : status === 'CONTESTED'
                              ? 'bg-amber-50/60 dark:bg-amber-950/20'
                              : ''
                        }`}
                      >
                        <td className="py-2 pl-2 align-top">
                          {hasDetail && (
                            <button
                              type="button"
                              onClick={() => toggle(row.material_code)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={isOpen ? 'Hide detail' : 'Show detail'}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{row.material_code}</span>
                            {check && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {MATERIAL_TYPE_LABEL[check.material_type] ?? check.material_type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{row.material_name}</p>
                        </td>
                        <td className="py-2 px-3 text-right text-xs text-muted-foreground">
                          {qty(row.per_case ?? check?.qty_per_case)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            {renderRequiredInput(index)}
                            <span className="text-xs text-muted-foreground">{row.uom}</span>
                          </div>
                          {check?.required_is_overridden && (
                            <p className="text-[11px] text-amber-600 mt-0.5">
                              BOM says {qty(check.bom_required_qty)}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums align-top">
                          {qty(check?.on_hand)}
                          {check?.stock_source === 'REGISTER' && (
                            <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                              {check.register_missing ? (
                                <span className="text-red-700 dark:text-red-400">
                                  not on the RM register
                                </span>
                              ) : (
                                <>register{check.register_as_of ? ` · ${check.register_as_of}` : ''}</>
                              )}
                            </p>
                          )}
                          {check?.stock_source === 'REGISTER' && check.sap_on_hand !== null && (
                            <p className="text-[11px] font-normal text-muted-foreground/70">
                              SAP {qty(check.sap_on_hand)}
                            </p>
                          )}
                          {check && check.warehouses.length > 0 && (
                            <div className="mt-0.5 space-y-0.5 text-[11px] font-normal text-muted-foreground">
                              {check.warehouses.slice(0, 2).map((w) => (
                                <p key={w.warehouse}>
                                  <span className="font-mono">{w.warehouse}</span>
                                  {check.warehouses.length > 1 && <> {qty(w.on_hand)}</>}
                                </p>
                              ))}
                              {check.warehouses.length > 2 && (
                                <p>+{check.warehouses.length - 2} more</p>
                              )}
                            </div>
                          )}
                          {check && check.on_hand !== null && check.warehouses.length === 0 && (
                            <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                              none in{' '}
                              <span className="font-mono">
                                {check.searched_warehouses.join(', ') || 'any store'}
                              </span>
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                          {qty(check?.free)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {check?.other_plan_demand ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              {qty(check.other_plan_demand)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {balance === null || balance === undefined ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span
                              className={
                                balance < 0 ? 'text-red-700 dark:text-red-400 font-medium' : ''
                              }
                            >
                              {qty(balance)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          {!check ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : check.approval_required ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                                <ClipboardCheck className="h-3 w-3" />
                                {qty(check.approval_qty)}
                              </span>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {check.stock_source === 'REGISTER'
                                  ? 'RM request'
                                  : check.qty_at_production_consumption
                                    ? `PM request · ${qty(check.qty_at_production_consumption)} already at BH-PC`
                                    : 'PM request'}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">not needed</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <StatusPill status={status} />
                          {!!check?.shortfall && check.shortfall > 0 && (
                            <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
                              short {qty(check.shortfall)} {row.uom}
                            </p>
                          )}
                        </td>
                      </tr>

                      {isOpen && check && (
                        <tr className="border-b last:border-0 bg-muted/30">
                          <td />
                          <td colSpan={9} className="py-3 px-3">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div>
                                <p className="text-xs font-medium mb-1">Where the stock is</p>
                                {check.stock_source === 'REGISTER' ? (
                                  <p className="text-[11px] text-muted-foreground mb-1">
                                    From the Raw Material register the warehouse keeps, not from
                                    SAP.
                                    {check.sap_on_hand !== null && (
                                      <> SAP holds {qty(check.sap_on_hand)} for comparison.</>
                                    )}
                                  </p>
                                ) : (
                                  check.searched_warehouses.length > 0 && (
                                    <p className="text-[11px] text-muted-foreground mb-1">
                                      Looked in{' '}
                                      <span className="font-mono">
                                        {check.searched_warehouses.join(', ')}
                                      </span>{' '}
                                      ({MATERIAL_TYPE_LABEL[check.material_type] ??
                                        check.material_type}
                                      ).
                                    </p>
                                  )
                                )}
                                {check.warehouses.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    {check.register_missing
                                      ? 'Nobody has entered this material on the Raw Material register, so it counts as zero.'
                                      : 'No stock in any of those warehouses.'}
                                  </p>
                                ) : (
                                  <ul className="space-y-0.5">
                                    {check.warehouses.map((w) => (
                                      <li
                                        key={w.warehouse}
                                        className="flex justify-between gap-3 text-xs"
                                      >
                                        <span className="font-mono">{w.warehouse}</span>
                                        <span className="tabular-nums">
                                          {qty(w.on_hand)}
                                          {!!w.committed && (
                                            <span className="text-muted-foreground">
                                              {' '}
                                              ({qty(w.committed)} committed)
                                            </span>
                                          )}
                                          {!!w.as_of_date && (
                                            <span className="text-muted-foreground">
                                              {' '}
                                              (as of {w.as_of_date})
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {check.issue_warehouse && (
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    BOM issues from {check.issue_warehouse}.
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-medium mb-1">Other plans wanting it</p>
                                {check.competing_runs.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Nothing else is claiming this component.
                                  </p>
                                ) : (
                                  <ul className="space-y-0.5">
                                    {check.competing_runs.map((run) => (
                                      <li key={run.run_id} className="text-xs">
                                        <span className="font-medium">Run #{run.run_number}</span>{' '}
                                        <span className="text-muted-foreground">
                                          {run.line_name} · {run.product || '—'} ·{' '}
                                          {run.status === 'IN_PROGRESS' ? 'running' : run.date}
                                        </span>{' '}
                                        <span className="tabular-nums">— {qty(run.qty)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-medium mb-1">Warehouse approval</p>
                                <p className="text-xs text-muted-foreground">
                                  {check.approval_reason}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-medium mb-1">On order</p>
                                {check.on_order_qty ? (
                                  <p className="flex items-start gap-1.5 text-xs">
                                    <Truck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span>
                                      {qty(check.on_order_qty)} {row.uom} on open purchase orders
                                      {check.on_order_earliest_due
                                        ? `, earliest due ${check.on_order_earliest_due}`
                                        : ''}
                                      .
                                    </span>
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Nothing on open purchase orders.
                                  </p>
                                )}
                                {check.days_since_last_consumption !== null && (
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    Last consumed {check.days_since_last_consumption} days ago.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasSku && rows.length === 0 && !bomLoading && (
          <p className="text-sm text-muted-foreground">No BOM components found for this item.</p>
        )}

        {unusable.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/40">
            <p className="font-medium">Components that cannot be scaled</p>
            <ul className="mt-1 space-y-0.5">
              {unusable.map((line) => (
                <li key={line.item_code}>
                  <span className="font-mono">{line.item_code}</span> — {line.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {resourceLines.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {resourceLines.length} conversion-cost line
            {resourceLines.length > 1 ? 's' : ''} on this BOM ({' '}
            {resourceLines.map((r) => r.item_code).join(', ')} ) — not stock, so nothing to check.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
