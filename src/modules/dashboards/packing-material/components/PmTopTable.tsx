import { type LucideIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { type Accent } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PmSortKey, PmTopItem, PmTopTotals } from '../types';
import {
  barWidthPct,
  formatInr,
  formatInrCompact,
  formatPct,
  formatQty,
  sortTopItems,
} from '../utils';

export interface PmTopTableProps {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  description: string;
  items: PmTopItem[];
  totals?: PmTopTotals;
  isLoading: boolean;
  /** Rendered on the right of the header — the dispatch source toggle. */
  headerAction?: ReactNode;
  /** Rendered under the table: what the figures do and do not include. */
  footer?: ReactNode;
  emptyMessage: string;
}

function Row({ item, leader, sort }: { item: PmTopItem; leader: number; sort: PmSortKey }) {
  const measure = sort === 'value' ? item.value : item.qty;

  return (
    <li className="px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        {/* The rank the item earned in the month, kept whichever column the
            table is read down. It is not the row's position. */}
        <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
          {item.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.item_name || item.item_code}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.item_code}
            {item.sub_group ? ` · ${item.sub_group}` : ''}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${barWidthPct(measure, leader)}%` }}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">{formatQty(item.qty, item.uom)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatInr(item.value)} · {formatPct(item.share_pct)}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * One of the two top lists.
 *
 * Ranked on quantity by the API. The By-qty / By-value switch re-reads THE
 * SAME rows down the other column and never re-requests: the ten items are
 * always the ten biggest by volume, and sorting by value answers "of those
 * ten, which cost the most" rather than "the ten most expensive". Both
 * columns are on every row for the same reason — a list of pieces is led by
 * caps and labels, a list of rupees by bottles.
 */
export function PmTopTable({
  icon: Icon,
  accent,
  title,
  description,
  items,
  totals,
  isLoading,
  headerAction,
  footer,
  emptyMessage,
}: PmTopTableProps) {
  const [sort, setSort] = useState<PmSortKey>('qty');

  const ordered = useMemo(() => sortTopItems(items, sort), [items, sort]);
  const leader = useMemo(() => {
    if (!ordered.length) return 0;
    return Math.max(...ordered.map((item) => (sort === 'value' ? item.value : item.qty)));
  }, [ordered, sort]);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-start gap-3 border-b p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            accent.iconBg,
          )}
        >
          <Icon className={cn('h-5 w-5', accent.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <div className="flex shrink-0 items-center rounded-md border p-0.5">
            {(['qty', 'value'] as const).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={sort === key ? 'secondary' : 'ghost'}
                className="h-7 px-2.5 text-xs"
                onClick={() => setSort(key)}
              >
                {key === 'qty' ? 'By qty' : 'By value'}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {totals && (
        <div className="grid grid-cols-2 gap-2 border-b bg-muted/30 px-4 py-2.5 sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-muted-foreground">These items</p>
            <p className="text-sm font-semibold tabular-nums">{formatQty(totals.shown_qty)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Their value</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatInrCompact(totals.shown_value)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">All {totals.item_count} items</p>
            <p className="text-sm font-semibold tabular-nums">{formatQty(totals.total_qty)}</p>
          </div>
          <div>
            {/* The honest denominator: the share of the whole period these
                rows are, not the share of themselves. */}
            <p className="text-[11px] text-muted-foreground">Shown share</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatPct(totals.shown_share_pct)}
            </p>
          </div>
        </div>
      )}

      {isLoading && !items.length ? (
        <ul className="divide-y">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
            <li key={index} className="px-3 py-3">
              <div className="h-9 animate-pulse rounded bg-muted/60" />
            </li>
          ))}
        </ul>
      ) : ordered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className={cn('divide-y', isLoading && 'opacity-60 transition-opacity')}>
          {ordered.map((item) => (
            <Row key={item.item_code} item={item} leader={leader} sort={sort} />
          ))}
        </ul>
      )}

      {footer && (
        <div className="border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  );
}
