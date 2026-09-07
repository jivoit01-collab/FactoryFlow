/**
 * "We want to make this. Can we?"
 *
 * The plan-driven screen answers what stock allows for the day the SAP plan
 * describes. This one answers the same question for a run somebody names
 * themselves: pick the finished goods, type the quantities, get a verdict — and
 * when stock cannot cover it, the quantity of each product that actually can be
 * made.
 *
 * Three numbers per product, and the page is mostly about keeping them apart:
 *
 *   Asked        what was typed in, in the item's own SAP unit (pieces).
 *   Can make     the STANDALONE maximum, if that product had the whole
 *                warehouse to itself. Alternatives to one another — the same
 *                oil and the same caps appear in several rows — so that column
 *                is never totalled.
 *   Will get     its share of one shared pool alongside the other lines. These
 *                DO add up: together they describe a run that could all happen
 *                at once, and it is the only per-product column in this module
 *                that may legitimately be summed.
 *
 * The distinction is not academic. A request can have every single product
 * clearing its own standalone check and still be impossible, because two of
 * them drink the same oil. "Will get" is the column that catches that, and the
 * one the floor should be reading.
 */
import { AlertTriangle, ArrowLeft, CheckCircle2, Plus, Trash2, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useSimulateProducible } from '../api';
import {
  ComponentDemandTable,
  KpiCard,
  KpiRow,
  pickUnit,
  ProductPicker,
  qty,
  qtyPrecise,
  qtyWithUnit,
  toNumber,
  UNIT_LABEL,
  UnitToggle,
  WarehouseScopeNote,
} from '../components';
import { MATERIAL_TYPE_LABEL } from '../constants';
import { usePlanUnit } from '../hooks/usePlanUnit';
import type {
  AllocationPolicy,
  BomItem,
  SimulateItem,
  SimulateResponse,
  StockBasis,
} from '../types';

interface RequestLine {
  /** Stable across re-orders and removals, unlike an index. */
  id: string;
  item?: BomItem;
  /** Kept as raw text so the box can be emptied while it is being retyped. */
  quantity: string;
}

const ALLOCATION_OPTIONS: { value: AllocationPolicy; label: string; hint: string }[] = [
  {
    value: 'PRIORITY',
    label: 'In this order',
    hint: 'The first product gets everything it needs before the next gets a look — whole batches, in the order below.',
  },
  {
    value: 'FAIR_SHARE',
    label: 'Fair share',
    hint: 'Every product is cut back by the same proportion, so none is starved to fill another. Anything left over is then spent down the list.',
  },
];

let nextLineId = 0;
const blankLine = (): RequestLine => ({ id: `line-${nextLineId++}`, quantity: '' });

