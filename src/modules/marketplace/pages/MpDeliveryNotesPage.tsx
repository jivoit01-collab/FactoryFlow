/**
 * SAP Delivery Notes — cut ONE delivery note for every confirmed dispatch that is
 * still awaiting one. The page shows a full summary of exactly what will be sent
 * to SAP (customer, warehouse, combined line items, totals) before the operator
 * posts it in a single request.
 *
 * Layout: a KPI strip up top, a pinned SAP summary (totals band + collapsible line
 * items) with the Cut action, then ONE list at a time — Ready / Held / Blocked /
 * Posted — switched by segmented chips and narrowed by a shared search + date
 * filter, so the page stays scannable instead of one long stack of cards.
 */
import {
  AlertTriangle,
  ChevronDown,
  Clipboard,
  Clock,
  Download,
  FileText,
  PackageCheck,
  PackageX,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { marketplaceApi } from '../api/marketplace.api';
import { useMpChannel } from '../hooks/useMpChannel';
import {
  useAwaitingApprovalCount,
  useCutDeliveryNote,
  useDeliveryNoteSheets,
  useDeliveryNoteSummary,
  usePostedDeliveryNotes,
  useReconcileDeliveryNotes,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { EMPTY_RANGE, inRange, MpDateRange, type MpRange } from '../components/MpDateRange';
import { MpFilterBar, MpFilterChips, MpResultCount, MpSearchInput } from '../components/MpFilters';
import { MpVariantPicker } from '../components/MpVariantPicker';
import type {
  DeliveryNoteLine,
  DeliveryNoteSummary,
  MarketplaceChannel,
  StockShortfallLine,
} from '../types/marketplace.types';

const inr = (v: string | number) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** Format a plain YYYY-MM-DD posting date. Parsed by parts, never through Date —
 *  a date-only value has no timezone, and `new Date('2026-07-31')` is UTC midnight,
 *  which reads as the 30th anywhere west of Greenwich. */
const fmtDate = (iso: string) => {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d} ${MONTHS[Number(m) - 1]?.slice(0, 3)} ${y}` : (iso ?? '');
};
const fmtMonth = (iso: string) => {
  const [y, m] = (iso || '').split('-');
  return y && m ? `${MONTHS[Number(m) - 1]} ${y}` : (iso ?? '');
};

type Tab = 'READY' | 'HELD' | 'BLOCKED' | 'POSTED';

function LineTable({ title, lines }: { title: string; lines: DeliveryNoteLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="-mx-2 overflow-x-auto rounded-md border sm:mx-0">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2 text-right">Quantity</th>
              <th className="p-2">Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={`${l.item_code}-${l.warehouse_code}`} className="border-b last:border-0">
                <td className="p-2">
                  <div className="font-mono">{l.item_code}</div>
                  <div className="text-xs text-muted-foreground">{l.item_name}</div>
                </td>
                <td className="p-2 text-right font-medium">
                  {Number(l.quantity)} {l.uom}
                </td>
                <td className="p-2 font-mono text-xs">{l.warehouse_code || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono' : ''}>{value}</dd>
    </div>
  );
}

/** A single labelled figure in the summary/KPI bands. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

const KPI_TONE: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  violet: 'text-violet-600 dark:text-violet-400',
  sky: 'text-sky-600 dark:text-sky-400',
  slate: 'text-slate-600 dark:text-slate-300',
};

/** One clickable KPI tile in the overview strip (jumps to its list when onClick). */
function KpiTile({
  label,
  value,
  tone = 'slate',
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  tone?: keyof typeof KPI_TONE;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : onClick
            ? 'hover:bg-muted/50'
            : 'cursor-default'
      }`}
    >
      <div className={`text-2xl font-semibold tabular-nums ${KPI_TONE[tone]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
}

/** Plain-text list an operator can paste to the warehouse (WhatsApp / email). */
function buildRequestText(summary: DeliveryNoteSummary, lines: StockShortfallLine[]) {
  const header = `Stock needed — ${summary.channel}${
    summary.warehouse_code ? ` · ${summary.warehouse_code}` : ''
  }`;
  const body = lines
    .map((l) => `${l.item_code} ${l.item_name ? `(${l.item_name}) ` : ''}— need ${Number(
      l.shortfall_quantity,
    )} ${l.uom} (have ${Number(l.available_quantity)}, required ${Number(l.required_quantity)})`)
    .join('\n');
  return `${header}\n\n${body}`;
}

function StockShortfallDialog({
  open,
  onOpenChange,
  summary,
  lines,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary: DeliveryNoteSummary;
  lines: StockShortfallLine[];
}) {
  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(buildRequestText(summary, lines));
      toast.success('Stock request copied — paste it to the warehouse.');
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-amber-600" /> Stock needed from warehouse
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          These finished goods are short in{' '}
          <span className="font-mono">{summary.warehouse_code || 'the warehouse'}</span>. Request
          the shortfall and the held orders join the delivery note automatically once it arrives.
        </p>
        <div className="-mx-1 max-h-[50vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="sticky top-0 border-b bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Item</th>
                <th className="p-2 text-right">Required</th>
                <th className="p-2 text-right">In stock</th>
                <th className="p-2 text-right">Short</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.item_code} className="border-b last:border-0">
                  <td className="p-2">
                    <div className="font-mono">{l.item_code}</div>
                    <div className="text-xs text-muted-foreground">{l.item_name}</div>
                  </td>
                  <td className="p-2 text-right">
                    {Number(l.required_quantity)} {l.uom}
                  </td>
                  <td className="p-2 text-right text-muted-foreground">
                    {Number(l.available_quantity)}
                  </td>
                  <td className="p-2 text-right font-semibold text-amber-700">
                    {Number(l.shortfall_quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={copyRequest}>
            <Clipboard className="mr-2 h-4 w-4" /> Copy request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MpDeliveryNotesPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useMpChannel();

  // Download a posted delivery note's items (item, qty + DN/warehouse/order/HSN/amount).
  async function downloadDnCsv(docEntry: number) {
    try {
      const { blob, filename } = await marketplaceApi.exportDeliveryNoteCsv(docEntry, channel);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not download the delivery-note CSV.'));
    }
  }
  // Deep-link a short item to its mapping (or combo) editor so the operator can
  // add an alternative SAP item that IS in stock. Masters resolves item → the
  // right SKU mapping or combo (create if unmapped).
  const openAddAlternative = (itemCode: string) => {
    const qs = new URLSearchParams({ channel: channel, item: itemCode });
    navigate(`/marketplace/masters?${qs.toString()}`);
  };
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  // null = all sheets; a number scopes the whole page + cut to that sheet.
  const [batchId, setBatchId] = useState<number | null>(null);
  const { data: sheetsData } = useDeliveryNoteSheets(channel);
  const dnSheets = sheetsData?.sheets ?? [];
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetRange, setSheetRange] = useState<MpRange>(EMPTY_RANGE);
  const currentSheet = dnSheets.find((s) => s.id === batchId) ?? null;
  const scopeLabel = currentSheet
    ? `sheet "${currentSheet.filename || `#${currentSheet.id}`}"`
    : 'all sheets';
  const visibleSheets = dnSheets.filter((s) => {
    if (!inRange(s.created_at, sheetRange)) return false;
    const q = sheetSearch.trim().toLowerCase();
    return !q || (s.filename || `#${s.id}`).toLowerCase().includes(q);
  });
  const { data: summary, isLoading } = useDeliveryNoteSummary(channel, warehouseId, batchId);
  const cut = useCutDeliveryNote(channel);
  const reconcile = useReconcileDeliveryNotes(channel);
  const { data: approval } = useAwaitingApprovalCount(channel);
  const { data: posted } = usePostedDeliveryNotes(channel);

  const [confirmOpen, setConfirmOpen] = useState(false);
  // SAP DocDate for the cut. Empty = the server default (today). Set only when the
  // operator deliberately posts into a closed month.
  const [docDate, setDocDate] = useState('');
  const [shortfallOpen, setShortfallOpen] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [tab, setTab] = useState<Tab>('READY');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<MpRange>(EMPTY_RANGE);

  const count = summary?.totals.dispatch_count ?? 0;
  const dispatches = summary?.dispatches ?? [];
  const heldForStock = summary?.held_for_stock ?? [];
  const blocked = summary?.blocked ?? [];
  const stockShortfall = summary?.stock_shortfall ?? [];
  const postedNotes = posted?.notes ?? [];
  const awaitingApproval = approval?.awaiting_approval ?? 0;

  const hasWork = count > 0 || heldForStock.length > 0 || blocked.length > 0;
  const hasAnything = hasWork || postedNotes.length > 0 || awaitingApproval > 0;

  // The warehouse actually in effect: the operator's pick, else the server default.
  const selectedWh = warehouseId ?? summary?.warehouse_id ?? null;
  const warehouses = summary?.warehouses ?? [];

  // Shared filter — a case-insensitive text match plus the order-date range.
  const q = search.trim().toLowerCase();
  const matches = (...vals: (string | null | undefined)[]) =>
    !q || vals.some((v) => (v ?? '').toLowerCase().includes(q));

  const readyList = dispatches.filter(
    (d) => inRange(d.order_date, range) && matches(d.order_id, d.buyer_name),
  );
  const heldList = heldForStock.filter(
    (h) => inRange(h.order_date ?? null, range) && matches(h.order_id, h.buyer_name),
  );
  const blockedList = blocked.filter((b) => matches(b.order_id, b.reason));
  const postedList = postedNotes.filter((n) => {
    if (!inRange((n.sap?.doc_date ?? n.posted_at ?? '').slice(0, 10) || null, range)) return false;
    if (!q) return true;
    const hay = [n.doc_num, n.sap?.doc_num, ...(n.orders ?? []).map((o) => o.order_id)]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  const shownCount =
    tab === 'READY'
      ? readyList.length
      : tab === 'HELD'
        ? heldList.length
        : tab === 'BLOCKED'
          ? blockedList.length
          : postedList.length;
  const totalForTab =
    tab === 'READY'
      ? dispatches.length
      : tab === 'HELD'
        ? heldForStock.length
        : tab === 'BLOCKED'
          ? blocked.length
          : postedNotes.length;

  function doCut() {
    cut.mutate({ warehouseId: selectedWh, batchId, docDate: docDate || null }, {
      onSuccess: (r) => {
        setConfirmOpen(false);
        setDocDate('');
        if (r.backdated) {
          // Posting into a closed month is the exception, so say so on its own —
          // a line inside the normal success toast would be skimmed past.
          toast.warning(`Posted into ${r.doc_month}`, {
            description: `These delivery notes carry ${fmtDate(r.doc_date)}, not today. SAP booked the stock movement into ${r.doc_month}.`,
            duration: 10000,
          });
        }
        const groups = r.groups ?? [];
        if (groups.length > 1) {
          const parts = groups.map(
            (g) =>
              `${g.ship_to_code || 'default'}: ${
                g.pending_approval ? 'awaiting approval' : g.delivery_note_num || 'posted'
              } (${g.dispatch_count})`,
          );
          toast.success(`Cut ${groups.length} delivery notes — ${parts.join(' · ')}`);
        } else if (r.pending_approval) {
          toast.success(
            `Delivery note submitted to SAP for approval (draft ${r.draft_entry ?? ''}) for ${r.dispatch_count} dispatch(es). It posts once approved in SAP.`,
          );
        } else {
          toast.success(
            `Delivery note ${r.delivery_note_num || '(posted)'} cut for ${r.dispatch_count} dispatch(es).`,
          );
        }
      },
      onError: (e: unknown) => {
        setConfirmOpen(false);
        toast.error(getErrorMessage(e, 'Could not cut delivery note'));
      },
    });
  }

  // ── Posting date ──────────────────────────────────────────────────────────
  // Today unless the operator picks otherwise. A date in an earlier month posts
  // into that month's books and numbering series, so it is called out loudly.
  const today = summary?.doc_date ?? '';
  const chosenDate = docDate || today;
  const monthOf = (d: string) => d.slice(0, 7);
  const isBackdated = Boolean(today && chosenDate && monthOf(chosenDate) !== monthOf(today));
  const spansMonths = (summary?.confirmed_months ?? []).length > 1;
  const canBackdate = Boolean(summary?.can_backdate);
  // Earliest selectable: the goods must already be confirmed out, and without the
  // permission the operator cannot leave the current month at all.
  const minDate = [
    summary?.doc_date_min ?? '',
    canBackdate ? (summary?.doc_date_floor ?? '') : `${monthOf(today)}-01`,
  ]
    .filter(Boolean)
    .sort()
    .pop() ?? '';

  function doReconcile() {
    reconcile.mutate(undefined, {
      onSuccess: (r) => {
        if (r.finalized.length) {
          toast.success(`${r.finalized.length} delivery note(s) approved & posted.`);
        } else if (r.rejected.length) {
          toast.warning(`${r.rejected.length} approval(s) were rejected — cut them again.`);
        } else {
          toast.info(`${r.still_pending} still awaiting approval in SAP.`);
        }
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not refresh approval status')),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileText className="h-6 w-6 text-muted-foreground" /> SAP Delivery Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Cut one SAP delivery note for all confirmed dispatches awaiting one.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      {/* Sheet scope — post the delivery note per sheet, or all sheets together */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sheet</CardTitle>
          <CardDescription>
            Post a delivery note for one sheet, or keep &quot;All sheets&quot; to cut everything awaiting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dnSheets.length > 1 && (
            <>
              <MpFilterBar>
                <MpSearchInput
                  value={sheetSearch}
                  onChange={setSheetSearch}
                  placeholder="Search sheet…"
                  className="w-full sm:max-w-xs"
                />
                <MpResultCount shown={visibleSheets.length} total={dnSheets.length} noun="sheet" />
              </MpFilterBar>
              <MpDateRange value={sheetRange} onChange={setSheetRange} label="Uploaded" />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <SheetChip
              label="All sheets"
              sub={`${dnSheets.reduce((n, s) => n + s.awaiting_count, 0)} awaiting`}
              active={batchId === null}
              onClick={() => setBatchId(null)}
            />
            {visibleSheets.map((s) => (
              <SheetChip
                key={s.id}
                label={s.filename || `Sheet #${s.id}`}
                sub={`${s.awaiting_count} awaiting${s.posted_count ? ` · ${s.posted_count} posted` : ''}`}
                active={batchId === s.id}
                onClick={() => setBatchId(s.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : !hasAnything ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <PackageCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No dispatches are awaiting a delivery note.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI overview — click a tile to jump to its list */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <KpiTile label="Ready to cut" value={count} tone="emerald" active={tab === 'READY'} onClick={() => setTab('READY')} />
            <KpiTile label="Held — stock" value={heldForStock.length} tone="amber" active={tab === 'HELD'} onClick={() => setTab('HELD')} />
            <KpiTile label="Blocked" value={blocked.length} tone="red" active={tab === 'BLOCKED'} onClick={() => setTab('BLOCKED')} />
            <KpiTile label="Awaiting SAP" value={awaitingApproval} tone="violet" />
            <KpiTile label="Posted" value={postedNotes.length} tone="sky" active={tab === 'POSTED'} onClick={() => setTab('POSTED')} />
          </div>

          {/* Awaiting-approval banner (its own action) */}
          {awaitingApproval > 0 && (
            <Card className="border-amber-500/40">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <span>
                    <strong>{awaitingApproval}</strong> delivery note dispatch(es) are{' '}
                    <strong>awaiting approval in SAP</strong>. They post automatically once approved —
                    use refresh to check.
                  </span>
                </div>
                <Button variant="outline" onClick={doReconcile} disabled={reconcile.isPending} className="shrink-0">
                  <RefreshCw className={`mr-2 h-4 w-4 ${reconcile.isPending ? 'animate-spin' : ''}`} />
                  {reconcile.isPending ? 'Checking…' : 'Refresh approval status'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pinned SAP summary + Cut action */}
          {hasWork && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Delivery note summary</CardTitle>
                <CardDescription>Exactly what will be sent to SAP in a single request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="SAP Customer" value={summary!.card_code || '—'} />
                  {warehouses.length > 1 ? (
                    <div className="rounded-md border p-2">
                      <div className="text-xs text-muted-foreground">Warehouse</div>
                      <select
                        value={selectedWh ?? ''}
                        onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
                        className="mt-1 h-8 w-full rounded border bg-background px-1 text-sm font-medium"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.sap_warehouse_code}
                            {w.is_default ? ' (default)' : ''} — {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <Field label="Warehouse" value={summary!.warehouse_code || '—'} />
                  )}
                  <Field label="Doc date" value={summary!.doc_date} />
                  <Field label="Goods issue" value={summary!.post_goods_issue ? 'Yes (packing)' : 'No'} />
                </div>

                {/* Totals band */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Dispatches" value={String(count)} />
                  <Field label="Line items" value={String(summary!.totals.fg_item_count)} />
                  <Field label="Total qty" value={String(Number(summary!.totals.fg_total_quantity))} />
                  <Field label="Total value" value={inr(summary!.totals.total_amount)} />
                </div>

                {/* Collapsible line items — hidden by default to reduce clutter */}
                {(summary!.fg_lines.length > 0 || summary!.pm_lines.length > 0) && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => setShowLines((v) => !v)}
                    >
                      <ChevronDown className={`mr-1 h-4 w-4 transition-transform ${showLines ? 'rotate-180' : ''}`} />
                      {showLines ? 'Hide' : 'View'} line items ({summary!.totals.fg_item_count})
                    </Button>
                    {showLines && (
                      <div className="mt-2 space-y-4">
                        <LineTable title="Delivery note lines (finished goods)" lines={summary!.fg_lines} />
                        {summary!.post_goods_issue && (
                          <LineTable title="Goods issue lines (packing material)" lines={summary!.pm_lines} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setConfirmOpen(true)} disabled={cut.isPending || count === 0}>
                    <Send className="mr-2 h-4 w-4" /> Cut delivery note ({count})
                    {currentSheet ? ' · this sheet' : ''}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segmented lists — one at a time, shared filter */}
          <Card>
            <CardHeader className="pb-3">
              <MpFilterChips
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'READY', label: 'Ready to cut', count },
                  { value: 'HELD', label: 'Held — stock', count: heldForStock.length },
                  { value: 'BLOCKED', label: 'Blocked', count: blocked.length },
                  { value: 'POSTED', label: 'Posted', count: postedNotes.length },
                ]}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <MpFilterBar>
                <MpSearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder={tab === 'POSTED' ? 'Search DN no. or order…' : 'Search order ID or buyer…'}
                  className="w-full sm:max-w-sm"
                />
                <MpResultCount shown={shownCount} total={totalForTab} noun={tab === 'POSTED' ? 'note' : 'order'} />
              </MpFilterBar>
              {tab !== 'BLOCKED' && <MpDateRange value={range} onChange={setRange} label={tab === 'POSTED' ? 'Posted date' : 'Order date'} />}

              {tab === 'HELD' && stockShortfall.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50/50 p-2 text-sm dark:bg-amber-950/20">
                  <span className="text-amber-800 dark:text-amber-300">
                    {stockShortfall.length} finished good(s) short across held orders.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                    onClick={() => setShortfallOpen(true)}
                  >
                    <PackageX className="mr-2 h-4 w-4" /> Stock needed ({stockShortfall.length})
                  </Button>
                </div>
              )}

              {/* READY */}
              {tab === 'READY' &&
                (readyList.length === 0 ? (
                  <EmptyRow text={dispatches.length === 0 ? 'Nothing is ready to cut.' : 'Nothing matches this filter.'} />
                ) : (
                  <div className="-mx-2 overflow-x-auto sm:mx-0">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="border-b text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="p-3">Order</th>
                          <th className="p-3">Order date</th>
                          <th className="p-3">Buyer</th>
                          <th className="p-3">Ship as</th>
                          <th className="p-3 text-right">Lines</th>
                          <th className="p-3 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readyList.map((d) => (
                          <tr key={d.dispatch_id} className="border-b last:border-0">
                            <td className="p-3 font-mono font-medium">{d.order_id}</td>
                            <td className="p-3 whitespace-nowrap text-muted-foreground">{d.order_date || '—'}</td>
                            <td className="p-3 text-muted-foreground">{d.buyer_name || '—'}</td>
                            <td className="p-3">
                              {(d.variants ?? []).filter((v) => v.has_choice).length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {(d.variants ?? [])
                                    .filter((v) => v.has_choice)
                                    .map((v) => (
                                      <MpVariantPicker key={v.line_id} variant={v} />
                                    ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right">{d.fg_line_count}</td>
                            <td className="p-3 text-right">{inr(d.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

              {/* HELD */}
              {tab === 'HELD' &&
                (heldList.length === 0 ? (
                  <EmptyRow text={heldForStock.length === 0 ? 'No orders held for stock.' : 'Nothing matches this filter.'} />
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Ready orders the warehouse can&apos;t stock yet — kept out so one short line
                      can&apos;t fail the whole document. They join automatically once stock arrives,
                      or switch a variant below to an item you have.
                    </p>
                    {heldList.map((h) => {
                      const pickable = (h.variants ?? []).filter((v) => v.has_choice);
                      const shortItems = h.short_items ?? [];
                      return (
                        <div key={h.dispatch_id} className="rounded-md border bg-background p-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-mono font-medium">{h.order_id}</span>
                            {shortItems.length === 0 && (
                              <span className="text-muted-foreground">{h.reason}</span>
                            )}
                          </div>
                          {shortItems.length > 0 && (
                            <div className="mt-2 overflow-x-auto rounded-md border">
                              <table className="w-full min-w-[420px] text-xs">
                                <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                                  <tr>
                                    <th className="p-2">Short item</th>
                                    <th className="p-2 text-right">Needed</th>
                                    <th className="p-2 text-right">In stock</th>
                                    <th className="p-2 text-right">Short by</th>
                                    <th className="p-2 text-right"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {shortItems.map((s) => (
                                    <tr key={s.item_code} className="border-b last:border-0">
                                      <td className="p-2">
                                        <div className="font-mono">{s.item_code}</div>
                                        <div className="text-muted-foreground">{s.item_name || '—'}</div>
                                      </td>
                                      <td className="p-2 text-right">
                                        {Number(s.required_quantity)} {s.uom}
                                      </td>
                                      <td className="p-2 text-right text-muted-foreground">
                                        {Number(s.available_quantity)}
                                      </td>
                                      <td className="p-2 text-right font-semibold text-amber-700">
                                        {Number(s.shortfall_quantity)}
                                      </td>
                                      <td className="p-2 text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 gap-1 px-2 text-xs"
                                          onClick={() => openAddAlternative(s.item_code)}
                                          title="Add an alternative SAP item or combo for this product in Masters"
                                        >
                                          <Plus className="h-3 w-3" />
                                          Add alternative
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {pickable.length > 0 ? (
                            <div className="mt-2 border-t pt-2">
                              <p className="mb-1.5 text-xs text-muted-foreground">
                                This product can ship as another SAP item — switch it to one you have
                                in stock and the order joins this delivery note.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {pickable.map((v) => (
                                  <MpVariantPicker key={v.line_id} variant={v} />
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}

              {/* BLOCKED */}
              {tab === 'BLOCKED' &&
                (blockedList.length === 0 ? (
                  <EmptyRow text={blocked.length === 0 ? 'Nothing is blocked.' : 'Nothing matches this filter.'} />
                ) : (
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" /> Confirmed dispatches that can&apos;t be
                      included until resolved.
                    </p>
                    {blockedList.map((b) => (
                      <div key={b.dispatch_id} className="flex flex-wrap justify-between gap-3 rounded-md border bg-background p-2">
                        <span className="font-mono font-medium">{b.order_id}</span>
                        <span className="text-muted-foreground">{b.reason}</span>
                      </div>
                    ))}
                  </div>
                ))}

              {/* POSTED */}
              {tab === 'POSTED' &&
                (postedList.length === 0 ? (
                  <EmptyRow text={postedNotes.length === 0 ? 'No delivery notes posted yet.' : 'Nothing matches this filter.'} />
                ) : (
                  <div className="space-y-3">
                    {postedList.map((n) => (
                      <div key={n.doc_entry} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-base font-semibold">{n.sap?.doc_num || n.doc_num}</span>
                            {n.sap?.cancelled ? (
                              <Badge variant="destructive">Cancelled in SAP</Badge>
                            ) : (
                              <Badge className="bg-emerald-600">Posted</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {n.dispatch_count} order{n.dispatch_count === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {n.sap?.doc_date ? String(n.sap.doc_date).slice(0, 10) : (n.posted_at ?? '').slice(0, 10)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadDnCsv(n.doc_entry)}
                              title="Download this delivery note's items as CSV"
                            >
                              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                            </Button>
                          </div>
                        </div>

                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                          <Meta label="SAP DocEntry" value={String(n.doc_entry)} mono />
                          <Meta label="Customer" value={n.sap?.card_code || '—'} mono />
                          <Meta label="Branch" value={n.sap?.branch_id != null ? String(n.sap.branch_id) : '—'} />
                          <Meta label="Reference" value={n.sap?.num_at_card || '—'} mono />
                        </dl>
                        {n.sap?.card_name ? <p className="mt-1 text-xs text-muted-foreground">{n.sap.card_name}</p> : null}

                        {(n.lines ?? []).length > 0 && (
                          <div className="mt-2 overflow-x-auto rounded-md border">
                            <table className="w-full min-w-[420px] text-xs">
                              <thead className="border-b text-left text-muted-foreground">
                                <tr>
                                  <th className="p-2">Item shipped</th>
                                  <th className="p-2 text-right">Qty</th>
                                  <th className="p-2">Warehouse</th>
                                  <th className="p-2">Cost centre</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(n.lines ?? []).map((l, i) => (
                                  <tr key={i} className="border-b last:border-0">
                                    <td className="p-2">
                                      <span className="font-mono">{l.item_code}</span>
                                      <div className="text-muted-foreground">{l.item_name}</div>
                                    </td>
                                    <td className="p-2 text-right font-medium">{Number(l.quantity)}</td>
                                    <td className="p-2 font-mono">{l.warehouse_code || '—'}</td>
                                    <td className="p-2">{l.cost_center || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {n.orders.map((o) => (
                            <span key={o.order_id}>
                              <span className="font-mono">{o.order_id}</span>
                              {o.invoice_number ? ` · bill ${o.invoice_number}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}

      {summary && stockShortfall.length > 0 && (
        <StockShortfallDialog
          open={shortfallOpen}
          onOpenChange={setShortfallOpen}
          summary={summary}
          lines={stockShortfall}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cut SAP delivery note?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This posts the SAP delivery note(s) for <strong>{scopeLabel}</strong>, covering{' '}
            <strong>{count}</strong> dispatch(es) with{' '}
            <strong>{summary?.totals.fg_item_count ?? 0}</strong> line item(s). This can&apos;t be undone.
          </p>

          <div className="space-y-2">
            <label htmlFor="dn-doc-date" className="text-sm font-medium">
              Posting date
            </label>
            <input
              id="dn-doc-date"
              type="date"
              value={chosenDate}
              min={minDate || undefined}
              max={today || undefined}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {canBackdate
                ? 'Defaults to today. Choose a date in last month to post the note into that month.'
                : 'Defaults to today. Posting into a previous month needs extra permission.'}
            </p>
          </div>

          {isBackdated && (
            <div className="flex gap-2 rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  This posts into a previous month
                </p>
                <p className="text-amber-800 dark:text-amber-300/90">
                  The note will carry <strong>{fmtDate(chosenDate)}</strong>, not today. SAP books
                  the stock movement into that month and numbers the document from that
                  month&apos;s series. Make sure the period is still open and accounts expect it.
                </p>
              </div>
            </div>
          )}

          {isBackdated && spansMonths && (
            <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p>
                These dispatches were confirmed across{' '}
                <strong>{(summary?.confirmed_months ?? []).join(', ')}</strong>. Back-dating a mixed
                selection is refused — filter to a single month first, otherwise one month&apos;s
                orders would land in another month&apos;s books.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={cut.isPending}>
              Cancel
            </Button>
            <Button onClick={doCut} disabled={cut.isPending || (isBackdated && spansMonths)}>
              <Send className="mr-2 h-4 w-4" />
              {cut.isPending
                ? 'Cutting…'
                : isBackdated
                  ? `Cut into ${fmtMonth(chosenDate)}`
                  : 'Cut delivery note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SheetChip({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
        active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/50'
      }`}
    >
      <div className="max-w-[220px] truncate text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}
