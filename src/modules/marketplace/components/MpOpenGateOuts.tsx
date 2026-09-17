/**
 * Gate outs raised but not yet sent out — the drafts.
 *
 * "New gate out" offers Save as draft, for a truck whose paperwork is being
 * sorted out while it waits. The Gate page only ever listed trips that had
 * already left, so the moment that form closed the draft was invisible: no row
 * to finish, no row to cancel, and the gate person's own record unreachable.
 * This is where an unfinished trip lives until it leaves or is called off.
 *
 * A manual draft is finished here, through the SAME form that raised it, filled
 * in with what is already on the trip. It used to be offered nothing but a
 * Security box, because marking out was the only write this screen had: the
 * real note number, the boxes actually loaded and the weighbridge reading taken
 * in the meantime were all unreachable, so the truck left on whatever was known
 * when the draft was opened — and a manual trip is exempt from needing a weight,
 * so nothing stopped it. A draft raised against a SHEET belongs to the linear
 * send-out screen instead (vehicle → weighment → out), so its row hands over to
 * that rather than duplicating those steps.
 */
import { useMutation } from '@tanstack/react-query';
import { Loader2, Printer, ShieldAlert, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { MarketplaceChannel, MpGatePass } from '../types/marketplace.types';
import { MpManualGateOutDialog } from './MpManualGateOutDialog';

const kg = (v: string | null) => (v === null ? '—' : `${Number(v).toLocaleString('en-IN')} kg`);

interface Props {
  channel: MarketplaceChannel;
  /** Trips still open — DRAFT, WEIGHED or GATEPASS_PRINTED. */
  passes: MpGatePass[];
  loading?: boolean;
  /** Refresh the page's queries after a draft leaves or is called off. */
  onDone: () => void;
}

export function MpOpenGateOuts({ channel, passes, loading, onDone }: Props) {
  const navigate = useNavigate();
  // The draft being finished — handed to the same form that raised it, so the
  // gate person checks and corrects the whole trip rather than only naming the
  // security who let it through.
  const [finishing, setFinishing] = useState<MpGatePass | null>(null);
  const [cancelTrip, setCancelTrip] = useState<MpGatePass | null>(null);
  const [reason, setReason] = useState('');

  const fail = (msg: string) => (e: unknown) => toast.error(getErrorMessage(e, msg));

  const cancel = useMutation({
    mutationFn: () => marketplaceApi.gatePassCancel(cancelTrip!.id, reason.trim()),
    onSuccess: (p) => {
      toast.success(`Gate out for ${p.vehicle_no || 'the trip'} cancelled.`);
      setCancelTrip(null);
      setReason('');
      onDone();
    },
    onError: fail('Could not cancel the gate out.'),
  });

  // Printing does not gate the flow — the pass can be printed before or after
  // the truck goes — so it is offered on a draft too.
  const print = useMutation({
    mutationFn: (id: number) => marketplaceApi.gatePassPrint(id),
    onSuccess: () => {
      onDone();
      window.print();
    },
    onError: fail('Could not print the gatepass.'),
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading gate outs not yet sent…
        </CardContent>
      </Card>
    );
  }
  if (passes.length === 0) return null;

  const busy = cancel.isPending || print.isPending;

  return (
    <Card className="border-amber-500/40">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-amber-600" /> Not out yet
          <span className="font-normal text-muted-foreground">
            {passes.length} draft{passes.length === 1 ? '' : 's'} waiting at the gate
          </span>
        </div>

        {passes.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{p.vehicle_no || '—'}</span>
                <Badge variant="secondary">{p.status_display}</Badge>
                {p.is_manual ? (
                  <span className="text-xs text-muted-foreground">No sheet</span>
                ) : (
                  <span className="truncate text-xs text-muted-foreground">
                    {p.sheet || `Sheet #${p.import_batch}`}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {p.delivery_note_no && <span>DN {p.delivery_note_no}</span>}
                {p.box_count > 0 && <span>{p.box_count} box(es)</span>}
                {p.driver_name && <span>{p.driver_name}</span>}
                {p.is_weighed && (
                  <span>
                    tare {kg(p.tare_weight)} · gross {kg(p.gross_weight)} · net {kg(p.net_weight)}
                  </span>
                )}
                <span>raised {p.created_at.slice(0, 10)}</span>
                {p.attachments.length > 0 && (
                  <a
                    href={p.attachments[0].file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Note
                  </a>
                )}
              </div>
              {/* The server's own reason, so the gate person reads it instead of
                  discovering it by pressing the button. It no longer disables
                  Mark out: on a manual trip the only reason is a mis-keyed
                  weighment, and the form behind that button is where it gets
                  corrected — the server still refuses the mark-out until it is. */}
              {p.weight_error && <p className="mt-1 text-xs text-amber-600">{p.weight_error}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {p.gatepass_no && (
                <span className="font-mono text-xs text-muted-foreground">{p.gatepass_no}</span>
              )}
              {p.is_manual ? (
                <>
                  <Button size="sm" disabled={busy} onClick={() => setFinishing(p)}>
                    <Truck className="mr-1.5 h-4 w-4" /> Mark out
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => print.mutate(p.id)}
                  >
                    <Printer className="mr-1.5 h-4 w-4" /> Print
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    navigate(`/marketplace/gate/${p.import_batch}/send-out?channel=${channel}`)
                  }
                >
                  <Truck className="mr-1.5 h-4 w-4" /> Continue
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setReason('');
                  setCancelTrip(p);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Finishing a draft — the same form that raised it, filled in. The weight
          and the security boxes are on it, so the gate person is asked for what
          the trip is actually leaving with instead of only who waved it out. */}
      {finishing && (
        <MpManualGateOutDialog
          channel={channel}
          open
          trip={finishing}
          onOpenChange={(o) => !o && setFinishing(null)}
          onDone={() => {
            setFinishing(null);
            onDone();
          }}
        />
      )}

      {/* Cancel — a reason is required, so the record says why it never left. */}
      <Dialog open={!!cancelTrip} onOpenChange={(o) => !o && setCancelTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this gate out</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The trip never left. Say why — any parcels on it go back to the waiting list.
          </p>
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. truck turned away, raised twice)"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTrip(null)}
              disabled={cancel.isPending}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending || !reason.trim()}
              onClick={() => cancel.mutate()}
            >
              <ShieldAlert className="mr-2 h-4 w-4" /> Cancel gate out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
