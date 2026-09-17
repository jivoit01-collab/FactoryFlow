import { ArrowDownLeft, ArrowUpRight, CalendarOff, Factory, Minus, PackageX } from 'lucide-react';

import { NonMovingStatusBadge } from '@/modules/dashboards/non-moving/components';
import type { NonMovingItem } from '@/modules/dashboards/non-moving/types';
import { DetailTotals } from '@/modules/dashboards/warehouse-control/components';
import {
  formatCount,
  formatCurrency,
  formatDay,
} from '@/modules/dashboards/warehouse-control/utils/format';
import {
  Badge,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useItemBatches } from '../api';
import { CONTROL_WAREHOUSE } from '../constants';
import type { ItemBatch, ItemMovement } from '../types';

export interface ItemBatchDialogProps {
  item: NonMovingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Red inside three months, amber inside a year, otherwise quiet. */
function expiryTone(days: number | null): string {
  if (days == null) return 'text-muted-foreground';
  if (days <= 90) return 'text-rose-600 dark:text-rose-400';
  if (days <= 365) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

function BatchRow({ batch }: { batch: ItemBatch }) {
  const received = batch.mfg_date_source !== 'manufactured';

  return (
    <li className="px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-medium">{batch.batch || '— no batch —'}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {batch.mfg_date ? (
              <span className="flex items-center gap-1">
                <Factory className="h-3 w-3 shrink-0" />
                Made {formatDay(batch.mfg_date)}
              </span>
            ) : (
              /* Said plainly rather than showing the receipt date as a make
                 date. These are the batches whose number was typed as a stray
                 figure, and they carry no shelf-life data at all. */
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <PackageX className="h-3 w-3 shrink-0" />
                No make date in SAP
                {batch.in_date && ` · received ${formatDay(batch.in_date)}`}
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatCount(batch.quantity)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">pcs</span>
          </p>
          {batch.age_days != null && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatCount(batch.age_days)} days old{received && ' (since receipt)'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {batch.exp_date ? (
          <span
            className={cn('flex items-center gap-1 tabular-nums', expiryTone(batch.days_to_expiry))}
          >
            <CalendarOff className="h-3 w-3 shrink-0" />
            Expires {formatDay(batch.exp_date)}
            {batch.days_to_expiry != null && ` · ${formatCount(batch.days_to_expiry)} days left`}
          </span>
        ) : (
          <span className="text-muted-foreground">No expiry set</span>
        )}
        {batch.committed > 0 && (
          <span className="tabular-nums text-muted-foreground">
            {formatCount(batch.committed)} committed
          </span>
        )}
      </div>
    </li>
  );
}

function MovementRow({ move }: { move: ItemMovement }) {
  const out = move.direction === 'OUT';
  const inbound = move.direction === 'IN';
  const qty = out ? move.out_qty : move.in_qty;

  return (
    <li className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <span className="flex min-w-0 items-baseline gap-1.5">
        {out ? (
          <ArrowUpRight className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : inbound ? (
          <ArrowDownLeft className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400" />
        ) : (
          <Minus className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-xs">
          {move.label}
          {move.doc_ref && (
            <span className="ml-1 font-mono text-muted-foreground">#{move.doc_ref}</span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {qty > 0 ? `${formatCount(qty)} pcs · ` : ''}
        {move.date ? formatDay(move.date) : '—'}
      </span>
    </li>
  );
}

/**
 * One SKU's batches on the floor — how old the stock is and when it expires.
 *
 * The question a standing-stock row provokes is "how old is it, really", and the
 * panel behind it can only answer in days-since-last-movement. That is a
 * movement age, not the stock's age: a pallet made in April and shuffled last
 * week reads as fresh. Batches carry the make date, so this is where the real
 * answer lives, oldest batch first.
 */
export function ItemBatchDialog({ item, open, onOpenChange }: ItemBatchDialogProps) {
  const { data, isLoading, error } = useItemBatches(
    open ? (item?.item_code ?? null) : null,
    CONTROL_WAREHOUSE,
  );

  if (!item) return null;

  const batches = data?.data ?? [];
  const movements = data?.movements ?? [];
  const meta = data?.meta;

  // The panel's age counts any movement; this one counts only stock leaving. A
  // gap means the last movement was stock ARRIVING, which on a floor goods are
  // produced into resets the panel's clock without anything having shipped.
  const understated =
    meta?.days_since_out != null && meta.days_since_out > item.days_since_last_movement + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <Factory className="h-4 w-4" />
            </span>
            <span className="min-w-0 break-words">{item.item_name || item.item_code}</span>
            <Badge variant="outline">{item.item_code}</Badge>
            <NonMovingStatusBadge days={item.days_since_last_movement} />
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {CONTROL_WAREHOUSE}
            {item.sub_group ? ` · ${item.sub_group}` : ''}
          </p>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <DetailTotals
            items={[
              { label: 'On hand', value: `${formatCount(item.quantity)} pcs` },
              { label: 'Value', value: formatCurrency(item.value) },
              {
                // The honest standing age: since stock LEFT, not since anything
                // happened to it. A receipt from production is arrival.
                label: 'Not shipped for',
                value:
                  meta?.days_since_out != null
                    ? `${formatCount(meta.days_since_out)} days`
                    : 'Never shipped',
              },
              {
                label: 'Oldest batch',
                value:
                  meta?.oldest_age_days != null ? `${formatCount(meta.oldest_age_days)} days` : '—',
              },
            ]}
          />

          {/* Three ages, three different questions. The panel can only offer the
              weakest of them, so the other two live here. */}
          <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">
                Since any movement — what the panel ranks on
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCount(item.days_since_last_movement)} days
              </span>
            </p>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Since stock last left this floor</span>
              <span
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  understated && 'text-rose-600 dark:text-rose-400',
                )}
              >
                {meta?.days_since_out != null ? `${formatCount(meta.days_since_out)} days` : '—'}
              </span>
            </p>
            {meta?.days_since_in != null && (
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Since stock last arrived here</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatCount(meta.days_since_in)} days
                </span>
              </p>
            )}
          </div>

          {/* The point you raised. BH-PF is a floor goods are PRODUCED INTO, so a
              receipt resets the panel's clock without any stock going anywhere —
              the 200-litre drum reads 69 days and has not shipped in 152. */}
          {understated && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-700 dark:text-rose-300">
              <strong>This has stood longer than the panel shows.</strong> Its last movement was
              stock <strong>arriving</strong>
              {meta?.last_in_date ? ` on ${formatDay(meta.last_in_date)}` : ''} — production
              receipts and inbound transfers reset the panel&rsquo;s clock without anything leaving.
              Measured on despatch, nothing has left {CONTROL_WAREHOUSE} for{' '}
              {formatCount(meta?.days_since_out ?? 0)} days.
            </p>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Batch ages below are time <strong>since manufacture</strong>, which is what shelf life
            runs on — a different question again from either movement age.
          </p>

          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-baseline justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Batches on the floor
              </h4>
              {meta && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCount(meta.batch_count)} batch{meta.batch_count === 1 ? '' : 'es'} ·{' '}
                  {formatCount(meta.total_quantity)} pcs
                </p>
              )}
            </div>

            {error ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Batch details could not be read from SAP.
              </p>
            ) : isLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                SAP holds no batches for this item in {CONTROL_WAREHOUSE}. It is either not
                batch-managed or its stock sits outside the batch ledger.
              </p>
            ) : (
              <ul className="max-h-[22rem] divide-y overflow-y-auto overscroll-contain">
                {batches.map((batch, index) => (
                  <BatchRow key={`${batch.batch}-${index}`} batch={batch} />
                ))}
              </ul>
            )}
          </div>

          {movements.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-baseline justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent movements
                </h4>
                {/* Direction is read off the quantity, not the document type — a
                    transfer goes both ways, and on this floor it is as often
                    stock arriving as leaving. */}
                <p className="text-xs text-muted-foreground">out &uarr; &middot; in &darr;</p>
              </div>
              <ul className="max-h-[12rem] divide-y overflow-y-auto overscroll-contain">
                {movements.map((move, index) => (
                  <MovementRow key={`${move.date}-${move.doc_ref}-${index}`} move={move} />
                ))}
              </ul>
            </div>
          )}

          {meta && meta.without_mfg_date > 0 && (
            <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
              {formatCount(meta.without_mfg_date)} of {formatCount(meta.batch_count)} batches have
              no manufacturing date or expiry in SAP, so their shelf life cannot be checked. Those
              rows show the receipt date instead, clearly marked.
            </p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
