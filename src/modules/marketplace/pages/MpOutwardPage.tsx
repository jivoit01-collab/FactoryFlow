/**
 * Outward — scan-first dispatch.
 * Scan a Flipkart Tracking ID and the whole order is marked scanned on a live
 * board — no opening orders first. Each order card shows its items and status;
 * Confirm posts the SAP delivery note + internal bill (per order or in bulk).
 */
import {
  CheckCircle2,
  Circle,
  Loader2,
  PackageCheck,
  RefreshCw,
  ScanLine,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { marketplaceApi } from '../api/marketplace.api';
import {
  MARKETPLACE_QUERY_KEYS,
  useConfirmDispatch,
  useMpDispatches,
  useMpOrders,
  useRetryDeliveryNote,
  useScanDispatchByTracking,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpScanFeedback, type ScanFeedback } from '../components/MpScanFeedback';
import { MpScanPanel } from '../components/MpScanPanel';
import type {
  MarketplaceChannel,
  MarketplaceDispatch,
  MarketplaceOrder,
} from '../types/marketplace.types';

const WARN_CODES = ['NOT_PACKED', 'NOT_ISSUED', 'ORDER_CANCELLED', 'EMPTY'];

function errorCode(e: unknown): string | undefined {
  return (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

export default function MpOutwardPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const qc = useQueryClient();

  const ordersQuery = useMpOrders({ channel, status: 'OPEN', ready: 1 });
  const dispatchesQuery = useMpDispatches({ channel });
  const dispatchedQuery = useMpDispatches({ channel, status: 'CONFIRMED' });
  const scanMut = useScanDispatchByTracking(channel);

  const orders = ordersQuery.data ?? [];

  // order_id → active (non-confirmed, non-cancelled) dispatch, to know scan state.
  const activeDispatch = useMemo(() => {
    const map = new Map<string, MarketplaceDispatch>();
    for (const d of dispatchesQuery.data ?? []) {
      if (d.status === 'CANCELLED' || d.status === 'CONFIRMED') continue;
      map.set(d.order_id, d);
    }
    return map;
  }, [dispatchesQuery.data]);

  const scannedIds = orders
    .map((o) => activeDispatch.get(o.order_id))
    .filter((d): d is MarketplaceDispatch => !!d && d.status === 'READY')
    .map((d) => d.id);
  const scannedCount = scannedIds.length;

  const confirmAll = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) await marketplaceApi.confirmDispatch(id, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MARKETPLACE_QUERY_KEYS.all }),
  });

  function handleScan(barcode: string) {
    scanMut.mutate(barcode, {
      onSuccess: (d) => {
        if (d.duplicate) {
          setFeedback({ kind: 'warning', message: `Already scanned · ${d.order_id}`, detail: d.buyer_name });
        } else if (d.status === 'READY') {
          setFeedback({ kind: 'success', message: `Order complete · ${d.order_id}`, detail: d.buyer_name });
        } else {
          // Multi-item order: this item is done, others still pending.
          setFeedback({
            kind: 'success',
            message: `Item scanned · ${d.order_id}`,
            detail: 'More items pending on this order — scan their tracking IDs.',
          });
        }
      },
      onError: (e) => {
        const warn = WARN_CODES.includes(errorCode(e) ?? '');
        setFeedback({ kind: warn ? 'warning' : 'error', message: getErrorMessage(e, 'Scan failed') });
      },
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Truck className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Outward Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            Scan each shipment's Tracking ID to dispatch, then confirm.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={(c) => { setChannel(c); setFeedback(null); }} />
      </header>

      {/* Scan box */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-primary" /> Scan to dispatch
          </CardTitle>
          <CardDescription>
            Scan each shipment's Flipkart <strong>Tracking ID</strong>. An order with several items
            has a tracking ID per item — scan each; the order completes once all are scanned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MpScanPanel onScan={handleScan} pending={scanMut.isPending} placeholder="Scan Tracking ID (e.g. FMPP…)" />
          <MpScanFeedback feedback={feedback} />
        </CardContent>
      </Card>

      {/* Board */}
      <Card>
        <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">To dispatch</CardTitle>
            <CardDescription>Packed orders awaiting scan &amp; confirm.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="tabular-nums">
              {scannedCount} of {orders.length} scanned
            </Badge>
            <Button
              size="sm"
              disabled={scannedCount === 0 || confirmAll.isPending}
              onClick={() =>
                confirmAll.mutate(scannedIds, {
                  onSuccess: () => toast.success(`Confirmed ${scannedIds.length} order(s).`),
                  onError: (e) => toast.error(getErrorMessage(e, 'Bulk confirm failed')),
                })
              }
            >
              {confirmAll.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming…</>
              ) : (
                <><PackageCheck className="mr-2 h-4 w-4" /> Confirm all scanned</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ordersQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No orders ready — pack them first (Packing).
            </p>
          ) : (
            orders.map((order) => (
              <OrderScanCard
                key={order.order_id}
                order={order}
                dispatch={activeDispatch.get(order.order_id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Dispatched */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dispatched orders</CardTitle>
          <CardDescription>Confirmed {channel} dispatches (delivery note posted).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="-mx-2 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[660px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Buyer</th>
                  <th className="p-3">Delivery note</th>
                  <th className="p-3">Bill</th>
                  <th className="p-3">DN status</th>
                </tr>
              </thead>
              <tbody>
                {(dispatchedQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      {dispatchedQuery.isLoading ? 'Loading…' : 'No dispatched orders yet.'}
                    </td>
                  </tr>
                ) : (
                  (dispatchedQuery.data ?? []).map((d) => <DispatchedRow key={d.id} d={d} />)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderScanCard({
  order,
  dispatch,
}: {
  order: MarketplaceOrder;
  dispatch?: MarketplaceDispatch;
}) {
  const scanned = dispatch?.status === 'READY';
  const total = order.lines.length;
  const done = Math.min(dispatch?.scanned_count ?? 0, total);
  const partial = !scanned && done > 0; // multi-item order, some items scanned
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        scanned
          ? 'border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20'
          : partial
            ? 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
            : 'bg-card'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {scanned ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className={`h-5 w-5 ${partial ? 'text-amber-500' : 'text-muted-foreground/50'}`} />
          )}
          <div>
            <div className="font-mono font-medium">{order.order_id}</div>
            {order.buyer_name ? (
              <div className="text-xs text-muted-foreground">{order.buyer_name}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scanned ? (
            <Badge className="bg-emerald-600">Scanned</Badge>
          ) : partial ? (
            <Badge className="bg-amber-500">{done} of {total} scanned</Badge>
          ) : (
            <Badge variant="outline">Pending scan</Badge>
          )}
          {scanned && dispatch ? <ConfirmButton dispatchId={dispatch.id} orderId={order.order_id} /> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {order.lines.map((l, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${
              scanned ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
            }`}
          >
            {scanned ? <CheckCircle2 className="h-3 w-3" /> : null}
            {l.sku_name || l.marketplace_sku} × {Number(l.ordered_quantity)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConfirmButton({ dispatchId, orderId }: { dispatchId: number; orderId: string }) {
  const confirm = useConfirmDispatch(dispatchId);
  return (
    <Button
      size="sm"
      disabled={confirm.isPending}
      onClick={() =>
        confirm.mutate(
          {},
          {
            onSuccess: (r) => {
              if (r.sap_post_status === 'FAILED') {
                toast.warning(`${orderId} dispatched — delivery note failed; retry available.`);
              } else if (r.sap_post_status === 'PENDING' || !r.sap_delivery_note_num) {
                toast.success(`Dispatched · ${orderId} — cut its delivery note in SAP Delivery Notes.`);
              } else {
                toast.success(`Dispatched · ${orderId} · DN ${r.sap_delivery_note_num || '—'}`);
              }
            },
            onError: (e) => toast.error(getErrorMessage(e, 'Confirm failed')),
          },
        )
      }
    >
      <PackageCheck className="mr-1.5 h-4 w-4" /> {confirm.isPending ? 'Confirming…' : 'Confirm'}
    </Button>
  );
}

function DispatchedRow({ d }: { d: MarketplaceDispatch }) {
  const retry = useRetryDeliveryNote(d.id);
  const failed = d.sap_post_status === 'FAILED';
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="p-3 font-mono font-medium">{d.order_id}</td>
      <td className="p-3 text-muted-foreground">{d.buyer_name || '—'}</td>
      <td className="p-3 font-mono">{d.sap_delivery_note_num || '—'}</td>
      <td className="p-3 font-mono">{d.internal_billing_num || '—'}</td>
      <td className="p-3">
        {failed ? (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">FAILED</Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={retry.isPending}
              onClick={() =>
                retry.mutate(undefined, {
                  onSuccess: (r) =>
                    r.sap_post_status === 'POSTED'
                      ? toast.success('Delivery note posted')
                      : toast.error('Still failing — order stays dispatched.'),
                })
              }
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Retry
            </Button>
          </div>
        ) : (
          <Badge variant="outline">{d.sap_post_status ?? 'POSTED'}</Badge>
        )}
      </td>
    </tr>
  );
}
