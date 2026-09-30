/**
 * The small pieces both price screens are built from: a figure's change (up or
 * down, coloured by what it costs: a price that rose is dearer oil), the short
 * stroke that keys a trend line, and a sortable column heading.
 */
import { ArrowDown, ArrowUp, ArrowUpDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Th } from '@/shared/components';
import { cn } from '@/shared/utils';

import { type Change, fmtPct, fmtRupees, fmtSigned } from './priceFormat';

const TONE = {
  up: 'text-rose-700 dark:text-rose-400',
  down: 'text-emerald-700 dark:text-emerald-400',
  same: 'text-muted-foreground',
} as const;

/**
 * A change as an arrow and a signed figure, `+2.00`, with the share beside it
 * when `pct` is set. Rose for a rise and emerald for a fall, and the sign and
 * the arrow say the same, so it never rests on the colour alone.
 */
export function ChangeMark({
  change,
  pct,
  empty = '—',
  emptyTitle,
  className,
}: {
  change: Change | null;
  pct?: boolean;
  /** Shown when there is nothing to compare with. */
  empty?: string;
  emptyTitle?: string;
  className?: string;
}) {
  if (!change) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)} title={emptyTitle}>
        {empty}
      </span>
    );
  }
  const Icon =
    change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : Minus;
  const words =
    change.direction === 'same'
      ? 'No change'
      : `${change.direction === 'up' ? 'Rose' : 'Fell'} ${fmtRupees(Math.abs(change.amount))}${
          change.pct !== null ? ` (${fmtPct(Math.abs(change.pct))})` : ''
        }`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium tabular-nums',
        TONE[change.direction],
        className,
      )}
      title={words}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {change.direction === 'same' ? '0.00' : fmtSigned(change.amount)}
      {pct && change.direction !== 'same' && change.pct !== null && (
        <span className="ml-1 font-normal opacity-80">{fmtPct(change.pct)}</span>
      )}
    </span>
  );
}

/** A trend line's key: a short stroke in its colour and dash. Decorative. */
export function SeriesKey({
  color,
  dash,
  muted,
  className,
}: {
  color: string;
  dash?: string;
  /** Drawn grey: the series is switched off. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="18"
      height="6"
      viewBox="0 0 18 6"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <line
        x1="1"
        y1="3"
        x2="17"
        y2="3"
        stroke={muted ? 'hsl(var(--muted-foreground))' : color}
        strokeOpacity={muted ? 0.45 : 1}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  );
}

export interface SortState<K extends string> {
  key: K | null;
  dir: 'asc' | 'desc';
}

/** A column heading that sorts the table by its column. */
export function SortTh<K extends string>({
  column,
  children,
  align,
  sort,
  onSort,
  className,
}: {
  column: K;
  children: ReactNode;
  align?: 'right';
  sort: SortState<K>;
  onSort: (column: K) => void;
  className?: string;
}) {
  const Icon = sort.key !== column ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Th
      align={align}
      className={className}
      aria-sort={sort.key !== column ? undefined : sort.dir === 'asc' ? 'ascending' : 'descending'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icon className={cn('h-3 w-3', sort.key !== column && 'opacity-40')} />
      </button>
    </Th>
  );
}
