/**
 * SAP Delivery Notes — cut ONE delivery note for every confirmed dispatch that is
 * still awaiting one. The page shows a full summary of exactly what will be sent
 * to SAP (customer, warehouse, combined line items, totals) before the operator
 * posts it in a single request.
 *
 * Dispatches land here when the channel's "Defer delivery note" setting is on;
 * otherwise each dispatch posts its own delivery note at confirm time.
 */
import { AlertTriangle, Clock, FileText, CheckCircle2, PackageCheck, PackageX, RefreshCw, Send } from 'lucide-react';
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

import {
  useAwaitingApprovalCount,
  useCutDeliveryNote,
  useDeliveryNoteSummary,
  usePostedDeliveryNotes,
  useReconcileDeliveryNotes,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { EMPTY_RANGE, inRange, MpDateRange, type MpRange } from '../components/MpDateRange';
import { MpFilterBar, MpResultCount, MpSearchInput } from '../components/MpFilters';
import { MpVariantPicker } from '../components/MpVariantPicker';
import type { DeliveryNoteLine, MarketplaceChannel } from '../types/marketplace.types';

const CHANNEL: MarketplaceChannel = 'FLIPKART';
const inr = (v: string | number) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

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

export default function MpDeliveryNotesPage() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const { data: summary, isLoading } = useDeliveryNoteSummary(CHANNEL, warehouseId);
  const cut = useCutDeliveryNote(CHANNEL);
  const reconcile = useReconcileDeliveryNotes(CHANNEL);
  const { data: approval } = useAwaitingApprovalCount(CHANNEL);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const count = summary?.totals.dispatch_count ?? 0;
  const [dnSearch, setDnSearch] = useState('');
  const [dnRange, setDnRange] = useState<MpRange>(EMPTY_RANGE);
  const visibleDispatches = (summary?.dispatches ?? []).filter((d) => {
    if (!inRange(d.order_date, dnRange)) return false;
    const q = dnSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.order_id.toLowerCase().includes(q) || (d.buyer_name ?? '').toLowerCase().includes(q)
    );
  });
  const { data: posted } = usePostedDeliveryNotes(CHANNEL);
  const postedNotes = posted?.notes ?? [];
  const heldForStock = summary?.held_for_stock ?? [];
  // Orders held for stock are still "work" — otherwise the page looks empty with
  // no explanation of where the orders went.
  const hasWork = count > 0 || heldForStock.length > 0;
  const awaitingApproval = approval?.awaiting_approval ?? 0;
  // The warehouse actually in effect: the operator's pick, else the server default.
  const selectedWh = warehouseId ?? summary?.warehouse_id ?? null;
  const warehouses = summary?.warehouses ?? [];

  function doCut() {
    cut.mutate(selectedWh, {
      onSuccess: (r) => {
        setConfirmOpen(false);
        if (r.pending_approval) {
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
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileText className="h-6 w-6 text-muted-foreground" /> SAP Delivery Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Cut one SAP delivery note for all confirmed dispatches awaiting one.
          </p>
        </div>
        <MpChannelSelect value={CHANNEL} onChange={() => {}} />
      </header>

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
            <Button
              variant="outline"
              onClick={doReconcile}
              disabled={reconcile.isPending}
              className="shrink-0"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${reconcile.isPending ? 'animate-spin' : ''}`} />
              {reconcile.isPending ? 'Checking…' : 'Refresh approval status'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : !hasWork ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <PackageCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No dispatches are awaiting a delivery note.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* What will be sent to SAP */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Delivery note summary</CardTitle>
              <CardDescription>Exactly what will be sent to SAP in a single request.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="SAP Customer" value={summary!.card_code || '—'} />
                {warehouses.length > 1 ? (
                  <div className="rounded-md border p-3">
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
                <Field label="Dispatches" value={String(count)} />
              </div>

              <LineTable title="Delivery note lines (finished goods)" lines={summary!.fg_lines} />
              {summary!.post_goods_issue && (
                <LineTable title="Goods issue lines (packing material)" lines={summary!.pm_lines} />
              )}

              <div className="flex flex-wrap gap-4 rounded-md bg-muted/40 p-3 text-sm">
                <span>
                  <span className="text-muted-foreground">Items:</span>{' '}
                  <strong>{summary!.totals.fg_item_count}</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Total qty:</span>{' '}
                  <strong>{Number(summary!.totals.fg_total_quantity)}</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Total value:</span>{' '}
                  <strong>{inr(summary!.totals.total_amount)}</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Included dispatches */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dispatches included ({count})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <MpFilterBar>
                <MpSearchInput
                  value={dnSearch}
                  onChange={setDnSearch}
                  placeholder="Search order ID or buyer…"
                  className="w-full sm:max-w-sm"
                />
                <MpResultCount shown={visibleDispatches.length} total={count} noun="dispatch" />
              </MpFilterBar>
              <MpDateRange value={dnRange} onChange={setDnRange} label="Order date" />
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
                    {visibleDispatches.map((d) => (
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
            </CardContent>
          </Card>

          {heldForStock.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                  <PackageX className="h-4 w-4" /> Held — not enough stock ({heldForStock.length})
                </CardTitle>
                <CardDescription>
                  These orders are ready, but the warehouse doesn&apos;t have the stock yet, so
                  they&apos;re kept out of this delivery note (one short line would fail the whole
                  document). They&apos;ll be included automatically once the stock arrives.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {heldForStock.map((h) => {
                  const pickable = (h.variants ?? []).filter((v) => v.has_choice);
                  return (
                    <div key={h.dispatch_id} className="rounded-md border bg-background p-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-mono">{h.order_id}</span>
                        <span className="text-muted-foreground">{h.reason}</span>
                      </div>
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
              </CardContent>
            </Card>
          )}

          {summary!.blocked.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> Excluded ({summary!.blocked.length})
                </CardTitle>
                <CardDescription>
                  These confirmed dispatches can&apos;t be included until resolved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {summary!.blocked.map((b) => (
                  <div key={b.dispatch_id} className="flex justify-between gap-3">
                    <span className="font-mono">{b.order_id}</span>
                    <span className="text-muted-foreground">{b.reason}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setConfirmOpen(true)} disabled={cut.isPending || count === 0}>
              <Send className="mr-2 h-4 w-4" /> Cut delivery note ({count})
            </Button>
          </div>
        </>
      )}

      {/* Already posted to SAP — the audit trail of what we sent */}
      {postedNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Posted delivery notes ({postedNotes.length})
            </CardTitle>
            <CardDescription>Delivery notes this module posted to SAP, with their SAP metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {postedNotes.map((n) => (
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
                  <span className="text-xs text-muted-foreground">
                    {n.sap?.doc_date ? String(n.sap.doc_date).slice(0, 10) : (n.posted_at ?? '').slice(0, 10)}
                  </span>
                </div>

                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <Meta label="SAP DocEntry" value={String(n.doc_entry)} mono />
                  <Meta label="Customer" value={n.sap?.card_code || '—'} mono />
                  <Meta label="Branch" value={n.sap?.branch_id != null ? String(n.sap.branch_id) : '—'} />
                  <Meta label="Reference" value={n.sap?.num_at_card || '—'} mono />
                </dl>
                {n.sap?.card_name ? (
                  <p className="mt-1 text-xs text-muted-foreground">{n.sap.card_name}</p>
                ) : null}

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
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cut SAP delivery note?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This posts a single SAP delivery note covering <strong>{count}</strong> dispatch(es) with{' '}
            <strong>{summary?.totals.fg_item_count ?? 0}</strong> line item(s). This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={cut.isPending}>
              Cancel
            </Button>
            <Button onClick={doCut} disabled={cut.isPending}>
              <Send className="mr-2 h-4 w-4" /> {cut.isPending ? 'Cutting…' : 'Cut delivery note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}
