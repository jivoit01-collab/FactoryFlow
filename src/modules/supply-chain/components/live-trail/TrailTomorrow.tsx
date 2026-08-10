/** What to produce on the next working day.
 *
 * Not the gap. The gap says what is owed; this says what can be *run*, which is
 * a different and much smaller number — a SKU short 230,728 bottles with 51,588
 * on the shelf is a 51,588 run and a purchase order.
 *
 * Component stock is allocated down the priority list rather than checked per
 * SKU, so two SKUs sharing a bottle cannot both be promised it. That is why the
 * order of these rows is part of the answer and not a sort you can change: row 3
 * shows zero precisely because row 1 took the last of them.
 */
import { cn } from '@/shared/utils';

import type { LiveTrail, TomorrowRow } from '../../types';
import { inr, n0, onDate } from './trail-format';
import { TrailPill } from './TrailPill';

const VISIBLE = 12;

export function TrailTomorrow({
  data,
  onOpenSku,
  onOpenComponent,
}: {
  data: LiveTrail;
  onOpenSku: (item: string) => void;
  onOpenComponent: (item: string) => void;
}) {
  const plan = data.tomorrow;
  const runnable = plan.rows.filter((row) => row.planned > 0);
  const blocked = plan.rows.filter((row) => row.planned <= 0);

  if (plan.rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing to run — every SKU on the order book is covered by stock and work in
        progress.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Total label="SKUs to run" value={n0(plan.totals.skus)} />
        <Total label="Pieces" value={n0(plan.totals.pieces)} />
        <Total label="Litres to fill" value={n0(plan.totals.litres)} />
        {plan.capacity_limited && plan.totals.hours > 0 && (
          <Total label="Line hours" value={n0(plan.totals.hours)} />
        )}
        <Total
          label="Cannot run at all"
          value={`${n0(plan.totals.blocked_skus)} SKUs`}
          alert={plan.totals.blocked_skus > 0}
        />
      </div>

      {!plan.capacity_limited && (
        <p className="text-xs text-muted-foreground">
          Limited by demand and material only — machine hours are not on file, so this
          is what the materials allow rather than what the lines can fit.
        </p>
      )}

      <div className="max-h-[26rem] overflow-auto rounded-md border">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2.5 py-2 text-left font-semibold">#</th>
              <th className="px-2.5 py-2 text-left font-semibold">Run</th>
              <th className="px-2.5 py-2 text-right font-semibold">Make</th>
              <th className="px-2.5 py-2 text-right font-semibold">Of gap</th>
              <th className="px-2.5 py-2 text-left font-semibold">Limited by</th>
              <th className="px-2.5 py-2 text-right font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {[...runnable, ...blocked].slice(0, VISIBLE).map((row) => (
              <Row
                key={row.sku}
                row={row}
                onOpenSku={onOpenSku}
                onOpenComponent={onOpenComponent}
              />
            ))}
          </tbody>
        </table>
      </div>

      {plan.rows.length > VISIBLE && (
        <p className="text-xs text-muted-foreground">
          Showing {VISIBLE} of {plan.rows.length} SKUs, runnable first.{' '}
          {plan.totals.blocked_skus > 0 &&
            `${n0(plan.totals.blocked_pieces)} pieces cannot be started at all until material arrives.`}
        </p>
      )}
    </div>
  );
}

function Total({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-semibold tabular-nums',
          alert && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  row,
  onOpenSku,
  onOpenComponent,
}: {
  row: TomorrowRow;
  onOpenSku: (item: string) => void;
  onOpenComponent: (item: string) => void;
}) {
  const share = row.to_produce > 0 ? Math.round((100 * row.planned) / row.to_produce) : 0;

  return (
    <tr className={cn('border-b last:border-0', row.planned <= 0 && 'opacity-70')}>
      <td className="px-2.5 py-2 text-muted-foreground tabular-nums">{row.priority}</td>

      <td className="px-2.5 py-2">
        <button
          type="button"
          onClick={() => onOpenSku(row.sku)}
          className="text-left font-medium hover:underline"
        >
          {row.name}
        </button>
        <span className="block text-[11px] text-muted-foreground">
          {row.sku} · {row.orders} order{row.orders === 1 ? '' : 's'} ·{' '}
          {inr(row.value)}
        </span>
      </td>

      <td className="px-2.5 py-2 text-right tabular-nums">
        {row.planned > 0 ? (
          <b>{n0(row.planned)}</b>
        ) : (
          <span className="text-destructive">0</span>
        )}
        <span className="block text-[11px] text-muted-foreground">{row.uom}</span>
      </td>

      <td className="px-2.5 py-2 text-right tabular-nums text-muted-foreground">
        {n0(row.to_produce)}
        <span className="block text-[11px]">{share}%</span>
      </td>

      <td className="px-2.5 py-2">
        {row.limited_by === 'DEMAND' ? (
          <TrailPill tone="good" glyph="✓">
            full gap
          </TrailPill>
        ) : row.limited_by === 'CAPACITY' ? (
          <TrailPill tone="warn" glyph="●">
            line full
          </TrailPill>
        ) : (
          <TrailPill tone="critical" glyph="▲">
            material
          </TrailPill>
        )}
        {row.blocker && (
          <button
            type="button"
            onClick={() => onOpenComponent(row.blocker!.item)}
            className="mt-0.5 block max-w-[16rem] truncate text-left text-[11px] text-muted-foreground hover:underline"
            title={`${row.blocker.name}: ${n0(row.blocker.onhand)} on hand, ${n0(
              row.blocker.needed_for_gap,
            )} needed for the full gap`}
          >
            {row.blocker.name} — {n0(row.blocker.onhand)} left
          </button>
        )}
        {row.machine && (
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {row.machine}
            {row.hours != null && ` · ${row.hours} h`}
          </span>
        )}
      </td>

      <td className="px-2.5 py-2 text-right tabular-nums">
        {onDate(row.earliest_due)}
        {row.days_late > 0 && (
          <span className="block text-[11px] text-destructive">
            {n0(row.days_late)} d late
          </span>
        )}
      </td>
    </tr>
  );
}
