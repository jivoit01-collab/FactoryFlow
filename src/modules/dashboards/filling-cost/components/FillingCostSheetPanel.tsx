import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useFillingCostDefaults } from '@/modules/production/execution/api';
import type { FillingCostDefaults } from '@/modules/production/execution/types';
import { Button, Input } from '@/shared/components/ui';
import { useTheme } from '@/shared/contexts';
import { cn, getErrorMessage } from '@/shared/utils';

import { useFillingCostBoard } from '../api';
import { FILLING_COST_SHEET_ROUTE } from '../constants';
import type {
  FillingCostBoard,
  FillingCostFigures,
  FillingCostHeadRow,
  FillingCostSku,
} from '../types';
import { count, longDay, rate, rupees } from '../utils/format';

/**
 * One colour per head, fixed to the head rather than to its size, so
 * Electricity is the same blue on every day it is shown. Validated as a
 * categorical set for both themes; anything else folds into "Other".
 */
const HEAD_COLOURS: Record<string, { light: string; dark: string }> = {
  Electricity: { light: '#2a78d6', dark: '#3987e5' },
  'Fixed Manpower': { light: '#eb6834', dark: '#d95926' },
  Maintenance: { light: '#1baf7a', dark: '#199e70' },
  'Batch Coding': { light: '#eda100', dark: '#c98500' },
  Lubrication: { light: '#e87ba4', dark: '#d55181' },
  Lab: { light: '#008300', dark: '#008300' },
  Miscellaneous: { light: '#4a3aa7', dark: '#9085e9' },
  Wastage: { light: '#e34948', dark: '#e66767' },
};
const OTHER = { light: '#9a9a93', dark: '#7a7a74' };

type Scope = '' | 'DAY' | 'NIGHT';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface Slice {
  head: string;
  amount: number;
  colour: string;
}

/** The pie's slices: every head that cost something, the rest as "Other". */
function slices(heads: FillingCostHeadRow[], theme: 'light' | 'dark'): Slice[] {
  const named: Slice[] = [];
  let other = 0;
  heads.forEach((row) => {
    const amount = Number(row.amount);
    if (!(amount > 0)) return; // a credit such as scrap is taken off, not a slice
    const colour = HEAD_COLOURS[row.head];
    if (colour) named.push({ head: row.head, amount, colour: colour[theme] });
    else other += amount;
  });
  if (other > 0) named.push({ head: 'Other', amount: other, colour: OTHER[theme] });
  return named;
}

/** Heads the dashboard counts as maintenance: the AMC and servicing contracts. */
const MAINTENANCE_PART = /^(AMC|SERVICING COST)\b/i;

const plus = (a: string | null, b: string | null, places: number) =>
  a == null && b == null ? null : (Number(a ?? 0) + Number(b ?? 0)).toFixed(places);

/**
 * The heads with AMC and servicing cost added into Maintenance, which takes
 * the place of whichever of them comes first. The total is unchanged.
 */
function foldMaintenance(heads: FillingCostHeadRow[]): FillingCostHeadRow[] {
  if (!heads.some((row) => MAINTENANCE_PART.test(row.head))) return heads;
  const out: FillingCostHeadRow[] = [];
  let maintenance: FillingCostHeadRow | null = null;
  heads.forEach((row) => {
    const isPart = MAINTENANCE_PART.test(row.head);
    if (!isPart && row.head !== 'Maintenance') {
      out.push(row);
      return;
    }
    if (!maintenance) {
      maintenance = { ...row, head: 'Maintenance' };
      out.push(maintenance);
      return;
    }
    maintenance.amount = plus(maintenance.amount, row.amount, 2) as string;
    maintenance.share = plus(maintenance.share, row.share, 2);
    maintenance.per_case = plus(maintenance.per_case, row.per_case, 2);
    maintenance.per_bottle = plus(maintenance.per_bottle, row.per_bottle, 4);
  });
  return out;
}

function skuText(skus: FillingCostSku[]) {
  return skus.length ? [...new Set(skus.map((sku) => sku.sku || sku.product))].join(', ') : '—';
}

