/**
 * Packing — item-grouped summary.
 * Instead of opening orders one by one, the work-list is grouped BY finished-good
 * item ("COLD PRESS GROUNDNUT 5 LTR — 50 orders"). The operator marks an item
 * group Completed once its orders are physically packed; those orders then flow
 * to Outward. No label printing — the Flipkart Tracking ID on each shipment is the
 * scan key used later in Outward/Inward.
 */
import { Boxes, CheckCircle2, PackageCheck, PackageSearch, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useCompleteItemGroup, usePackingSummary } from '../api/marketplace.queries';
import type { PackingSummaryItem } from '../types/marketplace.types';

const CHANNEL = 'FLIPKART' as const;

export default function MpPackingPage() {
  const { data: summary, isLoading } = usePackingSummary(CHANNEL);
  const complete = useCompleteItemGroup(CHANNEL);
  const [confirmItem, setConfirmItem] = useState<PackingSummaryItem | null>(null);

  const items = summary?.items ?? [];

  function markCompleted(item: PackingSummaryItem) {
    complete.mutate(item.item_code, {
      onSuccess: (r) => {
        setConfirmItem(null);
        const skipped = r.skipped_order_ids.length;
        toast.success(
          `Packed ${r.completed_count} order(s) for ${item.item_code}.` +
            (skipped ? ` ${skipped} multi-item order(s) left for their other items.` : ''),
        );
      },
      onError: (e: unknown) => {
        setConfirmItem(null);
        toast.error(getErrorMessage(e, 'Could not complete this item group.'));
      },
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Boxes className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Packing</h1>
          <p className="text-sm text-muted-foreground">
            Pack by item. Mark an item group Completed once its orders are packed — they then move to
            Outward.
          </p>
        </div>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Item groups" value={items.length} />
        <StatTile label="Orders to pack" value={summary?.total_orders ?? 0} />
        <StatTile
          label="Unmapped orders"
          value={summary?.unmapped_orders ?? 0}
          tone={summary?.unmapped_orders ? 'amber' : undefined}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border p-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading packing work-list…
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageCheck className="h-10 w-10 text-emerald-500" />
            <div>
              <p className="font-medium">Nothing waiting to be packed.</p>
              <p className="text-sm text-muted-foreground">
                Issue orders from Warehouse Issues and they'll appear here grouped by item.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.item_code} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="font-mono text-base">{item.item_code}</CardTitle>
                    <CardDescription className="truncate">{item.item_name || '—'}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <PackageSearch className="h-3.5 w-3.5" />
                    {item.order_count} order{item.order_count === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  className="w-full"
                  onClick={() => setConfirmItem(item)}
                  disabled={complete.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!confirmItem} onOpenChange={(o) => !o && setConfirmItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark item group completed?</DialogTitle>
          </DialogHeader>
          {confirmItem ? (
            <p className="text-sm text-muted-foreground">
              This marks all{' '}
              <strong>
                {confirmItem.order_count} order(s) of {confirmItem.item_code}
              </strong>{' '}
              as packed and releases them to Outward. Orders that also contain other items stay until
              those items are completed too.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)} disabled={complete.isPending}>
              Cancel
            </Button>
            <Button onClick={() => confirmItem && markCompleted(confirmItem)} disabled={complete.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {complete.isPending ? 'Completing…' : 'Mark completed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'amber' }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${tone === 'amber' ? 'text-amber-600' : ''}`}>{value}</div>
    </div>
  );
}
