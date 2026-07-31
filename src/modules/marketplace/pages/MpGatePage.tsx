/**
 * Gate — the out-gate check. After Outward scan + Confirm, an order's parcels are
 * physically ready to leave. A gate person reviews each SHEET (parcel count, buyer,
 * destination, items, DN, tracking IDs) and marks it Approved (OK from gate) or Hold.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, DoorOpen, Loader2, PackageCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
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
import type { GateQueueSheet, MarketplaceChannel } from '../types/marketplace.types';

export default function MpGatePage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [holdSheet, setHoldSheet] = useState<GateQueueSheet | null>(null);
  const [holdRemark, setHoldRemark] = useState('');
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

  const sheets = queue.data?.sheets ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <DoorOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gate</h1>
            <p className="text-sm text-muted-foreground">
              Confirmed parcels ready to leave — verify each sheet and approve it out.
            </p>
          </div>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Sheets ready" value={queue.data?.total_sheets ?? 0} />
        <StatTile label="Parcels" value={queue.data?.total_parcels ?? 0} />
        <StatTile label="Pending gate" value={queue.data?.total_pending ?? 0} tone="amber" />
      </div>

      {queue.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border p-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading gate queue…
        </div>
      ) : sheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageCheck className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">Nothing waiting at the gate.</p>
            <p className="text-sm text-muted-foreground">
              Orders appear here once they're confirmed in Outward.
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

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{sheet.filename || `Sheet #${sheet.batch_id}`}</div>
            <div className="text-xs text-muted-foreground">
              {sheet.orders} order(s) · <strong>{sheet.parcels} parcel(s)</strong>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {sheet.gate_pending > 0 && <Badge variant="secondary">{sheet.gate_pending} pending</Badge>}
            {sheet.gate_approved > 0 && (
              <Badge className="bg-emerald-600">{sheet.gate_approved} approved</Badge>
            )}
            {sheet.gate_hold > 0 && <Badge variant="destructive">{sheet.gate_hold} hold</Badge>}
          </div>
        </button>

        {open && (
          <div className="border-t p-4">
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
                    <thead className="border-b text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2">Order</th>
                        <th className="p-2">Buyer</th>
                        <th className="p-2">Destination</th>
                        <th className="p-2">Parcels</th>
                        <th className="p-2">Items</th>
                        <th className="p-2">DN</th>
                        <th className="p-2">Gate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.data?.orders ?? []).map((o) => (
                        <tr key={o.dispatch_id} className="border-b last:border-0 align-top">
                          <td className="p-2 font-mono text-xs">{o.order_id}</td>
                          <td className="p-2">{o.buyer_name || '—'}</td>
                          <td className="p-2 text-muted-foreground">
                            {[o.city, o.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="p-2 font-medium">{o.parcels}</td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {o.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}
                          </td>
                          <td className="p-2 font-mono text-xs">{o.dn_number || '—'}</td>
                          <td className="p-2">
                            <GateBadge status={o.gate_status} />
                            {o.gate_remarks && (
                              <div className="text-[11px] text-destructive">{o.gate_remarks}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={onApprove} disabled={busy || sheet.gate_pending + sheet.gate_hold === 0}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve (OK from gate)
              </Button>
              <Button variant="outline" onClick={onHold} disabled={busy}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Hold
              </Button>
            </div>
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

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'amber' }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${tone === 'amber' ? 'text-amber-600' : ''}`}>{value}</div>
    </div>
  );
}