export default function WhatCanRunPage() {
  const [unit, setUnit] = usePlanUnit();
  const [basis, setBasis] = useState<StockBasis>('ON_HAND');
  const [allocation, setAllocation] = useState<AllocationPolicy>('PRIORITY');
  const [lines, setLines] = useState<RequestLine[]>([blankLine()]);

  const check = useSimulateProducible();
  const result = check.data;

  const ready = lines.filter((line) => line.item && toNumber(line.quantity) > 0);
  const taken = lines.map((line) => line.item?.item_code).filter(Boolean) as string[];

  const update = (id: string, patch: Partial<RequestLine>) =>
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );

  const submit = () =>
    check.mutate({
      lines: ready.map((line) => ({
        item_code: line.item!.item_code,
        quantity: line.quantity,
      })),
      stock_basis: basis,
      allocation,
    });

  /**
   * Rewrite the request to what stock will actually give, so the operator can
   * re-check and see it come back green. This is the loop the screen exists
   * for: ask for what you want, be told what you can have, take it.
   *
   * A product that can get nothing is set to zero and left in place rather than
   * being dropped. Removing a row on somebody's behalf hides the fact that a
   * product they asked for cannot be made at all.
   */
  const applySuggestion = () => {
    if (!result) return;
    const achievable = new Map(
      result.items.map((item) => [item.item_code, item.achievable_qty]),
    );
    setLines((current) =>
      current.map((line) => {
        const suggested = line.item ? achievable.get(line.item.item_code) : undefined;
        return suggested === undefined || suggested === null
          ? line
          : { ...line, quantity: String(toNumber(suggested)) };
      }),
    );
  };

  const canSuggest = Boolean(
    result &&
      !result.meta.request_runs_in_full &&
      result.items.some((item) => item.achievable_qty !== null),
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="What can we run"
        description="Name the products and quantities you want to make, and see whether the raw and packing material on hand covers it."
      >
        <div className="flex flex-wrap items-center gap-2">
          <UnitToggle unit={unit} onChange={setUnit} compact />
          <Button asChild variant="ghost" size="sm">
            <Link to="/planning-purchase">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Plans
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            {lines.map((line, index) => {
              const perCase = line.item?.pieces_per_case ?? 1;
              const quantity = toNumber(line.quantity);
              return (
                <div key={line.id} className="flex flex-wrap items-start gap-2">
                  <span className="mt-2.5 w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {index + 1}.
                  </span>

                  <div className="min-w-[16rem] flex-1">
                    <ProductPicker
                      value={line.item?.item_code ?? ''}
                      itemName={line.item?.item_name}
                      taken={taken}
                      onSelect={(item) => update(line.id, { item })}
                    />
                  </div>

                  <div className="w-40">
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(event) =>
                        update(line.id, { quantity: event.target.value })
                      }
                      placeholder="Quantity"
                      className="h-9 text-right font-mono tabular-nums"
                    />
                    {/* Pieces, not cases -- and the case figure alongside it,
                        because the floor speaks in cases and a quantity typed
                        in them would ask for a twentieth of the run. */}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {line.item?.uom || 'Pcs'}
                      {perCase > 1 && quantity > 0
                        ? ` · ${qtyPrecise(quantity / perCase)} cases`
                        : perCase > 1
                          ? ` · ${perCase} per case`
                          : ''}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lines.length === 1 && !line.item}
                    onClick={() =>
                      setLines((current) =>
                        current.length === 1
                          ? [blankLine()]
                          : current.filter((row) => row.id !== line.id),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, blankLine()])}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add product
          </Button>

          <div className="flex flex-wrap items-start gap-6 border-t pt-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                When there is not enough to go round
              </p>
              <div className="flex gap-1">
                {ALLOCATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAllocation(option.value)}
                    className={cn(
                      'rounded border px-3 py-1.5 text-xs transition-colors',
                      allocation === option.value
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                {ALLOCATION_OPTIONS.find((option) => option.value === allocation)?.hint}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Stock basis
              </p>
              <div className="flex gap-1">
                {(
                  [
                    { value: 'ON_HAND' as const, label: 'On hand' },
                    { value: 'FREE' as const, label: 'Free (less committed)' },
                  ]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBasis(option.value)}
                    className={cn(
                      'rounded border px-3 py-1.5 text-xs transition-colors',
                      basis === option.value
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
                {basis === 'ON_HAND'
                  ? 'What is physically in the building, so what can physically be run.'
                  : 'Nets off what SAP has reserved against other documents. Most components here are over-committed, so this reads pessimistically.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button onClick={submit} disabled={!ready.length || check.isPending}>
              {check.isPending ? 'Checking stock…' : 'Check stock'}
            </Button>
            {canSuggest ? (
              <Button variant="outline" onClick={applySuggestion}>
                <Wand2 className="mr-1.5 h-4 w-4" />
                Use the quantities that fit
              </Button>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {ready.length
                ? `${ready.length} product${ready.length === 1 ? '' : 's'} ready to check`
                : 'Pick a product and type a quantity.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {check.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-5">
            <p className="text-sm text-destructive">
              {getErrorMessage(check.error, 'Could not work out what can be made.')}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {result ? <RunAnswer result={result} unit={unit} /> : null}
    </div>
  );
}

/** The verdict, the split, and the materials behind it. */
function RunAnswer({ result, unit }: { result: SimulateResponse; unit: 'LITRES' | 'PIECES' | 'CASES' }) {
  const { items, components, meta } = result;

  const verdict = useMemo(() => {
    if (meta.request_runs_in_full) {
      return meta.fully_checked
        ? 'Yes — everything asked for can be made from stock on hand.'
        : 'Everything that could be checked can be made from stock on hand.';
    }
    return `${meta.short_item_count} of ${meta.answerable_item_count} products cannot be made in the quantity asked for.`;
  }, [meta]);

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          meta.request_runs_in_full ? 'border-emerald-500/40' : 'border-amber-500/40',
        )}
      >
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-5">
          {meta.request_runs_in_full ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-semibold">{verdict}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {meta.runnable_item_count} of {meta.answerable_item_count} run in full ·{' '}
              {meta.blocking_component_count} of {meta.component_count} materials short
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Anything that could not be checked, said plainly. A confident verdict
          over an unchecked product is the failure that matters most here. */}
      {!meta.fully_checked ? (
        <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs">
          {meta.unknown_item_codes.length ? (
            <p>
              SAP does not know{' '}
              <span className="font-mono">{meta.unknown_item_codes.join(', ')}</span>, so
              nothing was checked for {meta.unknown_item_codes.length === 1 ? 'it' : 'them'}.
            </p>
          ) : null}
          {meta.item_without_bom_count ? (
            <p>
              {meta.item_without_bom_count} product
              {meta.item_without_bom_count === 1 ? ' has' : 's have'} no bill of materials
              in SAP. There is no answer for {meta.item_without_bom_count === 1 ? 'it' : 'them'} —
              which is not the same as being out of material.
            </p>
          ) : null}
        </div>
      ) : null}

      {meta.merged_item_codes.length ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-mono">{meta.merged_item_codes.join(', ')}</span> was
          asked for more than once, so the quantities were added into one line each.
        </p>
      ) : null}

      <KpiRow>
        <KpiCard
          label="Asked for"
          value={qtyWithUnit(meta.requested_litres, 'LITRES')}
          hint={`${meta.item_count} product${meta.item_count === 1 ? '' : 's'}`}
        />
        <KpiCard
          label="Can be made"
          value={qtyWithUnit(meta.achievable_litres, 'LITRES')}
          hint={`${meta.achievable_pct}% of the request`}
          tone={meta.request_runs_in_full ? 'ok' : 'warning'}
        />
        <KpiCard
          label="Short of the ask"
          value={String(meta.short_item_count)}
          hint="products"
          tone={meta.short_item_count > 0 ? 'critical' : 'neutral'}
        />
        <KpiCard
          label="Materials short"
          value={String(meta.blocking_component_count)}
          hint={`of ${meta.component_count}`}
          tone={meta.blocking_component_count > 0 ? 'warning' : 'neutral'}
        />
      </KpiRow>

      {meta.over_committed_component_count > 0 && meta.stock_basis === 'ON_HAND' ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {meta.over_committed_component_count} material
          {meta.over_committed_component_count === 1 ? ' has' : 's have'} more stock
          committed in SAP than is physically on hand. These figures count what is in
          the building, so that reserved quantity is <strong>not</strong> deducted.
        </p>
      ) : null}

      <RequestTable rows={items} unit={unit} />

      <ComponentDemandTable
        rows={components}
        caption="What this run consumes, added across every product that draws on each material. A shortage here blocks every product listed against it."
      />

      <div className="space-y-1 text-xs text-muted-foreground">
        {meta.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <WarehouseScopeNote
          scope={meta.warehouse_scope}
          filtered={meta.warehouse_filtered}
          excluded={meta.excluded_warehouses}
        />
      </div>
    </div>
  );
}

/**
 * Per product: what was asked, what it will get, and what stopped it.
 *
 * "Will get" is deliberately the emphasised column and the one with a footer.
 * It is the additive answer — one shared pool of stock — so unlike the
 * standalone maxima beside it, the total is real.
 */
function RequestTable({
  rows,
  unit,
}: {
  rows: SimulateItem[];
  unit: 'LITRES' | 'PIECES' | 'CASES';
}) {
  const pick = (
    row: SimulateItem,
    field: 'requested' | 'buildable' | 'achievable',
  ): number | null => {
    const source =
      field === 'requested'
        ? { pieces: row.requested_qty, litres: row.requested_litres, cases: row.requested_cases }
        : field === 'buildable'
          ? { pieces: row.buildable_qty, litres: row.buildable_litres, cases: row.buildable_cases }
          : {
              pieces: row.achievable_qty,
              litres: row.achievable_litres,
              cases: row.achievable_cases,
            };
    const value = pickUnit(source, unit);
    return value === null || value === undefined ? null : toNumber(value);
  };

  const totalAchievable = rows.reduce(
    (running, row) => running + (pick(row, 'achievable') ?? 0),
    0,
  );

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">
                Asked ({UNIT_LABEL[unit]})
              </th>
              <th className="px-3 py-2 text-right font-medium">
                Will get ({UNIT_LABEL[unit]})
              </th>
              <th className="px-3 py-2 text-right font-medium">Short by</th>
              <th className="px-3 py-2 text-left font-medium">Held up by</th>
              <th
                className="px-3 py-2 text-right font-medium"
                title="If this product had the whole warehouse to itself. Alternatives to one another, so never totalled."
              >
                Alone, could make
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const asked = pick(row, 'requested') ?? 0;
              const willGet = pick(row, 'achievable');
              const alone = pick(row, 'buildable');
              const limiter = row.allocation_limited_by_detail;
              // Standalone it fits, but allocated it does not: somebody else on
              // this request is drinking its material. Worth calling out --
              // it is the case the standalone column alone would get wrong.
              const lostToOthers =
                row.runs_in_full === false && alone !== null && alone >= asked;

              return (
                <tr key={row.item_code} className="border-t align-top">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{row.item_code}</span>
                    <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {row.item_name}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {qtyWithUnit(asked, unit)}
                  </td>

                  <td
                    className={cn(
                      'px-3 py-2 text-right font-mono font-semibold tabular-nums',
                      row.runs_in_full === false ? 'text-destructive' : '',
                      row.runs_in_full === true
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : '',
                    )}
                  >
                    {willGet === null ? (
                      <span
                        className="font-normal text-amber-600 dark:text-amber-400"
                        title="SAP has no production BOM for this item, so there is no answer — which is different from being out of material."
                      >
                        no BOM
                      </span>
                    ) : (
                      qtyWithUnit(willGet, unit)
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {row.runs_in_full === false ? (
                      <span className="text-destructive">
                        {qty(row.unmet_qty)} {row.uom}
                      </span>
                    ) : row.runs_in_full === true ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        all of it
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {limiter ? (
                      <>
                        <span className="font-mono text-xs">{limiter.component_code}</span>
                        <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {limiter.component_name || '—'} ·{' '}
                          {MATERIAL_TYPE_LABEL[limiter.material_type] ??
                            limiter.material_type}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {qtyPrecise(limiter.remaining_qty)} {limiter.uom} left,{' '}
                          {qtyPrecise(limiter.qty_per_unit)} per piece
                        </div>
                        {lostToOthers ? (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400">
                            enough on its own — another product on this list took it
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                    {alone === null ? '—' : qtyWithUnit(alone, unit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 bg-muted/30 text-xs">
            <tr>
              <td className="px-3 py-2 font-medium">
                Total the floor would actually make
              </td>
              <td />
              <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                {qtyWithUnit(totalAchievable, unit)}
              </td>
              <td colSpan={3} className="px-3 py-2 text-muted-foreground">
                One shared pool of stock, so this column — unlike the last one — adds up.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
