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
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
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
import { EMPTY_RANGE, inRange, MpDateRange, type MpRange } from '../components/MpDateRange';
import { MpFilterBar, MpFilterChips, MpResultCount, MpSearchInput } from '../components/MpFilters';
import { MpScanFeedback, type ScanFeedback } from '../components/MpScanFeedback';
import { MpScanPanel } from '../components/MpScanPanel';
import { MpVariantPicker } from '../components/MpVariantPicker';
import type {
  CarriedOverOrder,
  DispatchBoardOrder,
  DispatchSheetSummary,
  MarketplaceChannel,
} from '../types/marketplace.types';

const WARN_CODES = ['NOT_PACKED', 'NOT_ISSUED', 'ORDER_CANCELLED', 'EMPTY'];

function errorCode(e: unknown): string | undefined {
  return (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

/** Quote a CSV field only when it contains a comma, quote or newline (RFC-4180). */
function csvCell(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_STATUS_LABEL: Record<DispatchBoardOrder['status'], string> = {
  PENDING: 'Pending scan',
  PARTIAL: 'Partial',
  SCANNED: 'Scanned',
  CONFIRMED: 'Confirmed',
};

export default function MpOutwardPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [pickedSheet, setPickedSheet] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODO' | 'SCANNED' | 'CONFIRMED'>('TODO');
  const [sheetRange, setSheetRange] = useState<MpRange>(EMPTY_RANGE);   // sheet upload date
  const [orderRange, setOrderRange] = useState<MpRange>(EMPTY_RANGE);   // order date
  const qc = useQueryClient();

  const sheetsQuery = useDispatchSheets(channel);
  const allSheets = sheetsQuery.data?.sheets ?? [];
  // Narrow the sheet list by when it was uploaded.
  const sheets = useMemo(
    () => allSheets.filter((s) => inRange(s.created_at, sheetRange)),
    [allSheets, sheetRange],
  );
  // Default to the newest visible sheet until the operator picks one.
  const sheetId = pickedSheet && sheets.some((s) => s.id === pickedSheet)
    ? pickedSheet
    : sheets[0]?.id ?? null;

  const boardQuery = useDispatchBoard(channel, sheetId);
  const board = boardQuery.data;
  const orders = board?.orders ?? [];
  const insights = board?.insights;

  const scanMut = useScanDispatchByTracking(channel);

  const scannedOrders = useMemo(
    () => orders.filter((o) => o.status === 'SCANNED' && o.dispatch_id),
    [orders],
  );

  const counts = useMemo(() => ({
    ALL: orders.length,
    TODO: orders.filter((o) => o.status === 'PENDING' || o.status === 'PARTIAL').length,
    SCANNED: orders.filter((o) => o.status === 'SCANNED').length,
    CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED').length,
  }), [orders]);

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === 'TODO' && o.status !== 'PENDING' && o.status !== 'PARTIAL') return false;
      if (statusFilter === 'SCANNED' && o.status !== 'SCANNED') return false;
      if (statusFilter === 'CONFIRMED' && o.status !== 'CONFIRMED') return false;
      if (!inRange(o.order_date, orderRange)) return false;
      if (!q) return true;
      // Match the order, the buyer, or any of its tracking IDs.
      return (
        o.order_id.toLowerCase().includes(q)
        || (o.buyer_name ?? '').toLowerCase().includes(q)
        || o.items.some((i) => (i.tracking_id ?? '').toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, search, orderRange]);

  // Export whatever the board currently shows — the status filter (To scan /
  // Scanned / Confirmed / All), search and date range all apply, so the operator
  // picks the order type via the existing filter and downloads exactly that. One
  // row per shipment (tracking ID) so SKUs and tracking IDs are captured.
  function handleExportCsv() {
    const headers = [
      'Order ID', 'Buyer', 'Order date', 'Status', 'Ready',
      'Tracking scanned', 'Tracking total', 'SKU', 'Marketplace SKU',
      'Quantity', 'Tracking ID', 'Item scanned', 'Dispatch ID',
      'Dispatch status', 'SAP post status',
    ];
    const rows = [headers.join(',')];
    for (const o of visibleOrders) {
      const status = CSV_STATUS_LABEL[o.status] ?? o.status;
      const items = o.items.length > 0 ? o.items : [null];
      for (const it of items) {
        rows.push([
          o.order_id, o.buyer_name, o.order_date ?? '', status,
          o.ready ? 'yes' : 'no', o.tracking_scanned, o.tracking_total,
          it?.sku_name ?? '', it?.marketplace_sku ?? '',
          it ? Number(it.quantity) : '', it?.tracking_id ?? '',
          it ? (it.scanned ? 'yes' : 'no') : '',
          o.dispatch_id ?? '', o.dispatch_status ?? '', o.sap_post_status ?? '',
        ].map(csvCell).join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sheetName = (board?.sheet.filename || `sheet-${sheetId}`)
      .replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
    a.download = `outward_${channel}_${sheetName}_${statusFilter.toLowerCase()}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <CardContent className="space-y-3">
          <MpFilterBar>
            <MpDateRange value={sheetRange} onChange={setSheetRange} label="Uploaded" />
            <MpResultCount shown={sheets.length} total={allSheets.length} noun="sheet" />
          </MpFilterBar>
          {sheetsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sheets…
            </div>
          ) : sheets.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {allSheets.length === 0
                ? 'No sheets yet — import an order file first.'
                : 'No sheets uploaded in this date range.'}
            </p>
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
                  variant="outline"
                  disabled={visibleOrders.length === 0}
                  onClick={handleExportCsv}
                  title="Download the orders currently shown (respects the status filter, search and date range)"
                >
                  <Download className="mr-2 h-4 w-4" /> Download CSV ({visibleOrders.length})
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
              <MpFilterBar className="pb-1">
                <MpSearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search order ID, buyer or tracking ID…"
                  className="w-full sm:max-w-sm"
                />
                <MpFilterChips
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'TODO', label: 'To scan', count: counts.TODO },
                    { value: 'SCANNED', label: 'Scanned', count: counts.SCANNED },
                    { value: 'CONFIRMED', label: 'Confirmed', count: counts.CONFIRMED },
                    { value: 'ALL', label: 'All', count: counts.ALL },
                  ]}
                />
              </MpFilterBar>
              <MpDateRange value={orderRange} onChange={setOrderRange} label="Order date" />
              <MpResultCount shown={visibleOrders.length} total={orders.length} noun="order" />
              {boardQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
                </div>
              ) : visibleOrders.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {orders.length === 0
                    ? 'No orders in this sheet.'
                    : search.trim()
                      ? `Nothing matches “${search.trim()}”.`
                      : statusFilter === 'TODO'
                        ? 'Nothing left to scan — every order is done 🎉'
                        : 'No orders in this filter.'}
                </p>
              ) : (
                visibleOrders.map((order) => <BoardOrderCard key={order.order_id} order={order} />)
              )}
            </CardContent>
          </Card>

          <CarriedOverSection
            items={board?.carried_over ?? []}
            onOpenSheet={(id) => { setPickedSheet(id); setFeedback(null); }}
          />
        </>
      )}
    </div>
  );
}

/** Plain-language reason an order was not imported onto this sheet. */
function carriedReason(c: CarriedOverOrder): string {
  const where = c.kept_on_filename ? `“${c.kept_on_filename}”` : 'an earlier sheet';
  if (c.reason === 'DISPATCHED') {
    const done = (c.dispatch_status || '').toUpperCase() === 'CONFIRMED';
    return `${done ? 'already dispatched' : 'already being scanned'} on ${where}`;
  }
  if (c.reason === 'DUPLICATE') return `already imported on ${where} (not re-imported)`;
  return `kept on ${where}`;
}

/** Collapsed-by-default list of orders that stayed on an earlier sheet. Informational —
 *  these are NOT lost and NOT pending here. */
function CarriedOverSection({
  items,
  onOpenSheet,
}: {
  items: CarriedOverOrder[];
  onOpenSheet: (batchId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {items.length} order{items.length === 1 ? '' : 's'} carried over from an earlier sheet
        </span>
        <Badge variant="secondary">Not lost · not pending here</Badge>
      </button>
      {open && (
        <div className="space-y-2 border-t p-4">
          <p className="text-xs text-muted-foreground">
            These orders were in the uploaded file but are already being processed on an earlier
            sheet, so they were left there. They are not missing, and nothing here is pending for
            them.
          </p>
          {items.map((c) => (
            <div key={c.order_id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-mono font-medium">{c.order_id}</span>
                  {c.buyer_name ? (
                    <span className="ml-2 text-muted-foreground">{c.buyer_name}</span>
                  ) : null}
                </div>
                {c.kept_on_batch_id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenSheet(c.kept_on_batch_id as number)}
                  >
                    Open its sheet →
                  </Button>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{carriedReason(c)}</div>
              {c.tracking_ids.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {c.tracking_ids.map((t) => (
                    <span
                      key={t}
                      className="rounded border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
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
      {sheet.carried_over_count > 0 && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          +{sheet.carried_over_count} carried over from an earlier sheet
        </div>
      )}
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
