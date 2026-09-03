import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, Loader2, Package, PackageCheck, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useScanner } from '@/modules/barcode/hooks/useScanner';
import { WmsEnabledGate } from '@/modules/wms/components/WmsEnabledGate';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useBoxScanQueue } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  BST_LIVE_POLL_MS,
  BST_QUERY_KEYS,
  bstApi,
  useBSTIncomingDetail,
  useCompleteBSTReceive,
  useWarehouseScope,
} from '../../api';
import type { BSTReceiveStatus } from '../../types';
import { BoxScanCamera } from './BoxScanCamera';
import { isLiveBst } from './bstFormat';
import { BSTReceivePutawaySection } from './BSTReceivePutawaySection';
import { BSTStatusBadge } from './bstStatus';

// PARTIALLY_RECEIVED stays receivable so a premature/partial finalize can be
// resumed — the remaining boxes can still be accepted and the receipt re-finalized.
const RECEIVABLE = ['IN_TRANSIT', 'ARRIVED', 'RECEIVING', 'PARTIALLY_RECEIVED'];

function ReceiveBadge({ status }: { status: BSTReceiveStatus }) {
  const cfg: Record<BSTReceiveStatus, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${cfg[status]}`}>
      {status}
    </span>
  );
}

export default function BSTReceivePage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  // Poll so boxes the sender scans appear here in near real time on a live
  // transfer (the sender may still be scanning while we receive).
  const { data: transfer, isLoading } = useBSTIncomingDetail(transferId, {
    refetchInterval: BST_LIVE_POLL_MS,
  });
  const scope = useWarehouseScope();
  const completeMut = useCompleteBSTReceive();
  const queryClient = useQueryClient();

  const refreshBst = useCallback(
    () => queryClient.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
    [queryClient],
  );

  const [manualBarcode, setManualBarcode] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectIsPallet, setRejectIsPallet] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [decidingBarcode, setDecidingBarcode] = useState<string | null>(null);

  const receivable = transfer ? RECEIVABLE.includes(transfer.status) : false;
  // On a live transfer the sender may still be adding boxes until they seal it
  // (scan_approved_at). Finalizing before then risks recording not-yet-sent boxes
  // as short.
  const senderStillScanning =
    !!transfer &&
    isLiveBst(transfer) &&
    !transfer.scan_approved_at &&
    (transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVING');
  const scans = useMemo(() => transfer?.box_scans ?? [], [transfer?.box_scans]);
  const accepted = scans.filter((s) => s.receive_status === 'ACCEPTED').length;
  const rejected = scans.filter((s) => s.receive_status === 'REJECTED').length;
  const pending = scans.filter((s) => s.receive_status === 'PENDING' && !s.is_unexpected).length;

  // Group the box scans by their pallet so the receive list is pallet-wise:
  // each pallet is a row that expands to reveal the boxes on it. Loose boxes
  // (no pallet code) collapse into a single "Loose boxes" group.
  const palletGroups = useMemo(() => {
    const groups = new Map<string, { palletCode: string; scans: typeof scans; items: Set<string> }>();
    for (const s of scans) {
      const key = s.pallet_code || '';
      let g = groups.get(key);
      if (!g) {
        g = { palletCode: key, scans: [], items: new Set() };
        groups.set(key, g);
      }
      g.scans.push(s);
      if (s.item_code) g.items.add(s.item_code);
    }
    return [...groups.values()]
      .map((g) => ({
        palletCode: g.palletCode,
        items: [...g.items],
        scans: g.scans,
        accepted: g.scans.filter((s) => s.receive_status === 'ACCEPTED').length,
        rejected: g.scans.filter((s) => s.receive_status === 'REJECTED').length,
        pending: g.scans.filter((s) => s.receive_status === 'PENDING' && !s.is_unexpected).length,
      }))
      .sort((a, b) => a.palletCode.localeCompare(b.palletCode));
  }, [scans]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const decide = useCallback(
    async (barcode: string, decision: 'ACCEPTED' | 'REJECTED', reason = '') => {
      const result = await bstApi.receiveScan(transferId, {
        barcode_raw: barcode,
        decision,
        reject_reason: reason,
      });
      if (result.unexpected.length) {
        toast.warning(`${barcode}: not on this transfer (recorded as unexpected)`);
      }
      return result;
    },
    [transferId],
  );

  const isAlreadyAccepted = useCallback(
    (barcode: string) =>
      (transfer?.box_scans ?? []).some(
        (s) => s.box_barcode.toLowerCase() === barcode.toLowerCase() && s.receive_status === 'ACCEPTED',
      ),
    [transfer],
  );

  const { enqueue, pendingCount, flashing, failedScans, retryFailed, dismissFailed } =
    useBoxScanQueue({
      scanOne: (barcode) => decide(barcode, 'ACCEPTED'),
      isAlreadyScanned: isAlreadyAccepted,
      onDrained: refreshBst,
      onAlreadyInList: () => toast.info('Box already accepted'),
    });

  const handleCameraScan = useCallback((decoded: string) => enqueue(decoded), [enqueue]);
  const scanner = useScanner({ onScan: handleCameraScan, debounceMs: 1800 });

  const handleManualSubmit = () => {
    enqueue(manualBarcode);
    setManualBarcode('');
  };

  const handleRowDecision = async (barcode: string, decision: 'ACCEPTED' | 'REJECTED', reason = '') => {
    setDecidingBarcode(barcode);
    try {
      await decide(barcode, decision, reason);
      await refreshBst();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update box'));
    } finally {
      setDecidingBarcode(null);
    }
  };

  // Deciding a whole pallet: the backend resolves the pallet barcode to every
  // dispatched box on it and accepts/rejects them in one go.
  const handlePalletDecision = async (
    palletCode: string,
    decision: 'ACCEPTED' | 'REJECTED',
    reason = '',
  ) => {
    setDecidingBarcode(palletCode);
    try {
      await decide(palletCode, decision, reason);
      await refreshBst();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update pallet'));
    } finally {
      setDecidingBarcode(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectIsPallet) {
      await handlePalletDecision(rejectTarget, 'REJECTED', rejectReason);
    } else {
      await handleRowDecision(rejectTarget, 'REJECTED', rejectReason);
    }
    setRejectTarget(null);
    setRejectReason('');
    setRejectIsPallet(false);
  };

  const handleComplete = async () => {
    // Finalizing is a commitment: pending boxes are recorded as short/not
    // received and the transfer is locked as (partially) received. Guard against
    // the accidental one-click finalize that stranded a whole shipment.
    if (accepted === 0 && rejected === 0) {
      toast.error('Accept or reject at least one box before finalizing.');
      return;
    }
    if (senderStillScanning) {
      // Hard block — mirrors the server guard in receive_complete.
      toast.error('The sender is still sending. You can finalize once they finish sending.');
      return;
    }
    if (pending > 0) {
      const confirmed = await confirmDialog({
        title: `Finalize with ${pending} box(es) still pending?`,
        description:
          'Finalizing now records them as not received and marks this transfer partially received.',
        confirmLabel: 'Finalize',
      });
      if (!confirmed) return;
    }
    try {
      await completeMut.mutateAsync(transferId);
      toast.success('Receipt finalized');
      navigate('/warehouse/bst');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not finalize receipt'));
    }
  };

  if (isLoading || !transfer) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Receive — ${transfer.entry_no}`}
        description={`${transfer.sap_from_warehouse || '—'} → ${transfer.sap_to_warehouse || '—'} · ${
          transfer.doc_count > 1 ? `${transfer.doc_count} SAP documents` : `SAP #${transfer.sap_doc_num}`
        }`}
      >
        <BSTStatusBadge status={transfer.status} />
      </DashboardHeader>

      {/* The server refuses a receive into a warehouse this user does not manage
          (see `_ensure_receivable`). Say so before they start scanning rather
          than failing on the first box. An INVOICE BST has no destination
          warehouse at all — it settles to a company — so there is nothing to
          check and nothing to warn about. */}
      {transfer.sap_to_warehouse && !scope.manages(transfer.sap_to_warehouse) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            This shipment is coming into <strong>{transfer.sap_to_warehouse}</strong>, which you
            do not manage — its manager receives it. Scanning here will be refused.
          </div>
        )}

      {senderStillScanning && (
        <div className="flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            The sender is still sending — more boxes may keep arriving. You can accept them now,
            but <span className="font-medium">Finalize is locked until the sender finishes</span>.
          </span>
        </div>
      )}

      {!receivable ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This transfer is not open for receiving.
            <div className="mt-3">
              <Button variant="outline" onClick={() => navigate(`/warehouse/bst/${transferId}`)}>
                View details
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Scan an arriving box to accept it"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                className={cn(flashing && 'ring-2 ring-emerald-400 ring-offset-1')}
              />
              <Button onClick={handleManualSubmit}>Accept</Button>
            </div>

            <BoxScanCamera scanner={scanner} flashing={flashing} />
            {pendingCount > 0 && (
              <span className="text-sm text-muted-foreground inline-flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Syncing {pendingCount}…
              </span>
            )}
            {scanner.error && <p className="text-sm text-red-600">{scanner.error}</p>}
          </CardContent>
        </Card>
      )}

      {failedScans.length > 0 && (
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-red-700 mb-2">Failed scans ({failedScans.length})</p>
            <div className="space-y-1">
              {failedScans.map((f) => (
                <div key={f.barcode} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{f.barcode}</span>{' '}
                    <span className="text-muted-foreground">— {f.reason}</span>
                  </span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7" onClick={() => retryFailed(f.barcode)}>
                      Retry
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => dismissFailed(f.barcode)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Received stock, pallet-wise: each pallet expands to its boxes. */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">
              Pallets ({palletGroups.length}) · {scans.length} box{scans.length === 1 ? '' : 'es'}
            </p>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-green-700">{accepted} accepted</Badge>
              <Badge variant="outline" className="text-red-700">{rejected} rejected</Badge>
              <Badge variant="outline" className="text-slate-600">{pending} pending</Badge>
            </div>
          </div>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No boxes on this transfer</p>
          ) : (
            <div className="divide-y">
              {palletGroups.map((g) => {
                const key = g.palletCode || '__loose__';
                const isOpen = expanded.has(key);
                const label = g.palletCode || 'Loose boxes';
                const allAccepted = g.accepted === g.scans.length;
                const allRejected = g.rejected === g.scans.length;
                const deciding = decidingBarcode === g.palletCode;
                return (
                  <div key={key}>
                    {/* Pallet row */}
                    <div className="flex items-center gap-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(key)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-90',
                          )}
                        />
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">
                          <span className="font-mono font-medium">{label}</span>
                          {g.items.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">{g.items.join(', ')}</span>
                          )}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">
                          {g.scans.length} box{g.scans.length === 1 ? '' : 'es'}
                        </span>
                        {g.accepted > 0 && (
                          <Badge variant="outline" className="text-green-700">{g.accepted} ✓</Badge>
                        )}
                        {g.rejected > 0 && (
                          <Badge variant="outline" className="text-red-700">{g.rejected} ✕</Badge>
                        )}
                        {g.pending > 0 && (
                          <Badge variant="outline" className="text-slate-600">{g.pending}</Badge>
                        )}
                      </div>
                      {receivable && g.palletCode && (
                        <div className="flex shrink-0 gap-1">
                          {!allAccepted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              disabled={deciding}
                              onClick={() => handlePalletDecision(g.palletCode, 'ACCEPTED')}
                            >
                              {deciding ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Check className="mr-1 h-3 w-3 text-green-600" /> All
                                </>
                              )}
                            </Button>
                          )}
                          {!allRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              disabled={deciding}
                              onClick={() => {
                                setRejectTarget(g.palletCode);
                                setRejectReason('');
                                setRejectIsPallet(true);
                              }}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Boxes on this pallet */}
                    {isOpen && (
                      <div className="overflow-x-auto pb-2 pl-8">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                              <th className="py-1.5 px-3">Box</th>
                              <th className="py-1.5 px-3">Item</th>
                              <th className="py-1.5 px-3">Status</th>
                              {receivable && <th className="py-1.5 px-3 text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {g.scans.map((s) => (
                              <tr key={s.id} className="border-b last:border-b-0">
                                <td className="py-2 px-3 font-medium">
                                  {s.box_barcode}
                                  {s.is_unexpected && (
                                    <Badge variant="outline" className="ml-1 text-amber-700">unexpected</Badge>
                                  )}
                                </td>
                                <td className="py-2 px-3">{s.item_code}</td>
                                <td className="py-2 px-3">
                                  <ReceiveBadge status={s.receive_status} />
                                  {s.reject_reason && (
                                    <span className="ml-1 text-xs text-muted-foreground">({s.reject_reason})</span>
                                  )}
                                </td>
                                {receivable && (
                                  <td className="py-2 px-3">
                                    <div className="flex justify-end gap-1">
                                      {s.receive_status !== 'ACCEPTED' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7"
                                          disabled={decidingBarcode === s.box_barcode}
                                          onClick={() => handleRowDecision(s.box_barcode, 'ACCEPTED')}
                                        >
                                          {decidingBarcode === s.box_barcode ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Check className="h-3 w-3 text-green-600" />
                                          )}
                                        </Button>
                                      )}
                                      {s.receive_status !== 'REJECTED' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7"
                                          disabled={decidingBarcode === s.box_barcode}
                                          onClick={() => {
                                            setRejectTarget(s.box_barcode);
                                            setRejectReason('');
                                            setRejectIsPallet(false);
                                          }}
                                        >
                                          <X className="h-3 w-3 text-red-600" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Put away received pallets into Warehouse Ops bins (only when WMS is on). */}
      <WmsEnabledGate fallback={null}>
        <BSTReceivePutawaySection transfer={transfer} />
      </WmsEnabledGate>

      {receivable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/warehouse/bst')}>
            Save &amp; exit
          </Button>
          <Button
            onClick={handleComplete}
            disabled={completeMut.isPending || senderStillScanning}
            title={senderStillScanning ? 'The sender must finish sending first' : undefined}
          >
            {completeMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <PackageCheck className="h-4 w-4 mr-1" />
            )}
            Finalize receipt
          </Button>
        </div>
      )}

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectIsPallet ? 'pallet' : 'box'} {rejectTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmReject()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button onClick={confirmReject} disabled={decidingBarcode === rejectTarget}>
                {decidingBarcode === rejectTarget && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