function boxText(skus: FillingCostSku[]) {
  const sizes = [...new Set(skus.map((sku) => sku.pieces_per_case).filter(Boolean))];
  return sizes.length ? `${sizes.join(' / ')} PCS` : '—';
}

const ratio = (amount: number, over: number, places: number) =>
  over > 0 ? (amount / over).toFixed(places) : null;

/**
 * A day nobody has saved, as the Filling Cost page opens it: the cases its
 * runs produced and each head worked out from them. Null when the runs made
 * nothing and no head costs anything — a day with nothing to show.
 */
function workedOut(defaults: FillingCostDefaults | undefined) {
  if (!defaults) return null;
  const cases = Number(defaults.produced_cases);
  const bottles = Number(defaults.bottles);
  const priced = defaults.entries.filter((entry) => entry.amount !== null);
  const total = priced.reduce((sum, entry) => sum + Number(entry.amount), 0);
  if (!(cases > 0) && total === 0) return null;
  const heads: FillingCostHeadRow[] = priced.map((entry) => ({
    head: entry.head,
    amount: entry.amount as string,
    share: null,
    per_case: ratio(Number(entry.amount), cases, 2),
    per_bottle: ratio(Number(entry.amount), bottles, 4),
  }));
  const view: FillingCostFigures = {
    cases: defaults.produced_cases,
    bottles: defaults.bottles,
    total: total.toFixed(2),
    per_case: ratio(total, cases, 2),
    per_bottle: ratio(total, bottles, 4),
  };
  return { view, heads, skus: defaults.skus as FillingCostSku[], warnings: defaults.warnings };
}

/** A two-column label row at the top of the sheet. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b">
      <td className="px-3 py-1.5 font-medium">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{value}</td>
      <td />
    </tr>
  );
}

/**
 * Beverages' filling cost for one day, written the way the factory writes the
 * sheet — date, SKU, box size and production, then each head with its rupees
 * and its rupees a box, down to the total — with a pie of where it went.
 *
 * `date` is the day to show; a shift picker appears once the day was kept by
 * shift, as the sheet is written for one shift at a time.
 */
