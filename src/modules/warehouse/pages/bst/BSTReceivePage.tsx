import { Check, Loader2, PackageCheck, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useScanner } from '@/modules/barcode/hooks/useScanner';
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

import { bstApi, useBSTIncomingDetail, useCompleteBSTReceive } from '../../api';
import type { BSTReceiveStatus } from '../../types';
import { BoxScanCamera } from './BoxScanCamera';
import { BSTStatusBadge } from './bstStatus';

const RECEIVABLE = ['IN_TRANSIT', 'ARRIVED', 'RECEIVING'];

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

  const { data: transfer, isLoading, refetch } = useBSTIncomingDetail(transferId);
  const completeMut = useCompleteBSTReceive();

  const [manualBarcode, setManualBarcode] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [decidingBarcode, setDecidingBarcode] = useState<string | null>(null);

  const receivable = transfer ? RECEIVABLE.includes(transfer.status) : false;
  const scans = transfer?.box_scans ?? [];
  const accepted = scans.filter((s) => s.receive_status === 'ACCEPTED').length;
  const rejected = scans.filter((s) => s.receive_status === 'REJECTED').length;
  const pending = scans.filter((s) => s.receive_status === 'PENDING' && !s.is_unexpected).length;

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
      onDrained: () => refetch(),
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
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update box'));
    } finally {
      setDecidingBarcode(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    await handleRowDecision(rejectTarget, 'REJECTED', rejectReason);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleComplete = async () => {
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
        description={`${transfer.sap_from_warehouse || '—'} → ${transfer.sap_to_warehouse || '—'} · SAP #${transfer.sap_doc_num}`}
      >
        <BSTStatusBadge status={transfer.status} />
      </DashboardHeader>

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

      {/* Expected boxes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">Boxes ({scans.length})</p>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-green-700">{accepted} accepted</Badge>
              <Badge variant="outline" className="text-red-700">{rejected} rejected</Badge>
              <Badge variant="outline" className="text-slate-600">{pending} pending</Badge>
            </div>
          </div>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No boxes on this transfer</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3">Box</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Status</th>
                    {receivable && <th className="py-2 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b">
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
                          <span className="text-xs text-muted-foreground ml-1">({s.reject_reason})</span>
                        )}
                      </td>
                      {receivable && (
                        <td className="py-2 px-3">
                          <div className="flex gap-1 justify-end">
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
        </CardContent>
      </Card>

      {receivable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/warehouse/bst')}>
            Save &amp; exit
          </Button>
          <Button onClick={handleComplete} disabled={completeMut.isPending}>
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
            <DialogTitle>Reject box {rejectTarget}</DialogTitle>
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
