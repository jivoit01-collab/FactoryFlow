/**
 * Outward — sheet-wise, scan-first dispatch.
 *
 * The operator picks a SHEET (an uploaded Flipkart order CSV = import batch) and
 * scans its shipments. The board then shows every order in that sheet, each order's
 * tracking IDs and which are scanned, plus a live sheet summary (orders completed /
 * pending, tracking IDs scanned / remaining, overall progress). Confirm posts the
 * SAP delivery note + internal bill (per order or all-scanned in bulk).
 */
import {
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  Loader2,
  PackageCheck,
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
  useDispatchBoard,
  useDispatchSheets,
  useScanDispatchByTracking,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpScanFeedback, type ScanFeedback } from '../components/MpScanFeedback';
import { MpScanPanel } from '../components/MpScanPanel';
import { MpVariantPicker } from '../components/MpVariantPicker';
import type {
  DispatchBoardOrder,
  DispatchSheetSummary,
  MarketplaceChannel,
} from '../types/marketplace.types';

const WARN_CODES = ['NOT_PACKED', 'NOT_ISSUED', 'ORDER_CANCELLED', 'EMPTY'];

function errorCode(e: unknown): string | undefined {
  return (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

export default function MpOutwardPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [pickedSheet, setPickedSheet] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [showConfirmed, setShowConfirmed] = useState(false);
  const qc = useQueryClient();

  const sheetsQuery = useDispatchSheets(channel);
  const sheets = sheetsQuery.data?.sheets ?? [];
  // Default to the newest sheet until the operator picks one.
  const sheetId = pickedSheet ?? sheets[0]?.id ?? null;

  const boardQuery = useDispatchBoard(channel, sheetId);
  const board = boardQuery.data;
  const orders = board?.orders ?? [];
  const insights = board?.insights;

  const scanMut = useScanDispatchByTracking(channel);

  const scannedOrders = useMemo(
    () => orders.filter((o) => o.status === 'SCANNED' && o.dispatch_id),
    [orders],
  );
  const visibleOrders = showConfirmed ? orders : orders.filter((o) => o.status !== 'CONFIRMED');

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
          setFeedback({
            kind: 'success',
            message: `Item scanned · ${d.order_id}`,
            detail: 'More tracking IDs pending on this order — scan them.',
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
            Pick a sheet, then scan each shipment's Tracking ID to dispatch.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={(c) => { setChannel(c); setPickedSheet(null); setFeedback(null); }} />
      </header>

      {/* Sheet picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Select a sheet
          </CardTitle>
          <CardDescription>Each sheet is one uploaded order file. Pick one to scan its orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {sheetsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sheets…
            </div>
          ) : sheets.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No sheets yet — import an order file first.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {sheets.map((s) => (
                <SheetTile key={s.id} sheet={s} active={s.id === sheetId} onSelect={() => { setPickedSheet(s.id); setFeedback(null); }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {sheetId && (
        <>
          {/* Sheet insights */}
          {insights && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Sheet progress</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {insights.tracking_scanned}/{insights.tracking_total} tracking IDs scanned
                  </Badge>
                </div>
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${insights.progress_pct}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Total orders" value={insights.total_orders} />
                  <Stat label="Completed" value={insights.completed_orders} tone="emerald" />
                  <Stat label="Pending" value={insights.pending_orders} tone="amber" />
                  <Stat label="Tracking left" value={insights.tracking_remaining} tone="slate" />
                </div>
              </CardContent>
            </Card>
          )}

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
                <CardTitle className="text-base">Orders in this sheet</CardTitle>
                <CardDescription>Each order shows its tracking IDs and scan status.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirmed((v) => !v)}
                >
                  {showConfirmed ? 'Hide confirmed' : 'Show confirmed'}
                </Button>
                <Button
                  size="sm"
                  disabled={scannedOrders.length === 0 || confirmAll.isPending}
                  onClick={() =>
                    confirmAll.mutate(
                      scannedOrders.map((o) => o.dispatch_id!).filter(Boolean),
                      {
                        onSuccess: () => toast.success(`Confirmed ${scannedOrders.length} order(s).`),
                        onError: (e) => toast.error(getErrorMessage(e, 'Bulk confirm failed')),
                      },
                    )
                  }
                >
                  {confirmAll.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming…</>
                  ) : (
                    <><PackageCheck className="mr-2 h-4 w-4" /> Confirm all scanned ({scannedOrders.length})</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {boardQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
                </div>
              ) : visibleOrders.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {orders.length === 0 ? 'No orders in this sheet.' : 'All orders confirmed 🎉'}
                </p>
              ) : (
                visibleOrders.map((order) => <BoardOrderCard key={order.order_id} order={order} />)
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SheetTile({
  sheet,
  active,
  onSelect,
}: {
  sheet: DispatchSheetSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const i = sheet.insights;
  const done = i.completed_orders === i.total_orders && i.total_orders > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{sheet.filename || `Sheet #${sheet.id}`}</span>
        {done ? (
          <Badge className="bg-emerald-600">Done</Badge>
        ) : (
          <Badge variant="secondary" className="tabular-nums">{i.completed_orders}/{i.total_orders}</Badge>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${i.progress_pct}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        {i.tracking_scanned}/{i.tracking_total} tracking IDs · {i.pending_orders} pending
      </div>
    </button>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'emerald' | 'amber' | 'slate' }) {
  const color =
    tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : tone === 'slate' ? 'text-slate-600 dark:text-slate-300'
    : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const STATUS_BADGE: Record<DispatchBoardOrder['status'], { label: string; cls: string }> = {
  CONFIRMED: { label: 'Confirmed', cls: 'bg-sky-600' },
  SCANNED: { label: 'Scanned', cls: 'bg-emerald-600' },
  PARTIAL: { label: 'Partial', cls: 'bg-amber-500' },
  PENDING: { label: 'Pending scan', cls: '' },
};

function BoardOrderCard({ order }: { order: DispatchBoardOrder }) {
  const s = order.status;
  const badge = STATUS_BADGE[s];
  const done = s === 'SCANNED' || s === 'CONFIRMED';
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        s === 'CONFIRMED'
          ? 'border-sky-300/60 bg-sky-50/40 dark:bg-sky-950/20'
          : s === 'SCANNED'
            ? 'border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20'
            : s === 'PARTIAL'
              ? 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
              : 'bg-card'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className={`h-5 w-5 ${s === 'CONFIRMED' ? 'text-sky-500' : 'text-emerald-500'}`} />
          ) : (
            <Circle className={`h-5 w-5 ${s === 'PARTIAL' ? 'text-amber-500' : 'text-muted-foreground/50'}`} />
          )}
          <div>
            <div className="font-mono font-medium">{order.order_id}</div>
            {order.buyer_name ? <div className="text-xs text-muted-foreground">{order.buyer_name}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!order.ready && s === 'PENDING' ? (
            <Badge variant="outline" className="border-amber-400 text-amber-600">Not ready</Badge>
          ) : null}
          <Badge className={badge.cls} variant={badge.cls ? 'default' : 'outline'}>
            {s === 'PARTIAL' ? `${order.tracking_scanned}/${order.tracking_total} scanned` : badge.label}
          </Badge>
          {s === 'SCANNED' && order.dispatch_id ? (
            <ConfirmButton dispatchId={order.dispatch_id} orderId={order.order_id} />
          ) : null}
        </div>
      </div>

      {/* SAP-item variant choice (only when the FSN maps to >1 item) */}
      {order.variants && order.variants.some((v) => v.has_choice) && order.status !== 'CONFIRMED' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-dashed border-amber-300/70 bg-amber-50/40 p-2 dark:bg-amber-950/10">
          {order.variants
            .filter((v) => v.has_choice)
            .map((v) => (
              <MpVariantPicker key={v.line_id} variant={v} />
            ))}
        </div>
      ) : null}

      {/* Per-item tracking IDs */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {order.items.map((it, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${
              it.scanned
                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'text-muted-foreground'
            }`}
            title={it.sku_name}
          >
            {it.scanned ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3 opacity-50" />}
            <span className="font-mono">{it.tracking_id || 'no tracking'}</span>
            <span className="opacity-70">· {it.sku_name} ×{Number(it.quantity)}</span>
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
