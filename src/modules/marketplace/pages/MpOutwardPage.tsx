/**
 * Outward — the marketplace dispatch centerpiece.
 * Pick an Order ID → resolve products (combo-expanded) → scan finished goods →
 * live summary → confirm → SAP delivery note + internal billing.
 */
import { AlertTriangle, CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from '@/shared/components/ui';

import {
  useConfirmDispatch,
  useCreateDispatch,
  useMpDispatch,
  useMpDispatches,
  useMpOrders,
  useScanDispatch,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpProgressTable } from '../components/MpProgressTable';
import { MpScanPanel } from '../components/MpScanPanel';
import type { MarketplaceChannel } from '../types/marketplace.types';

export default function MpOutwardPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [search, setSearch] = useState('');
  const [dispatchId, setDispatchId] = useState<number | null>(null);

  // Only orders whose warehouse materials were issued are dispatchable.
  const ordersQuery = useMpOrders({ channel, status: 'OPEN', search, ready: 1 });
  const dispatchedQuery = useMpDispatches({ channel, status: 'CONFIRMED' });
  const createDispatch = useCreateDispatch();
  const dispatchQuery = useMpDispatch(dispatchId);
  const dispatch = dispatchQuery.data;

  function loadOrder(orderId: string) {
    createDispatch.mutate(
      { channel, order_id: orderId },
      {
        onSuccess: (d) => setDispatchId(d.id),
        onError: (e: unknown) => {
          const err = e as { status?: number; message?: string };
          if (err?.status === 409 && err?.message) {
            toast.error(err.message); // e.g. "materials have not been issued…"
          } else {
            toast.error(`Order ${orderId} not found for ${channel}`);
          }
        },
      },
    );
  }

  function reset() {
    setDispatchId(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Truck className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Outward Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            Scan finished goods against a marketplace Order ID and confirm.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={(c) => { setChannel(c); reset(); }} />
      </header>

      {!dispatch ? (
        <>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pick an order</CardTitle>
            <CardDescription>
              Only orders whose materials have been issued from the warehouse are shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={search}
                placeholder="Search or type an Order ID"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search.trim() && loadOrder(search.trim())}
              />
              <Button onClick={() => search.trim() && loadOrder(search.trim())} disabled={createDispatch.isPending}>
                Load
              </Button>
            </div>
            <div className="divide-y rounded-md border">
              {(ordersQuery.data ?? []).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {ordersQuery.isLoading
                    ? 'Loading…'
                    : 'No orders ready — issue their materials from the warehouse first.'}
                </p>
              ) : (
                (ordersQuery.data ?? []).map((order) => (
                  <button
                    key={order.id}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => loadOrder(order.order_id)}
                  >
                    <span>
                      <span className="font-mono font-medium">{order.order_id}</span>
                      {order.buyer_name ? (
                        <span className="ml-2 text-xs text-muted-foreground">{order.buyer_name}</span>
                      ) : null}
                    </span>
                    <Badge variant="outline">{order.lines.length} lines</Badge>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dispatched orders</CardTitle>
            <CardDescription>Confirmed {channel} dispatches (delivery note posted).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Buyer</th>
                    <th className="p-3">Delivery note</th>
                    <th className="p-3">Bill</th>
                    <th className="p-3">Dispatched</th>
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
                    (dispatchedQuery.data ?? []).map((d) => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="p-3 font-mono font-medium">{d.order_id}</td>
                        <td className="p-3 text-muted-foreground">{d.buyer_name || '—'}</td>
                        <td className="p-3 font-mono">{d.sap_delivery_note_num || '—'}</td>
                        <td className="p-3 font-mono">{d.internal_billing_num || '—'}</td>
                        <td className="p-3 text-muted-foreground">
                          {d.confirmed_at ? new Date(d.confirmed_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </>
      ) : (
        <ActiveDispatch dispatchId={dispatch.id} onClose={reset} channel={channel} />
      )}
    </div>
  );
}

function ActiveDispatch({
  dispatchId,
  channel,
  onClose,
}: {
  dispatchId: number;
  channel: MarketplaceChannel;
  onClose: () => void;
}) {
  const dispatchQuery = useMpDispatch(dispatchId);
  const scan = useScanDispatch(dispatchId);
  const confirm = useConfirmDispatch(dispatchId);
  const [override, setOverride] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const d = dispatchQuery.data;
  const unmapped = d?.unmapped_skus ?? [];
  const progress = d?.progress ?? [];
  const allComplete = progress.length > 0 && progress.every((p) => p.status === 'COMPLETE');
  const confirmed = d?.status === 'CONFIRMED';

  const pmLines = useMemo(
    () => (d?.resolved_lines ?? []).filter((l) => l.component_type === 'PM'),
    [d?.resolved_lines],
  );

  function handleScan(barcode: string) {
    scan.mutate(
      { barcode_raw: barcode },
      {
        onSuccess: (result) => {
          if (result.duplicate) toast.warning(`Duplicate scan: ${barcode}`);
          else toast.success(`Scanned ${result.item_code}`);
        },
      },
    );
  }

  function handleConfirm() {
    confirm.mutate(
      { override_deviation: override },
      {
        onSuccess: (result) => {
          setConfirmOpen(false);
          toast.success(
            `Dispatched · DN ${result.sap_delivery_note_num || '—'} · Bill ${
              result.internal_billing_num || '—'
            }`,
          );
        },
      },
    );
  }

  if (!d) return <p className="text-sm text-muted-foreground">Loading dispatch…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">
              Order <span className="font-mono">{d.order_id}</span>
            </CardTitle>
            <CardDescription>
              {channel} · warehouse {d.sap_warehouse_code || '—'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={confirmed ? 'default' : 'secondary'}>{d.status}</Badge>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Change order
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {unmapped.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Unmapped SKUs: <span className="font-mono">{unmapped.join(', ')}</span>. Add mappings
                in Masters before confirming.
              </span>
            </div>
          ) : null}

          {!confirmed ? (
            <MpScanPanel onScan={handleScan} pending={scan.isPending} />
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-emerald-400 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Confirmed. Delivery note <span className="font-mono">{d.sap_delivery_note_num || '—'}</span> ·
              Internal bill <span className="font-mono">{d.internal_billing_num || '—'}</span>.
            </div>
          )}

          <MpProgressTable progress={progress} />

          {pmLines.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Packing materials consumed on confirm:{' '}
              {pmLines.map((l) => `${l.item_code}×${l.required_quantity}`).join(', ')}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!confirmed ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {allComplete ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Total scanning done.
              </span>
            ) : (
              'Scan all finished goods to enable confirm.'
            )}
          </p>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={unmapped.length > 0 || (!allComplete && !override)}>
                <PackageCheck className="mr-2 h-4 w-4" /> Confirm dispatch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm dispatch</DialogTitle>
                <DialogDescription>
                  This generates the SAP delivery note (decrementing stock), consumes packing
                  materials, and creates the internal billing document.
                </DialogDescription>
              </DialogHeader>
              {!allComplete ? (
                <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <Checkbox checked={override} onCheckedChange={(v) => setOverride(v === true)} />
                  <span>Override scan deviation (some lines are not fully scanned).</span>
                </label>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={confirm.isPending || (!allComplete && !override)}
                >
                  {confirm.isPending ? 'Confirming…' : 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Button variant="outline" onClick={onClose}>
          New dispatch
        </Button>
      )}
    </div>
  );
}
