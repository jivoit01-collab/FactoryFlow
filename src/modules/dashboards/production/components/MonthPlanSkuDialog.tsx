import { CalendarRange, ChevronRight, Search, Settings } from 'lucide-react';
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

import { PlanStockSettings } from './PlanStockSettings';

type Show = 'all' | 'pending' | 'done' | 'off-plan';

const SHOW: { key: Show; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Still to make' },
  { key: 'done', label: 'Done' },
  { key: 'off-plan', label: 'Not on plan' },
];

function matches(row: PlanSku, show: Show): boolean {
  if (show === 'pending') return row.on_plan && row.balance_qty > 0;
  if (show === 'done') return row.on_plan && row.balance_qty <= 0;
  if (show === 'off-plan') return !row.on_plan;
  return true;
}

type Unit = 'tons' | 'litres' | 'cases' | 'pcs';

const UNITS: { key: Unit; label: string }[] = [
  { key: 'tons', label: 'Tonnes' },
  { key: 'litres', label: 'Litres' },
  { key: 'cases', label: 'Cases' },
  { key: 'pcs', label: 'Pcs' },
];

const UNIT_STORAGE_KEY = 'month-plan-sku-unit';

function storedUnit(): Unit {
  try {
    const value = window.localStorage.getItem(UNIT_STORAGE_KEY);
    if (UNITS.some((unit) => unit.key === value)) return value as Unit;
  } catch {
    // Storage blocked: the default is fine.
  }
  return 'tons';
}

/**
 * One figure of a row in the chosen unit, from its pieces and its tonnes.
 *
 * Litres are the tonnes on the board's own 1000 L = 1 t rule, the rule the
 * tonnes were made with. Null where the unit does not exist for the SKU: no
 * litre volume in SAP for tonnes and litres, no case factor on the plan for
 * cases. Null is "—", never a zero.
 */
function amount(row: PlanSku, qty: number, tons: number, unit: Unit): number | null {
  if (unit === 'pcs') return qty;
  if (unit === 'cases') return row.pieces_per_case ? qty / row.pieces_per_case : null;
  if (!row.weighed) return null;
  return unit === 'litres' ? tons * 1000 : tons;
}

function show(value: number | null | undefined, unit: Unit): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (unit === 'tons') return `${decimal(value, 2)} t`;
  if (unit === 'litres') return `${whole(value)} L`;
  if (unit === 'cases') return `${whole(value)} cs`;
  return `${whole(value)} pcs`;
}

/** A unit-scale sum across rows, skipping the rows the unit does not exist for. */
function total(
  rows: readonly PlanSku[],
  unit: Unit,
  pick: (row: PlanSku) => [number, number],
): number {
  return rows.reduce((sum, row) => sum + (amount(row, ...pick(row), unit) ?? 0), 0);
}

