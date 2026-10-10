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

/**
 * A tonne figure with its cases or pieces underneath.
 *
 * A SKU SAP holds no litre volume for has no tonnage, which is not zero, so
 * it reads "—" and the pieces carry it.
 */
function Tonnes({
  tons,
  sub,
  weighed,
  className,
}: {
  tons: number;
  sub: string | null;
  weighed: boolean;
  className?: string;
}) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className={cn('font-semibold', className)}>
        {weighed ? `${decimal(tons, 2)} t` : '—'}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </span>
  );
}

/** Every warehouse a SKU stands in, opened under its row. */
function SkuWarehouses({ row }: { row: PlanSku }) {
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
    <div className="ml-5 max-w-3xl overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left font-semibold">Warehouse</th>
            <th className="px-3 py-1.5 text-left font-semibold">Name</th>
            <th className="px-3 py-1.5 text-right font-semibold">Pieces</th>
            <th className="px-3 py-1.5 text-right font-semibold">Tonnes</th>
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
              <td className="px-3 py-1.5 text-right tabular-nums">{whole(place.qty)}</td>
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                {row.weighed ? `${decimal(place.tons, 2)} t` : '—'}
              </td>
            </tr>
          ))}
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-3 py-1.5" colSpan={2}>
              Total · {whole(places.length)} warehouse{places.length === 1 ? '' : 's'}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">{whole(row.stock_qty)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">
              {row.weighed && row.stock_tons != null ? `${decimal(row.stock_tons, 2)} t` : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function cases(value: number | null): string | null {
  return value ? `${whole(value)} cs` : null;
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
  const [show, setShow] = useState<Show>('all');
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  // Only for the label of what "In stock" counts.
  const counted = usePlanStockWarehouses(open).data?.selected ?? null;
  const countedLabel =
    counted == null
      ? 'all warehouses'
      : `${counted.length} selected warehouse${counted.length === 1 ? '' : 's'}`;

  const production = data?.production ?? null;
  const plan = data?.plan ?? null;
  const rows = production?.by_sku;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (row) =>
        matches(row, show) &&
        (!needle ||
          row.item_code.toLowerCase().includes(needle) ||
          row.item_name.toLowerCase().includes(needle)),
    );
  }, [rows, query, show]);

  const all = rows ?? [];
  const left = production ? Math.max(0, production.planned_tons - production.produced_tons) : null;
  const inStock = all.reduce((sum, row) => sum + (row.stock_tons ?? 0), 0);
  const atFloor = all.reduce((sum, row) => sum + (row.pf_tons ?? 0), 0);
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
            <button
              type="button"
              onClick={() => setSettings(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
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
                    value={`${decimal(production.planned_tons)} t`}
                    sub={`${whole(all.filter((row) => row.on_plan).length)} SKUs on plan`}
                    accent="violet"
                  />
                  <StatTile
                    label="Made"
                    value={`${decimal(production.produced_tons)} t`}
                    sub={
                      production.attainment_tons_pct == null
                        ? undefined
                        : `${production.attainment_tons_pct.toFixed(0)}% of the plan`
                    }
                    accent="emerald"
                  />
                  <StatTile label="Planned − made" value={`${decimal(left)} t`} accent="amber" />
                  <StatTile
                    label="In stock"
                    value={`${decimal(inStock)} t`}
                    sub={`${countedLabel} · ${decimal(atFloor)} t at BH-PF`}
                    accent="sky"
                  />
                  <StatTile
                    label="Not on plan"
                    value={whole(all.filter((row) => !row.on_plan).length)}
                    sub={`${decimal(production.produced_unplanned_tons)} t made`}
                    accent="slate"
                  />
                </StatTileRow>
              )}

              <TableCard
                bodyClassName="overflow-visible"
                summary={rows ? `${whole(visible.length)} of ${whole(all.length)} SKUs` : undefined}
                actions={
                  <>
                    <div className="flex rounded-lg border p-0.5">
                      {SHOW.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setShow(option.key)}
                          className={cn(
                            'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                            show === option.key
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
                            <Td numeric>
                              <Tonnes
                                tons={row.planned_tons}
                                weighed={row.weighed}
                                sub={cases(row.planned_cases) ?? `${whole(row.planned_qty)} pcs`}
                              />
                            </Td>
                            <Td numeric>
                              <Tonnes
                                tons={row.produced_tons}
                                weighed={row.weighed}
                                sub={cases(row.produced_cases) ?? `${whole(row.produced_qty)} pcs`}
                              />
                            </Td>
                            <Td numeric>
                              <Tonnes
                                tons={row.balance_tons}
                                weighed={row.weighed}
                                sub={
                                  row.balance_qty < 0
                                    ? `${whole(-row.balance_qty)} pcs over`
                                    : `${whole(row.balance_qty)} pcs`
                                }
                                className={
                                  row.balance_qty < 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : row.balance_qty > 0
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : undefined
                                }
                              />
                            </Td>
                            <Td numeric className="font-semibold">
                              {row.attainment_pct == null
                                ? '—'
                                : `${decimal(row.attainment_pct, 0)}%`}
                            </Td>
                            <Td numeric>
                              {row.stock_tons == null ? (
                                '—'
                              ) : (
                                <Tonnes
                                  tons={row.stock_tons}
                                  weighed={row.weighed}
                                  sub={row.stock_qty ? `${whole(row.stock_qty)} pcs` : null}
                                />
                              )}
                            </Td>
                          </tr>
                          {openSku === row.item_code && (
                            <tr className="border-b bg-violet-500/[0.03]">
                              <td colSpan={columns} className="px-4 py-3">
                                <SkuWarehouses row={row} />
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
