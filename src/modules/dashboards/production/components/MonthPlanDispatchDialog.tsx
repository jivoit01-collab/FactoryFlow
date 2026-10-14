import { ChevronRight, Search, Truck } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import { usePlanStockWarehouses, usePlantBoard } from '@/modules/dashboards/plant-board/api';
import { decimal, whole } from '@/modules/dashboards/plant-board/components/drills/format';
import type { PlanSku } from '@/modules/dashboards/plant-board/types';
import {
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { type Breakdown, SkuBreakdown } from './MonthPlanSkuDialog';
import { amount, show, total, UNITS, usePlanUnit } from './planUnits';

/** One row's dispatch, with or without the group companies' share. */
interface Sold {
  qty: number;
  tons: number;
  /** Of the plan, by pieces; null where nothing was planned. */
  pct: number | null;
}

function sold(row: PlanSku, withGroup: boolean): Sold | null {
  if (!row.dispatch_read || row.dispatch_qty == null || row.dispatch_tons == null) return null;
  const qty = row.dispatch_qty + (withGroup ? (row.group_dispatch_qty ?? 0) : 0);
  const tons = row.dispatch_tons + (withGroup ? (row.group_dispatch_tons ?? 0) : 0);
  return { qty, tons, pct: row.planned_qty > 0 ? (qty / row.planned_qty) * 100 : null };
}

type Show = 'all' | 'none' | 'behind' | 'met' | 'off-plan';

const SHOW: { key: Show; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'none', label: 'Not dispatched' },
  { key: 'behind', label: 'Behind plan' },
  { key: 'met', label: 'Plan met' },
  { key: 'off-plan', label: 'Not on plan' },
];

function matches(row: PlanSku, out: Sold | null, filter: Show): boolean {
  if (filter === 'off-plan') return !row.on_plan;
  if (filter === 'all') return true;
  if (!row.on_plan || !out) return false;
  if (filter === 'none') return out.qty <= 0;
  if (filter === 'behind') return out.qty > 0 && out.qty < row.planned_qty;
  return out.qty >= row.planned_qty;
}

/**
 * The month's plan against what was actually dispatched, SKU by SKU.
 *
 * The plan-to-made popup's twin, read off the same plant-board response, with
 * a dispatch column beside made. It is here to show the SKUs the plan keeps
 * asking for that customers are not taking — planned, perhaps made, and
 * dispatched nil — so the next plan can be set on what sells.
 *
 * Dispatch is the Production & Dispatch report's own definition over the
 * plan's window so far: deliveries, and invoices not copied from one. Group
 * companies are left out by default, as that report leaves them out, and can
 * be put back with the toggle.
 */
