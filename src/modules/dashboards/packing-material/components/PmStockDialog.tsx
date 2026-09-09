import { AlertTriangle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { PmSortKey, PmStockResponse, PmStockWarehouse } from '../types';
import {
  barWidthPct,
  combineStockItems,
  filterStockItems,
  formatInr,
  formatInrCompact,
  formatPct,
  formatQty,
  sumStockItems,
} from '../utils';

/**
 * What the dialog is showing.
 *
 * `{ kind: 'warehouse' }` is one store's items; `{ kind: 'total' }` is the
 * stores side by side with their total under them. They are one component
 * because they are one interaction — opening a card — and splitting them into
 * two dialogs would duplicate the sort control, the footer and the empty
 * state three lines apart.
 */
export type PmStockView =
  | { kind: 'warehouse'; warehouse: PmStockWarehouse }
  | { kind: 'total' }
  | null;

export interface PmStockDialogProps {
  view: PmStockView;
  stock?: PmStockResponse;
  onClose: () => void;
}

function SortToggle({
  sort,
  onSortChange,
}: {
  sort: PmSortKey;
  onSortChange: (sort: PmSortKey) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-md border p-0.5">
      {(['qty', 'value'] as const).map((key) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={sort === key ? 'secondary' : 'ghost'}
          className="h-7 px-2.5 text-xs"
          onClick={() => onSortChange(key)}
        >
          {key === 'qty' ? 'By qty' : 'By value'}
        </Button>
      ))}
    </div>
  );
}

/** One store's items, searchable, footed with what the search adds up to. */
function WarehouseItems({ warehouse }: { warehouse: PmStockWarehouse }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PmSortKey>('qty');

  const items = useMemo(
    () => filterStockItems(warehouse.items, search, sort),
    [warehouse.items, search, sort],
  );
  const shown = useMemo(() => sumStockItems(items), [items]);
  const leader = items.length ? Math.max(...items.map((item) => item.stock_qty)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Item code, name or family"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <SortToggle sort={sort} onSortChange={setSort} />
      </div>

      {/* Footed with the SHOWN totals, not the store's, so a search cannot
          leave three rows above a figure for three hundred. */}
      <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Items</p>
          <p className="text-sm font-semibold tabular-nums">
            {items.length}
            {items.length !== warehouse.item_count && (
              <span className="text-muted-foreground"> / {warehouse.item_count}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Quantity</p>
          <p className="text-sm font-semibold tabular-nums">{formatQty(shown.qty)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Value</p>
          <p className="text-sm font-semibold tabular-nums">{formatInrCompact(shown.value)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {warehouse.item_count === 0
            ? 'SAP reports no packing material on hand in this store.'
            : 'Nothing matches that search.'}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.item_code} className="px-3 py-2.5 transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.item_name || item.item_code}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.item_code}
                    {item.sub_group ? ` · ${item.sub_group}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatQty(item.stock_qty, item.uom)}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatInr(item.stock_value)}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${barWidthPct(item.stock_qty, leader)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The stores side by side, then the total of them. */
function TotalBreakdown({ stock }: { stock: PmStockResponse }) {
  const leader = stock.warehouses.length
    ? Math.max(...stock.warehouses.map((warehouse) => warehouse.total_qty))
    : 0;

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-lg border">
        {stock.warehouses.map((warehouse) => (
          <li key={warehouse.code} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{warehouse.code}</span>
                  {warehouse.inactive && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      inactive in SAP
                    </Badge>
                  )}
                  {!warehouse.exists && (
                    <Badge variant="destructive" className="shrink-0 text-[10px]">
                      not in this company
                    </Badge>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {warehouse.name} · {warehouse.item_count} items
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatQty(warehouse.total_qty)}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatInr(warehouse.total_value)} · {formatPct(warehouse.share_pct)}
                </p>
              </div>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${barWidthPct(warehouse.total_qty, leader)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Total</p>
          <p className="text-xs text-muted-foreground">
            {/* The quantity is a plain sum of the stores above. The item count
                is not, and that is the one thing on this board worth spelling
                out: a bottle in three stores is three lots of bottles and one
                kind of bottle. */}
            {formatQty(stock.total.total_qty)} across {stock.total.warehouse_count} stores, of{' '}
            {stock.total.item_count} different items — one item in two stores is counted once here
            and its quantities added
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">{formatQty(stock.total.total_qty)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatInr(stock.total.total_value)}
          </p>
        </div>
      </div>

      <CombinedItems warehouses={stock.warehouses} itemCount={stock.total.item_count} />
    </div>
  );
}

/**
 * Every item added up across the stores, with the split behind each figure.
 *
 * This is the answer to "I have 2 in BH-PM, 3 in BH-PC and 5 in BH-BS, so I
 * have 10" — one row per item reading 10, and the three numbers that make it
 * up next to it, so the total can always be traced back.
 */
function CombinedItems({
  warehouses,
  itemCount,
}: {
  warehouses: PmStockWarehouse[];
  itemCount: number;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PmSortKey>('qty');

  const combined = useMemo(() => combineStockItems(warehouses), [warehouses]);
  const items = useMemo(() => filterStockItems(combined, search, sort), [combined, search, sort]);
  const shown = useMemo(() => sumStockItems(items), [items]);
  const leader = items.length ? Math.max(...items.map((item) => item.stock_qty)) : 0;

  if (!combined.length) return null;

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="mr-auto text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Every item, all stores added up
        </h4>
        <SortToggle sort={sort} onSortChange={setSort} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Item code, name or family"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 px-3 py-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Items</p>
          <p className="text-sm font-semibold tabular-nums">
            {items.length}
            {items.length !== itemCount && (
              <span className="text-muted-foreground"> / {itemCount}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Quantity</p>
          <p className="text-sm font-semibold tabular-nums">{formatQty(shown.qty)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Value</p>
          <p className="text-sm font-semibold tabular-nums">{formatInrCompact(shown.value)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing matches that search.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.item_code} className="px-3 py-2.5 transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.item_name || item.item_code}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.item_code}
                    {item.sub_group ? ` · ${item.sub_group}` : ''}
                  </p>
                  {/* Where the total came from. Shown even for an item in one
                      store, so a single-store row is legible as one store
                      rather than as a missing split. */}
                  <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                    {item.splits.map((split) => (
                      <span key={split.code} className="rounded bg-muted px-1.5 py-0.5">
                        {split.code} {formatQty(split.stock_qty)}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatQty(item.stock_qty, item.uom)}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatInr(item.stock_value)}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${barWidthPct(item.stock_qty, leader)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PmStockDialog({ view, stock, onClose }: PmStockDialogProps) {
  const isWarehouse = view?.kind === 'warehouse';
  const warehouse = isWarehouse ? view.warehouse : null;

  return (
    <Dialog open={!!view} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {warehouse
              ? `${warehouse.code} — ${warehouse.name}`
              : 'Packing material stock, store by store'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] overflow-y-auto">
          {warehouse?.inactive && (
            <p
              className={cn(
                'mb-3 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs',
                'text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                SAP has this warehouse flagged inactive, so the balance below is frozen at whatever
                was in it when it was decommissioned rather than stock the line can draw on.
              </span>
            </p>
          )}

          {warehouse ? (
            <WarehouseItems warehouse={warehouse} />
          ) : stock ? (
            <TotalBreakdown stock={stock} />
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
