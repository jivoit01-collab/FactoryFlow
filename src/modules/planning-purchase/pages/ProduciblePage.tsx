/**
 * What the floor can actually build from the stock on hand.
 *
 * Two answers, deliberately in two tables that are never added together:
 *
 *   Per SKU    the standalone maximum for each product if it had the warehouse
 *              to itself. These are ALTERNATIVES to one another — the same caps
 *              appear in several of them — so the page never totals the column
 *              and every row names what limits it.
 *
 *   Per part   the additive answer: what the whole day's planned mix consumes
 *              against stock, and which components block it.
 *
 * Stock is on-hand by default rather than free stock. On this company most
 * components are over-committed, so netting off reservations reports a factory
 * that shipped a million pieces this month as able to make nothing.
 */
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useProducible } from '../api';
import {
  KpiCard,
  KpiRow,
  pickUnit,
  qty,
  qtyPrecise,
  qtyWithUnit,
  shortDate,
  toNumber,
  UNIT_LABEL,
  UnitToggle,
  WarehouseScopeNote,
} from '../components';
import { MATERIAL_TYPE_LABEL } from '../constants';
import { usePlanUnit } from '../hooks/usePlanUnit';
import type { ProducibleComponent, ProducibleSku, StockBasis } from '../types';

type Tab = 'skus' | 'components';

type Focus = 'NONE' | 'PLANNED' | 'RUNNABLE' | 'AT_RISK' | 'BLOCKING';

const FOCUS_LABELS: Record<Exclude<Focus, 'NONE'>, string> = {
  PLANNED: 'Planned this day',
  RUNNABLE: 'Runs in full',
  AT_RISK: 'At risk',
  BLOCKING: 'Blocking materials',
};

