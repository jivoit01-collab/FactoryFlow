import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Button, Input } from '@/shared/components/ui';
import { useTheme } from '@/shared/contexts';
import { cn, getErrorMessage } from '@/shared/utils';

import { useFillingCostBoard } from '../api';
import { FILLING_COST_SHEET_ROUTE } from '../constants';
import type { FillingCostBoard, FillingCostHeadRow, FillingCostSku } from '../types';
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

function skuText(skus: FillingCostSku[]) {
  return skus.length ? [...new Set(skus.map((sku) => sku.sku || sku.product))].join(', ') : '—';
}

function boxText(skus: FillingCostSku[]) {
  const sizes = [...new Set(skus.map((sku) => sku.pieces_per_case).filter(Boolean))];
  return sizes.length ? `${sizes.join(' / ')} PCS` : '—';
}

/** A two-column label row at the top of the sheet. */
function InfoRow({ label, value, unit = '' }: { label: string; value: string; unit?: string }) {
  return (
    <tr className="border-b">
      <td className="px-3 py-1.5 font-medium">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{value}</td>
      <td className="px-3 py-1.5 text-muted-foreground">{unit}</td>
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
  const shift = scope ? day?.shifts.find((s) => s.shift === scope) : undefined;
  const view = shift ?? day;
  const heads = shift ? shift.heads : (day?.sheet_heads ?? []);
  const skus = shift ? shift.skus : (day?.skus ?? []);
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

      {isLoading ? (
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
              </thead>
              <tbody>
                <InfoRow label="DATE" value={String(Number(date.slice(8)))} unit="PER BOX" />
                <InfoRow label="SKU" value={skuText(skus)} />
                <InfoRow label="BOX SIZE" value={boxText(skus)} />
                <InfoRow label="PRODUCTION" value={count(view.cases)} unit="BOXES" />
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

      {data && data.days.length > 0 && (
        <DayByDay board={data} selected={date} onPick={onDateChange} />
      )}
    </section>
  );
}

/** '2026-09-28' → '28 Sep, Mon'. */
function shortDay(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}, ${d.toLocaleDateString('en-IN', { weekday: 'short' })}`;
}

/**
 * The month's cost a day: every day a sheet was saved for, with the month's
 * total under it. Picking a day opens its sheet above, when the panel owns
 * the day.
 */
function DayByDay({
  board,
  selected,
  onPick,
}: {
  board: FillingCostBoard;
  selected: string;
  onPick?: (date: string) => void;
}) {
  const month = new Date(`${board.month}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-medium">
        Day by day — {month}{' '}
        <span className="font-normal text-muted-foreground">
          ({board.days_entered} of {board.days_in_month} days entered)
        </span>
      </p>
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