export function MonthPlanDispatchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError } = usePlantBoard();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Show>('all');
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown>('warehouse');
  const [withGroup, setWithGroup] = useState(false);
  const [unit, setUnit] = usePlanUnit();
  // Only for the label of what "In stock" counts.
  const counted = usePlanStockWarehouses(open).data?.selected ?? null;
  const countedLabel =
    counted == null
      ? 'all warehouses'
      : `${counted.length} selected warehouse${counted.length === 1 ? '' : 's'}`;

  const production = data?.production ?? null;
  const plan = data?.meta.plan ?? null;
  const rows = production?.by_sku;
  const all = useMemo(() => rows ?? [], [rows]);
  // A backend without dispatch sends no `dispatch_read` at all.
  const dispatchSent = all.some((row) => row.dispatch_read !== undefined);
  const dispatchRead = all.some((row) => row.dispatch_read);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter(
      (row) =>
        matches(row, sold(row, withGroup), filter) &&
        (!needle ||
          row.item_code.toLowerCase().includes(needle) ||
          row.item_name.toLowerCase().includes(needle)),
    );
  }, [all, query, filter, withGroup]);

  const onPlan = all.filter((row) => row.on_plan);
  const planned = total(onPlan, unit, (row) => [row.planned_qty, row.planned_tons]);
  const dispatchedOnPlan = total(onPlan, unit, (row) => {
    const out = sold(row, withGroup);
    return [out?.qty ?? 0, out?.tons ?? 0];
  });
  const dispatched = total(all, unit, (row) => {
    const out = sold(row, withGroup);
    return [out?.qty ?? 0, out?.tons ?? 0];
  });
  const groupDispatched = total(all, unit, (row) => [
    row.group_dispatch_qty ?? 0,
    row.group_dispatch_tons ?? 0,
  ]);
  const nilRows = onPlan.filter((row) => (sold(row, withGroup)?.qty ?? 1) <= 0);
  const nilPlanned = total(nilRows, unit, (row) => [row.planned_qty, row.planned_tons]);
  const nilMade = total(nilRows, unit, (row) => [row.produced_qty, row.produced_tons]);
  const inStock = total(all, unit, (row) => [row.stock_qty ?? 0, row.stock_tons ?? 0]);
  const columns = 8;

  // The window made and dispatch are both read over: plan start to today.
  const span = plan?.start_date
    ? `${new Date(`${plan.start_date}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })} to today`
    : 'this month so far';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[88vh] w-[94vw] max-w-6xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
        <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 pr-8">
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-sky-500" />
              Plan to dispatch, SKU by SKU
            </DialogTitle>
            <DialogDescription>
              {plan?.name ? `${plan.name} · ` : ''}Planned against dispatched off SAP's deliveries
              and invoices, {span} · group companies {withGroup ? 'included' : 'left out'} · stock
              in {countedLabel} as it stands now
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setWithGroup((value) => !value)}
              aria-pressed={withGroup}
              title="Count sales to Jivo Mart and the other group companies as dispatch"
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                withGroup
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {withGroup ? 'With group cos.' : 'Without group cos.'}
            </button>
            <div className="flex rounded-lg border p-0.5" role="group" aria-label="Unit">
              {UNITS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setUnit(option.key)}
                  aria-pressed={unit === option.key}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                    unit === option.key
                      ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {production && dispatchRead && (
            <StatTileRow>
              <StatTile
                label="Planned"
                value={show(planned, unit)}
                sub={`${whole(onPlan.length)} SKUs on plan`}
                accent="violet"
              />
              <StatTile
                label="Dispatched"
                value={show(dispatched, unit)}
                sub={
                  withGroup
                    ? `incl. ${show(groupDispatched, unit)} to group cos.`
                    : `+ ${show(groupDispatched, unit)} to group cos., left out`
                }
                accent="sky"
              />
              <StatTile
                label="Planned − dispatched"
                value={show(Math.max(0, planned - dispatchedOnPlan), unit)}
                sub={
                  planned > 0
                    ? `${((dispatchedOnPlan / planned) * 100).toFixed(0)}% of the plan dispatched`
                    : undefined
                }
                accent="amber"
              />
              <StatTile
                label="Planned, not dispatched"
                value={whole(nilRows.length)}
                sub={`${show(nilPlanned, unit)} planned · ${show(nilMade, unit)} made`}
                accent="rose"
              />
              <StatTile
                label="In stock"
                value={show(inStock, unit)}
                sub={countedLabel}
                accent="slate"
              />
            </StatTileRow>
          )}

          <TableCard
            bodyClassName="overflow-visible"
            summary={
              rows
                ? `${whole(visible.length)} of ${whole(all.length)} SKUs${
                    unit === 'cases' ? ' · "—" where the plan has no case factor' : ''
                  }${
                    unit === 'tons' || unit === 'litres'
                      ? ' · "—" where SAP has no litre volume'
                      : ''
                  }`
                : undefined
            }
            actions={
              <>
                <div className="flex rounded-lg border p-0.5">
                  {SHOW.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setFilter(option.key)}
                      className={cn(
                        'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                        filter === option.key
                          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search SKU or item"
                    className="h-8 w-56 pl-8"
                  />
                </div>
              </>
            }
          >
            <table className={TABLE_CLASSES}>
              <thead className={cn(THEAD_CLASSES, 'sticky top-0 z-10 bg-muted')}>
                <tr>
                  <Th>SKU</Th>
                  <Th>Item</Th>
                  <Th align="right">Planned</Th>
                  <Th align="right">Made</Th>
                  <Th align="right">Dispatched</Th>
                  <Th align="right">Planned − dispatched</Th>
                  <Th align="right">% dispatched</Th>
                  <Th align="right">In stock</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableLoading
                    colSpan={columns}
                    message="Reading the plan and dispatch from SAP…"
                  />
                ) : isError || !production ? (
                  <TableEmpty
                    colSpan={columns}
                    message="The month's plan could not be read"
                    hint="SAP is not answering, or this login does not hold the production-plan right."
                  />
                ) : rows === undefined || !dispatchSent ? (
                  <TableEmpty
                    colSpan={columns}
                    message="This server does not send dispatch by SKU yet."
                  />
                ) : !dispatchRead ? (
                  <TableEmpty
                    colSpan={columns}
                    message="Dispatch could not be read from SAP just now."
                    hint="The plan itself is on the SKU-wise popup."
                  />
                ) : visible.length === 0 ? (
                  <TableEmpty colSpan={columns} message="No SKUs match" />
                ) : (
                  visible.map((row) => {
                    const out = sold(row, withGroup);
                    const nil = row.on_plan && out != null && out.qty <= 0;
                    const left = out == null ? null : row.planned_qty - out.qty;
                    return (
                      <Fragment key={row.item_code}>
                        <tr
                          className={cn(
                            ROW_CLASSES,
                            'cursor-pointer',
                            openSku === row.item_code && 'bg-sky-500/[0.06]',
                          )}
                          onClick={() =>
                            setOpenSku((current) =>
                              current === row.item_code ? null : row.item_code,
                            )
                          }
                          aria-expanded={openSku === row.item_code}
                        >
                          <Td className="whitespace-nowrap text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ChevronRight
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 transition-transform',
                                  openSku === row.item_code && 'rotate-90 text-sky-500',
                                )}
                              />
                              {row.item_code}
                            </span>
                          </Td>
                          <Td>
                            <span className="flex flex-col leading-tight">
                              <span className="font-medium">{row.item_name || '—'}</span>
                              {!row.on_plan && (
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  not on plan
                                </span>
                              )}
                              {nil && (
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                                  planned, nothing dispatched
                                </span>
                              )}
                            </span>
                          </Td>
                          <Td numeric className="font-semibold">
                            {show(amount(row, row.planned_qty, row.planned_tons, unit), unit)}
                          </Td>
                          <Td numeric className="font-semibold text-muted-foreground">
                            {show(amount(row, row.produced_qty, row.produced_tons, unit), unit)}
                          </Td>
                          <Td
                            numeric
                            className={cn(
                              'font-semibold',
                              nil && 'text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {out == null ? '—' : show(amount(row, out.qty, out.tons, unit), unit)}
                          </Td>
                          <Td
                            numeric
                            className={cn(
                              'font-semibold',
                              left == null
                                ? undefined
                                : left < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : left > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : undefined,
                            )}
                          >
                            {(() => {
                              if (out == null) return '—';
                              const value = amount(
                                row,
                                row.planned_qty - out.qty,
                                row.planned_tons - out.tons,
                                unit,
                              );
                              return value != null && value < 0
                                ? `${show(-value, unit)} over`
                                : show(value, unit);
                            })()}
                          </Td>
                          <Td
                            numeric
                            className={cn(
                              'font-semibold',
                              nil && 'text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {out?.pct == null ? '—' : `${decimal(out.pct, 0)}%`}
                          </Td>
                          <Td numeric className="font-semibold">
                            {row.stock_qty == null || row.stock_tons == null
                              ? '—'
                              : show(amount(row, row.stock_qty, row.stock_tons, unit), unit)}
                          </Td>
                        </tr>
                        {openSku === row.item_code && (
                          <tr className="border-b bg-sky-500/[0.03]">
                            <td colSpan={columns} className="space-y-3 px-4 py-3">
                              {!!row.group_dispatch_qty && (
                                <p className="ml-5 text-sm text-muted-foreground">
                                  {show(
                                    amount(
                                      row,
                                      row.group_dispatch_qty,
                                      row.group_dispatch_tons ?? 0,
                                      unit,
                                    ),
                                    unit,
                                  )}{' '}
                                  went to group companies
                                  {withGroup ? ', counted above.' : ', not counted above.'}
                                </p>
                              )}
                              <SkuBreakdown
                                row={row}
                                unit={unit}
                                view={breakdown}
                                setView={setBreakdown}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </TableCard>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