export default function ProduciblePage() {
  const { planId } = useParams<{ planId: string }>();
  const absId = Number(planId);

  const [unit, setUnit] = usePlanUnit();
  const [basis, setBasis] = useState<StockBasis>('ON_HAND');
  const [targetDate, setTargetDate] = useState('');
  const [tab, setTab] = useState<Tab>('skus');
  const [search, setSearch] = useState('');
  // Which headline card is driving the table. One at a time, and clicking the
  // active one clears -- a filter you cannot undo is worse than none.
  const [focus, setFocus] = useState<Focus>('NONE');

  const filters = useMemo(
    () => ({ stock_basis: basis, target_date: targetDate || undefined }),
    [basis, targetDate],
  );
  const query = useProducible(absId || undefined, filters);

  if (query.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <DashboardHeader
          title="What can run"
          description="Checking every bill of materials against stock on hand…"
        />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <DashboardHeader title="What can run" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">
              {getErrorMessage(query.error, 'Could not work out what can be built.')}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/planning-purchase">Back to plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { plan, meta, skus, components } = query.data;
  const token = search.trim().toLowerCase();

  const applyFocus = (next: Focus, targetTab: Tab) => {
    setFocus(next);
    if (next !== 'NONE') setTab(targetTab);
  };

  const focusedSkus = skus.filter((row) => {
    if (focus === 'PLANNED') return toNumber(row.planned_qty) > 0;
    if (focus === 'RUNNABLE') return row.covers_plan === true;
    if (focus === 'AT_RISK') return row.covers_plan === false;
    return true;
  });

  const skuRows = token
    ? focusedSkus.filter(
        (row) =>
          row.item_code.toLowerCase().includes(token) ||
          row.item_name.toLowerCase().includes(token),
      )
    : focusedSkus;

  const focusedComponents =
    focus === 'BLOCKING' ? components.filter((row) => row.is_blocking) : components;

  const componentRows = token
    ? focusedComponents.filter(
        (row) =>
          row.component_code.toLowerCase().includes(token) ||
          row.component_name.toLowerCase().includes(token),
      )
    : focusedComponents;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="What can run"
        description={`${plan.code || `Plan ${plan.abs_id}`} — what stock on hand allows on ${shortDate(meta.target_date)}.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <UnitToggle unit={unit} onChange={setUnit} compact />
          <Button asChild variant="ghost" size="sm">
            <Link to={`/planning-purchase/plans/${plan.abs_id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Plan
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', query.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      {/* The verdict for the day, in one line. */}
      <Card
        className={cn(
          meta.plan_runs_in_full ? 'border-emerald-500/40' : 'border-amber-500/40',
        )}
      >
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-5">
          {meta.plan_runs_in_full ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {meta.plan_runs_in_full
                ? `Everything planned for ${shortDate(meta.target_date)} can be made from stock.`
                : `${meta.blocked_sku_count} of ${meta.planned_sku_count} planned SKUs cannot be made in full.`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {meta.runnable_sku_count} of {meta.planned_sku_count} run in full ·{' '}
              {meta.blocking_component_count} of {meta.component_count} components short
            </p>
          </div>
        </CardContent>
      </Card>

      <KpiRow>
        <KpiCard
          label={`Planned for ${shortDate(meta.target_date)}`}
          value={qtyWithUnit(meta.planned_litres, 'LITRES')}
          hint={`${meta.planned_sku_count} SKUs`}
          active={focus === 'PLANNED'}
          drillLabel="Show every product planned for this day"
          onClick={
            meta.planned_sku_count
              ? () => applyFocus(focus === 'PLANNED' ? 'NONE' : 'PLANNED', 'skus')
              : undefined
          }
        />
        <KpiCard
          label="Runs in full"
          value={String(meta.runnable_sku_count)}
          hint="SKUs"
          tone={meta.runnable_sku_count > 0 ? 'ok' : 'neutral'}
          active={focus === 'RUNNABLE'}
          drillLabel="Show the products stock can cover in full"
          onClick={
            meta.runnable_sku_count
              ? () => applyFocus(focus === 'RUNNABLE' ? 'NONE' : 'RUNNABLE', 'skus')
              : undefined
          }
        />
        <KpiCard
          label="At risk"
          value={qtyWithUnit(meta.at_risk_litres, 'LITRES')}
          hint={`${meta.at_risk_pct}% of the day`}
          tone={toNumber(meta.at_risk_litres) > 0 ? 'critical' : 'neutral'}
          active={focus === 'AT_RISK'}
          drillLabel="Show the products that cannot be made in full"
          onClick={
            meta.blocked_sku_count
              ? () => applyFocus(focus === 'AT_RISK' ? 'NONE' : 'AT_RISK', 'skus')
              : undefined
          }
        />
        <KpiCard
          label="Components short"
          value={String(meta.blocking_component_count)}
          hint={`of ${meta.component_count}`}
          tone={meta.blocking_component_count > 0 ? 'warning' : 'neutral'}
          active={focus === 'BLOCKING'}
          drillLabel="Show the materials blocking the day, on the material tab"
          onClick={
            meta.blocking_component_count
              ? () =>
                  applyFocus(focus === 'BLOCKING' ? 'NONE' : 'BLOCKING', 'components')
              : undefined
          }
        />
      </KpiRow>

      {meta.over_committed_component_count > 0 && basis === 'ON_HAND' ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {meta.over_committed_component_count} component
          {meta.over_committed_component_count === 1 ? ' has' : 's have'} more stock
          committed in SAP than is physically on hand. These figures count what is in
          the building, so that reserved quantity is <strong>not</strong> deducted —
          switch to free stock below to see the effect.
        </p>
      ) : null}

      {/* Controls. Date and basis change the answer, so they sit above the table
          rather than behind a menu. */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Day</p>
          <Input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="h-9 w-40"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Blank = next working day
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Stock basis</p>
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

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search code or name"
          className="h-9 max-w-xs"
        />
      </div>

      <div className="flex gap-1">
        {(
          [
            { key: 'skus' as const, label: 'By product', count: skus.length },
            {
              key: 'components' as const,
              label: 'By material',
              count: components.length,
            },
          ]
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTab(option.key)}
            className={cn(
              'rounded border px-3 py-1.5 text-xs transition-colors',
              tab === option.key
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
            <span className="ml-1.5 tabular-nums opacity-60">{option.count}</span>
          </button>
        ))}
      </div>

      {focus !== 'NONE' ? (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFocus('NONE')}
            className="rounded border border-primary bg-primary/10 px-2 py-1 text-primary"
          >
            {FOCUS_LABELS[focus as Exclude<Focus, 'NONE'>]} ×
          </button>
          <span className="text-muted-foreground">
            showing {tab === 'skus' ? skuRows.length : componentRows.length} of{' '}
            {tab === 'skus' ? skus.length : components.length}
          </span>
        </div>
      ) : null}

      {tab === 'skus' ? (
        <SkuTable rows={skuRows} unit={unit} targetDate={meta.target_date} />
      ) : (
        <ComponentTable rows={componentRows} />
      )}

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

/** Per SKU: the standalone maximum, and what caps it. Never totalled. */
function SkuTable({
  rows,
  unit,
  targetDate,
}: {
  rows: ProducibleSku[];
  unit: 'LITRES' | 'PIECES' | 'CASES';
  targetDate: string;
}) {
  return (
    <div className="space-y-2">
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Each figure assumes that product gets the <strong>whole</strong> warehouse.
        They are alternatives to one another — the same caps and oil appear in
        several rows — so this column is deliberately not totalled.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">
                Planned {shortDate(targetDate)}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                Can build ({UNIT_LABEL[unit]})
              </th>
              <th className="px-3 py-2 text-left font-medium">Limited by</th>
              <th className="px-3 py-2 text-right font-medium">Shortfall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const planned = toNumber(
                pickUnit(
                  {
                    pieces: row.planned_qty,
                    litres: row.planned_litres,
                    cases: row.planned_cases,
                  },
                  unit,
                ),
              );
              const buildable = row.has_bom
                ? toNumber(
                    pickUnit(
                      {
                        pieces: row.buildable_qty,
                        litres: row.buildable_litres,
                        cases: row.buildable_cases,
                      },
                      unit,
                    ),
                  )
                : null;
              const limiter = row.limited_by_detail;

              return (
                <tr key={row.item_code} className="border-t align-top">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{row.item_code}</span>
                    <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {row.item_name}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {planned > 0 ? (
                      qtyWithUnit(planned, unit)
                    ) : (
                      <span className="text-muted-foreground">not planned</span>
                    )}
                  </td>

                  <td
                    className={cn(
                      'px-3 py-2 text-right font-mono font-semibold tabular-nums',
                      row.covers_plan === false ? 'text-destructive' : '',
                    )}
                  >
                    {buildable === null ? (
                      <span
                        className="font-normal text-amber-600 dark:text-amber-400"
                        title="SAP has no production BOM for this item, so there is no answer — which is different from being out of material."
                      >
                        no BOM
                      </span>
                    ) : (
                      qtyWithUnit(buildable, unit)
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
                          {qty(limiter.available_qty)} {limiter.uom} available,{' '}
                          {qtyPrecise(limiter.qty_per_unit)} per piece
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {row.covers_plan === false ? (
                      <span className="text-destructive">
                        {qty(row.shortfall_qty)} {row.uom}
                      </span>
                    ) : row.covers_plan ? (
                      <span className="text-emerald-600 dark:text-emerald-400">covered</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Nothing matches that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Per material: what the day's whole planned mix needs. Additive, so exact. */
function ComponentTable({ rows }: { rows: ProducibleComponent[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        This is the additive answer: what the whole day&apos;s planned mix consumes,
        added across every product that draws on each material. A shortage here
        blocks every product listed against it.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Material</th>
              <th className="px-3 py-2 text-right font-medium">Needed</th>
              <th className="px-3 py-2 text-right font-medium">On hand</th>
              <th className="px-3 py-2 text-right font-medium">Committed</th>
              <th className="px-3 py-2 text-right font-medium">Short</th>
              <th className="px-3 py-2 text-right font-medium">Covers</th>
              <th className="px-3 py-2 text-right font-medium">Used by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = open === row.component_code;
              const coverage = toNumber(row.coverage_pct);
              return (
                <>
                  <tr
                    key={row.component_code}
                    className={cn('border-t', row.is_blocking ? '' : 'text-muted-foreground')}
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs">{row.component_code}</span>
                      <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {row.component_name || '—'} ·{' '}
                        {MATERIAL_TYPE_LABEL[row.material_type] ?? row.material_type}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {qtyPrecise(row.needed_qty)}
                      <span className="ml-1 text-[10px] text-muted-foreground">{row.uom}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {qty(row.on_hand_qty)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {qty(row.committed_qty)}
                      {row.over_committed ? (
                        <div
                          className="text-[10px] text-amber-600 dark:text-amber-400"
                          title="More is reserved in SAP than is physically on hand."
                        >
                          over-committed
                        </div>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right font-mono font-semibold tabular-nums',
                        row.is_blocking ? 'text-destructive' : '',
                      )}
                    >
                      {row.is_blocking ? qty(row.shortage_qty) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'font-mono text-xs font-semibold tabular-nums',
                          coverage >= 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : coverage >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-destructive',
                        )}
                      >
                        {coverage >= 100 ? '100' : row.coverage_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : row.component_code)}
                        className="text-xs text-primary hover:underline"
                      >
                        {row.drawn_by.length} product
                        {row.drawn_by.length === 1 ? '' : 's'}
                      </button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr key={`${row.component_code}-detail`} className="border-t bg-muted/30">
                      <td colSpan={7} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-muted-foreground">
                            <tr>
                              <th className="py-1 text-left font-medium">Product</th>
                              <th className="py-1 text-right font-medium">Planned</th>
                              <th className="py-1 text-right font-medium">Per piece</th>
                              <th className="py-1 text-right font-medium">Needs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.drawn_by.map((draw) => (
                              <tr key={draw.item_code} className="border-t">
                                <td className="py-1.5">
                                  <span className="font-mono">{draw.item_code}</span>
                                  <span className="ml-2 text-muted-foreground">
                                    {draw.item_name}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums">
                                  {qty(draw.planned_qty)} Pcs
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums">
                                  {qtyPrecise(draw.qty_per_unit)}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums">
                                  {qtyPrecise(draw.needed_qty)} {row.uom}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}

            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Nothing matches that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
