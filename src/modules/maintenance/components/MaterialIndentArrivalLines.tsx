import { Button, Input } from '@/shared/components/ui';

import type { MaterialIndent, MaterialIndentItem } from '../types';
import { fullArrivalCounts, isPartArrival, pendingArrivalLines } from './materialIndentArrival';
import { formatQty, lineLabel, parseCount, toNumber } from './store/storeFormat';

function expectedText(item: MaterialIndentItem) {
  const arrived = toNumber(item.arrived_quantity);
  const bought = `Bought ${formatQty(item.shortfall_quantity)} ${item.unit}`;
  return arrived > 0
    ? `${bought} · ${formatQty(arrived)} already in · ${formatQty(item.pending_arrival_quantity)} to come`
    : bought;
}

/**
 * What one vehicle brought, line by line. Each box starts at what is still
 * expected; the gate lowers a box, or writes 0, when less came, and the rest
 * stays open for the next vehicle.
 */
export function MaterialIndentArrivalLines({
  indent,
  counts,
  onChange,
  disabled,
}: {
  indent: MaterialIndent;
  counts: Record<number, string>;
  onChange: (counts: Record<number, string>) => void;
  disabled?: boolean;
}) {
  const lines = pendingArrivalLines(indent);
  const coming = lines.filter((item) => (parseCount(counts[item.id] ?? '') ?? 0) > 0).length;
  const partial = isPartArrival(indent, counts);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">What came on this vehicle?</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(fullArrivalCounts(indent))}
          >
            All came
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(Object.fromEntries(lines.map((item) => [item.id, '0'])))}
          >
            Clear all
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {lines.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200/80 p-2.5 dark:border-border"
          >
            <label htmlFor={`arrived-${item.id}`} className="min-w-0 flex-1">
              <span className="block font-medium">{lineLabel(item)}</span>
              <span className="block text-xs text-muted-foreground">{expectedText(item)}</span>
            </label>
            <Input
              id={`arrived-${item.id}`}
              type="number"
              inputMode="decimal"
              min="0"
              max={item.pending_arrival_quantity}
              step="any"
              className="w-24 text-right tabular-nums"
              disabled={disabled}
              value={counts[item.id] ?? ''}
              onChange={(event) => onChange({ ...counts, [item.id]: event.target.value })}
            />
            <span className="w-12 text-xs text-muted-foreground">{item.unit}</span>
          </li>
        ))}
      </ul>
      <p
        className={
          partial
            ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
            : 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
        }
      >
        {partial
          ? `Part delivery: ${coming} of ${lines.length} item${lines.length === 1 ? '' : 's'} coming in. The rest stays open in Material In for the next vehicle.`
          : 'Everything still expected is on this vehicle.'}
      </p>
    </div>
  );
}