export function FillingCostSheetPanel({
  date,
  onDateChange,
}: {
  date: string;
  /** Given, the panel offers a date picker; without it, the day is the caller's. */
  onDateChange?: (date: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [scope, setScope] = useState<Scope>('');
  const { data, isLoading, isError, error } = useFillingCostBoard(date.slice(0, 7), date);

  const day = data?.day ?? null;
  // No sheet saved for the day: read it as the Filling Cost page does, from
  // the day's runs, rather than show the day blank until someone saves.
  const defaultsQuery = useFillingCostDefaults(date, 'none', '', Boolean(data) && !day);
  const fallback = day ? null : workedOut(defaultsQuery.data);
  const shift = scope ? day?.shifts.find((s) => s.shift === scope) : undefined;
  const view = shift ?? day ?? fallback?.view ?? null;
  const heads = foldMaintenance(shift ? shift.heads : (day?.sheet_heads ?? fallback?.heads ?? []));
  const skus = shift ? shift.skus : (day?.skus ?? fallback?.skus ?? []);
  const pie = slices(heads, theme);
  const pieTotal = pie.reduce((sum, slice) => sum + slice.amount, 0);
  const credits = heads.filter((row) => Number(row.amount) < 0);
  const title = shift ? `${shift.shift === 'NIGHT' ? 'Night' : 'Day'} shift` : 'Whole day';

  return (
    <section
      aria-label="Filling cost"
      className="rounded-3xl border border-black/[0.09] bg-card p-4 dark:border-white/10"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Filling Cost</h2>
          <p className="text-sm text-muted-foreground">{longDay(date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDateChange && (
            <Input
              type="date"
              aria-label="Date"
              className="w-40"
              value={date}
              max={todayISO()}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
            />
          )}
          {day && day.shifts.length > 0 && (
            <div className="flex rounded-lg border p-0.5" role="group" aria-label="Shift">
              {(['', ...day.shifts.map((s) => s.shift)] as Scope[]).map((option) => (
                <button
                  key={option || 'WHOLE'}
                  type="button"
                  aria-pressed={scope === option}
                  onClick={() => setScope(option)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    scope === option
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option === '' ? 'Whole day' : option === 'DAY' ? 'Day' : 'Night'}
                </button>
              ))}
            </div>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={FILLING_COST_SHEET_ROUTE}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Sheet
            </Link>
          </Button>
        </div>
      </div>

      {data && data.days.length > 0 && (
        <DayByDay board={data} selected={date} theme={theme} onPick={onDateChange} />
      )}

      {fallback && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Not saved yet — worked out from the day's runs, as the Filling Cost page shows it.
          {fallback.warnings.map((warning) => (
            <span key={warning} className="mt-1 block">
              {warning}
            </span>
          ))}
        </div>
      )}

      {isLoading || (!day && defaultsQuery.isLoading) ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
      ) : isError && !data ? (
        <p className="py-10 text-center text-sm text-destructive">
          {getErrorMessage(error, 'The filling cost sheet could not be loaded.')}
        </p>
      ) : !view ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No filling cost sheet saved for this day yet.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th colSpan={3} className="px-3 py-2 text-center font-semibold uppercase">
                    {title}
                  </th>
                </tr>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th />
                  <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Per box</th>
                </tr>
              </thead>
              <tbody>
                <InfoRow label="DATE" value={String(Number(date.slice(8)))} />
                <InfoRow label="SKU" value={skuText(skus)} />
                <InfoRow label="BOX SIZE" value={boxText(skus)} />
                <tr className="border-b">
                  <td className="px-3 py-1.5 font-medium">PRODUCTION</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    <span>{count(view.cases)}</span>{' '}
                    <span className="text-xs text-muted-foreground">boxes</span>
                  </td>
                  <td />
                </tr>
                {heads.map((row) => (
                  <tr key={row.head} className="border-b">
                    <td className="px-3 py-1.5 uppercase">{row.head}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {rupees(row.amount)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {rate(row.per_case)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b bg-muted/50 font-semibold">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {rupees(view.total)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {rate(view.per_case)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="px-3 py-2">PER BOTTLE</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums" colSpan={2}>
                    {rate(view.per_bottle, 4)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col">
            <p className="mb-2 text-sm font-medium">Where the cost went</p>
            {pie.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No costs entered.</p>
            ) : (
              <div className="grid items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                <div className="h-[200px]" role="img" aria-label="Filling cost by head">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pie}
                        dataKey="amount"
                        nameKey="head"
                        outerRadius="95%"
                        stroke="var(--background, #fff)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {pie.map((slice) => (
                          <Cell key={slice.head} fill={slice.colour} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        formatter={(value, name) => [
                          `${rupees(String(value))} · ${((Number(value) / pieTotal) * 100).toFixed(1)}%`,
                          String(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {pie.map((slice) => (
                    <li key={slice.head} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ background: slice.colour }}
                      />
                      <span className="min-w-0 flex-1 truncate">{slice.head}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {((slice.amount / pieTotal) * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {credits.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {credits.map((row) => `${row.head} ${rupees(row.amount)}`).join(', ')} taken off the
                total, not shown in the pie.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** '2026-09-28' → '28 Sep, Mon'. */
function shortDay(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}, ${d.toLocaleDateString('en-IN', { weekday: 'short' })}`;
}

const BAR = { light: '#2a78d6', dark: '#3987e5' };
const BAR_PICKED = { light: '#eb6834', dark: '#d95926' };

/**
 * The month's cost a box, one bar a calendar day so the days nobody entered
 * show as gaps, with the month's own rate as a line across. Picking a bar
 * opens that day, when the panel owns the day.
 */
function DayByDayChart({
  board,
  selected,
  theme,
  onPick,
}: {
  board: FillingCostBoard;
  selected: string;
  theme: 'light' | 'dark';
  onPick?: (date: string) => void;
}) {
  const byDate = new Map(board.days.map((day) => [day.date, day]));
  const today = todayISO();
  const points = Array.from({ length: board.days_in_month }, (_, i) => {
    const date = `${board.month}-${String(i + 1).padStart(2, '0')}`;
    const day = byDate.get(date);
    return {
      date,
      label: String(i + 1),
      perBox: day?.per_case != null ? Number(day.per_case) : null,
      day,
    };
  }).filter((point) => point.day || point.date <= today);
  const monthRate = board.totals.per_case != null ? Number(board.totals.per_case) : null;

  return (
    <div className="mb-4 h-56" role="img" aria-label="Filling cost a box, day by day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={48}
            tickFormatter={(value) => `₹${value}`}
          />
          {monthRate != null && (
            <ReferenceLine
              y={monthRate}
              stroke={OTHER[theme]}
              strokeDasharray="4 4"
              label={{
                value: `Month ${rate(board.totals.per_case)}`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: OTHER[theme],
              }}
            />
          )}
          <Tooltip
            cursor={{ fillOpacity: 0.06 }}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
            labelFormatter={(_, payload) => {
              const date = payload?.[0]?.payload?.date as string | undefined;
              return date ? shortDay(date) : '';
            }}
            formatter={(_, __, item) => {
              const day = (item.payload as (typeof points)[number]).day;
              return day
                ? [
                    `${rate(day.per_case)} a box · ${count(day.cases)} boxes · ${rupees(day.total)}`,
                    'Cost',
                  ]
                : ['Not entered', 'Cost'];
            }}
          />
          <Bar
            dataKey="perBox"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
            onClick={
              onPick
                ? (point: { payload?: (typeof points)[number] }) => {
                    const date = point.payload?.date;
                    if (date && date !== selected && point.payload?.day) onPick(date);
                  }
                : undefined
            }
            cursor={onPick ? 'pointer' : undefined}
          >
            {points.map((point) => (
              <Cell
                key={point.date}
                fill={point.date === selected ? BAR_PICKED[theme] : BAR[theme]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * The month's cost a day: a chart of the cost a box, then every day a sheet
 * was saved for with the month's total under it. Picking a day opens its
 * sheet below, when the panel owns the day.
 */
function DayByDay({
  board,
  selected,
  theme,
  onPick,
}: {
  board: FillingCostBoard;
  selected: string;
  theme: 'light' | 'dark';
  onPick?: (date: string) => void;
}) {
  const month = new Date(`${board.month}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium">
        Day by day — {month}{' '}
        <span className="font-normal text-muted-foreground">
          ({board.days_entered} of {board.days_in_month} days entered)
        </span>
      </p>
      <DayByDayChart board={board} selected={selected} theme={theme} onPick={onPick} />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm" aria-label="Filling cost day by day">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-right font-semibold">Production (boxes)</th>
              <th className="px-3 py-2 text-right font-semibold">Total cost</th>
              <th className="px-3 py-2 text-right font-semibold">Per box</th>
              <th className="px-3 py-2 text-right font-semibold">Per bottle</th>
            </tr>
          </thead>
          <tbody>
            {board.days.map((day) => {
              const isSelected = day.date === selected;
              return (
                <tr
                  key={day.date}
                  aria-selected={isSelected}
                  onClick={onPick && !isSelected ? () => onPick(day.date) : undefined}
                  className={cn(
                    'border-b',
                    isSelected
                      ? 'bg-primary/10 font-medium'
                      : onPick && 'cursor-pointer hover:bg-muted/40',
                  )}
                >
                  <td className="px-3 py-1.5">{shortDay(day.date)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {count(day.cases)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {rupees(day.total)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {rate(day.per_case)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {rate(day.per_bottle, 4)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/50 font-semibold">
              <td className="px-3 py-2">MONTH</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {count(board.totals.cases)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {rupees(board.totals.total)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {rate(board.totals.per_case)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {rate(board.totals.per_bottle, 4)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
