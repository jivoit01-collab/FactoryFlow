/**
 * Gate — the out-gate check. After Outward scan + Confirm, an order's parcels are
 * physically ready to leave. A gate person reviews each SHEET (parcel count, buyer,
 * destination, items, DN, tracking IDs) and marks it Approved (OK from gate) or Hold.
 * Defaults to today's sheets; filter by date, gate status or search.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  DoorOpen,
  Loader2,
  Package,
  PackageCheck,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { marketplaceApi } from '../api/marketplace.api';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { inRange, MpDateRange, type MpRange } from '../components/MpDateRange';
import type { GateQueueSheet, MarketplaceChannel } from '../types/marketplace.types';

const TODAY = new Date().toISOString().slice(0, 10);
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'HOLD';
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'HOLD', label: 'Hold' },
];

export default function MpGatePage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [holdSheet, setHoldSheet] = useState<GateQueueSheet | null>(null);
  const [holdRemark, setHoldRemark] = useState('');
  // Filters — default to TODAY's sheets.
  const [range, setRange] = useState<MpRange>({ from: TODAY, to: '' });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const queue = useQuery({
    queryKey: ['mp-gate-queue', channel],
    queryFn: () => marketplaceApi.gateQueue(channel),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mp-gate-queue', channel] });
    qc.invalidateQueries({ queryKey: ['mp-gate-detail'] });
  };

  const approve = useMutation({
    mutationFn: (batchId: number) => marketplaceApi.gateApprove(channel, batchId),
    onSuccess: (r) => {
      toast.success(`Approved ${r.approved} order(s) out from gate.`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not approve.')),
  });

  const hold = useMutation({
    mutationFn: ({ batchId, remarks }: { batchId: number; remarks: string }) =>
      marketplaceApi.gateHold(channel, batchId, remarks),
    onSuccess: (r) => {
      toast.success(`Held ${r.held} order(s) at gate.`);
      setHoldSheet(null);
      setHoldRemark('');
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not hold.')),
  });

  const all = queue.data?.sheets ?? [];
  const sheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => {
      if (!inRange(s.created_at, range)) return false;
      if (statusFilter === 'PENDING' && s.gate_pending === 0) return false;
      if (statusFilter === 'APPROVED' && s.gate_approved === 0) return false;
      if (statusFilter === 'HOLD' && s.gate_hold === 0) return false;
      if (q && !(s.filename || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, range, statusFilter, search]);

  // Tiles reflect the current filter.
  const totals = useMemo(
    () => ({
      sheets: sheets.length,
      parcels: sheets.reduce((n, s) => n + s.parcels, 0),
      pending: sheets.reduce((n, s) => n + s.gate_pending, 0),
    }),
    [sheets],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <DoorOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gate</h1>
            <p className="text-sm text-muted-foreground">
              Confirmed parcels ready to leave — verify a sheet, then approve it out.
            </p>
          </div>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<PackageCheck className="h-4 w-4" />} label="Sheets" value={totals.sheets} />
        <StatTile icon={<Package className="h-4 w-4" />} label="Parcels" value={totals.parcels} />
        <StatTile
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Pending gate"
          value={totals.pending}
          tone={totals.pending ? 'amber' : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-3">
        <MpDateRange value={range} onChange={setRange} label="Uploaded" />
        <div className="flex rounded-lg border bg-background p-0.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                statusFilter === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sheet…"
            className="h-9 pl-8 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {queue.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border p-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading gate queue…
        </div>
      ) : sheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageCheck className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">
              {all.length === 0 ? 'Nothing waiting at the gate.' : 'No sheets match these filters.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {all.length === 0
                ? "Orders appear here once they're confirmed in Outward."
                : 'Try a wider date range or clear the status filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sheets.map((s) => (
            <SheetRow
              key={s.batch_id}
              sheet={s}
              channel={channel}
              open={expanded === s.batch_id}
              onToggle={() => setExpanded((v) => (v === s.batch_id ? null : s.batch_id))}
              onApprove={() => approve.mutate(s.batch_id)}
              onHold={() => setHoldSheet(s)}
              busy={approve.isPending || hold.isPending}
            />
          ))}
        </div>
      )}

      {/* Hold dialog */}
      <Dialog open={!!holdSheet} onOpenChange={(o) => !o && setHoldSheet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold sheet at gate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Flag a problem so these parcels don't leave. Add a short reason.
          </p>
          <Input
            autoFocus
            placeholder="Reason (e.g. count mismatch, damaged box)"
            value={holdRemark}
            onChange={(e) => setHoldRemark(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldSheet(null)} disabled={hold.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={hold.isPending || !holdRemark.trim()}
              onClick={() => holdSheet && hold.mutate({ batchId: holdSheet.batch_id, remarks: holdRemark.trim() })}
            >
              <ShieldAlert className="mr-2 h-4 w-4" /> Hold at gate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SheetRow({
  sheet,
  channel,
  open,
  onToggle,
  onApprove,
  onHold,
  busy,
}: {
  sheet: GateQueueSheet;
  channel: MarketplaceChannel;
  open: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onHold: () => void;
  busy: boolean;
}) {
  const detail = useQuery({
    queryKey: ['mp-gate-detail', channel, sheet.batch_id],
    queryFn: () => marketplaceApi.gateSheetDetail(channel, sheet.batch_id),
    enabled: open,
  });

  const done = sheet.gate_approved;
  const pct = sheet.orders ? Math.round((done / sheet.orders) * 100) : 0;
  const allDone = sheet.gate_pending === 0 && sheet.gate_hold === 0 && sheet.orders > 0;

  return (
    <Card className={`overflow-hidden ${allDone ? 'border-emerald-500/40' : ''}`}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{sheet.filename || `Sheet #${sheet.batch_id}`}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Package className="h-3.5 w-3.5" /> {sheet.parcels} parcels
                </span>
                · {sheet.orders} orders
                {sheet.created_at && <span>· {sheet.created_at.slice(0, 10)}</span>}
              </div>
              {/* progress */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] text-muted-foreground">{done}/{sheet.orders} approved</span>
              </div>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-1.5">
            {sheet.gate_pending > 0 && <Badge variant="secondary">{sheet.gate_pending} pending</Badge>}
            {sheet.gate_hold > 0 && <Badge variant="destructive">{sheet.gate_hold} hold</Badge>}
            {allDone && <Badge className="bg-emerald-600">All approved</Badge>}
            <Button
              size="sm"
              onClick={onApprove}
              disabled={busy || sheet.gate_pending + sheet.gate_hold === 0}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onHold} disabled={busy}>
              <ShieldAlert className="mr-1.5 h-4 w-4" /> Hold
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t bg-muted/20 p-4">
            {detail.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
              </div>
            ) : (
              <>
                <div className="mb-3 text-xs text-muted-foreground">
                  {detail.data?.total_orders} orders · {detail.data?.total_parcels} parcels total
                </div>
                <div className="-mx-2 overflow-x-auto sm:mx-0">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="p-2">Order</th>
                        <th className="p-2">Buyer</th>
                        <th className="p-2">Destination</th>
                        <th className="p-2 text-center">Parcels</th>
                        <th className="p-2">Items</th>
                        <th className="p-2">DN</th>
                        <th className="p-2">Gate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.data?.orders ?? []).map((o) => (
                        <tr key={o.dispatch_id} className="border-b align-top last:border-0">
                          <td className="p-2 font-mono text-xs">{o.order_id}</td>
                          <td className="p-2">{o.buyer_name || '—'}</td>
                          <td className="p-2 text-muted-foreground">
                            {[o.city, o.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="p-2 text-center font-medium">{o.parcels}</td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {o.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}
                          </td>
                          <td className="p-2 font-mono text-xs">{o.dn_number || '—'}</td>
                          <td className="p-2">
                            <GateBadge status={o.gate_status} />
                            {o.gate_remarks && <div className="text-[11px] text-destructive">{o.gate_remarks}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GateBadge({ status }: { status: 'PENDING' | 'APPROVED' | 'HOLD' }) {
  if (status === 'APPROVED') return <Badge className="bg-emerald-600">Approved</Badge>;
  if (status === 'HOLD') return <Badge variant="destructive">Hold</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: 'amber';
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${tone === 'amber' ? 'text-amber-600' : ''}`}>{value}</div>
    </div>
  );
}