/** Every warehouse a SKU stands in, opened under its row. */
function SkuWarehouses({ row, unit }: { row: PlanSku; unit: Unit }) {
  if (row.stock_read === false) {
    return (
      <p className="text-sm text-muted-foreground">
        Stock by warehouse could not be read from SAP just now.
      </p>
    );
  }
  const places = row.warehouses ?? [];
  if (places.length === 0) {
    return <p className="text-sm text-muted-foreground">No stock of this SKU in any warehouse.</p>;
  }
  return (
    <div className="ml-5 overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left font-semibold">Warehouse</th>
            <th className="px-3 py-1.5 text-left font-semibold">Name</th>
            <th className="px-3 py-1.5 text-right font-semibold">
              {UNITS.find((u) => u.key === unit)?.label}
            </th>
          </tr>
        </thead>
        <tbody>
          {places.map((place) => (
            <tr key={place.code} className="border-t">
              <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                {place.code}
                {place.code === 'BH-PF' && (
                  <span className="ml-2 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-300">
                    floor
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">{place.name || '—'}</td>
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                {show(amount(row, place.qty, place.tons, unit), unit)}
              </td>
            </tr>
          ))}
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-3 py-1.5" colSpan={2}>
              Total · {whole(places.length)} warehouse{places.length === 1 ? '' : 's'}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">
              {show(amount(row, row.stock_qty ?? 0, row.stock_tons ?? 0, unit), unit)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * The month's plan SKU by SKU, in a popup opened from the month-plan strip
 * on Line Performance.
 *
 * Read off the same plant-board response the strip reads, so the totals here
 * are the strip's own figures. Made is the floor's receipt — the journal the
 * strip's headline is summed from — so the rows add up to it; SKUs the floor
 * made off-plan are listed too, planned at zero. Stock is every warehouse as
 * it stands now, not at the month's end; a row opens to show where.
 */
export function MonthPlanSkuDialog({
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
  const [settings, setSettings] = useState(false);
  const [unit, setUnitState] = useState<Unit>(storedUnit);
  const setUnit = (next: Unit) => {
    setUnitState(next);
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, next);
    } catch {
      // Remembered for this visit only.
    }
  };
  // Only for the label of what "In stock" counts.
  const counted = usePlanStockWarehouses(open).data?.selected ?? null;
  const countedLabel =
    counted == null
      ? 'all warehouses'
      : `${counted.length} selected warehouse${counted.length === 1 ? '' : 's'}`;

  const production = data?.production ?? null;
  const plan = data?.meta.plan ?? null;
  const rows = production?.by_sku;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (row) =>
        matches(row, filter) &&
        (!needle ||
          row.item_code.toLowerCase().includes(needle) ||
          row.item_name.toLowerCase().includes(needle)),
    );
  }, [rows, query, filter]);

  const all = rows ?? [];
  const planned = total(all, unit, (row) => [row.planned_qty, row.planned_tons]);
  const made = total(all, unit, (row) => [row.produced_qty, row.produced_tons]);
  const madeOffPlan = total(
    all.filter((row) => !row.on_plan),
    unit,
    (row) => [row.produced_qty, row.produced_tons],
  );
  const inStock = total(all, unit, (row) => [row.stock_qty ?? 0, row.stock_tons ?? 0]);
  const atFloor = total(all, unit, (row) => [row.pf_qty ?? 0, row.pf_tons ?? 0]);
  const columns = 7;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[88vh] w-[94vw] max-w-6xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
        <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 pr-8">
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-violet-500" />
              {settings ? 'Plan stock settings' : "This month's plan, SKU by SKU"}
            </DialogTitle>
            <DialogDescription>
              {plan?.name ? `${plan.name} · ` : ''}Planned against made off SAP's movement journal ·
              stock in {countedLabel} as it stands now · click a SKU for where it is
            </DialogDescription>
          </div>
          {!settings && (
            <div className="flex shrink-0 items-center gap-2">
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
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSettings(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          )}
        </DialogHeader>

        <DialogBody className="space-y-4">
          {settings ? (
            <PlanStockSettings onDone={() => setSettings(false)} />
          ) : (
            <>
              {production && (
                <StatTileRow>
                  <StatTile
                    label="Planned"
                    value={show(planned, unit)}
                    sub={`${whole(all.filter((row) => row.on_plan).length)} SKUs on plan`}
                    accent="violet"
                  />
                  <StatTile
                    label="Made"
                    value={show(made, unit)}
                    sub={
                      planned > 0
                        ? `${((made / planned) * 100).toFixed(0)}% of the plan`
                        : undefined
                    }
                    accent="emerald"
                  />
                  <StatTile
                    label="Planned − made"
                    value={show(Math.max(0, planned - made), unit)}
                    accent="amber"
                  />
                  <StatTile
                    label="In stock"
                    value={show(inStock, unit)}
                    sub={`${countedLabel} · ${show(atFloor, unit)} at BH-PF`}
                    accent="sky"
                  />
                  <StatTile
                    label="Not on plan"
                    value={whole(all.filter((row) => !row.on_plan).length)}
                    sub={`${show(madeOffPlan, unit)} made`}
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
                              ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
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
                      <Th align="right">Planned − made</Th>
                      <Th align="right">% done</Th>
                      <Th align="right">In stock</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <TableLoading colSpan={columns} message="Reading the plan from SAP…" />
                    ) : isError || !production ? (
                      <TableEmpty
                        colSpan={columns}
                        message="The month's plan could not be read"
                        hint="SAP is not answering, or this login does not hold the production-plan right."
                      />
                    ) : rows === undefined ? (
                      <TableEmpty
                        colSpan={columns}
                        message="This server does not list the plan by SKU yet."
                      />
                    ) : visible.length === 0 ? (
                      <TableEmpty colSpan={columns} message="No SKUs match" />
                    ) : (
                      visible.map((row) => (
                        <Fragment key={row.item_code}>
                          <tr
                            className={cn(
                              ROW_CLASSES,
                              'cursor-pointer',
                              openSku === row.item_code && 'bg-violet-500/[0.06]',
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
                                    openSku === row.item_code && 'rotate-90 text-violet-500',
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
                              </span>
                            </Td>
                            <Td numeric className="font-semibold">
                              {show(amount(row, row.planned_qty, row.planned_tons, unit), unit)}
                            </Td>
                            <Td numeric className="font-semibold">
                              {show(amount(row, row.produced_qty, row.produced_tons, unit), unit)}
                            </Td>
                            <Td
                              numeric
                              className={cn(
                                'font-semibold',
                                row.balance_qty < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : row.balance_qty > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : undefined,
                              )}
                            >
                              {(() => {
                                const value = amount(row, row.balance_qty, row.balance_tons, unit);
                                return value != null && value < 0
                                  ? `${show(-value, unit)} over`
                                  : show(value, unit);
                              })()}
                            </Td>
                            <Td numeric className="font-semibold">
                              {row.attainment_pct == null
                                ? '—'
                                : `${decimal(row.attainment_pct, 0)}%`}
                            </Td>
                            <Td numeric className="font-semibold">
                              {row.stock_qty == null || row.stock_tons == null
                                ? '—'
                                : show(amount(row, row.stock_qty, row.stock_tons, unit), unit)}
                            </Td>
                          </tr>
                          {openSku === row.item_code && (
                            <tr className="border-b bg-violet-500/[0.03]">
                              <td colSpan={columns} className="px-4 py-3">
                                <SkuWarehouses row={row} unit={unit} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </TableCard>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
