import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ClipboardCheck, Loader2, Trash2, Truck, X } from 'lucide-react';
import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useScanner } from '@/modules/barcode/hooks/useScanner';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@/shared/components/ui';
import { useBoxScanQueue } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import { BST_LIVE_POLL_MS, BST_QUERY_KEYS, bstApi, useBSTTransfer, useRemoveBSTScan } from '../../api';
import { BoxScanCamera } from './BoxScanCamera';
import { BSTBillTable } from './BSTBillTable';
import { expectedBstItemBoxes } from './bstBoxCounts';
import { isLiveBst } from './bstFormat';
import { BSTStatusBadge } from './bstStatus';

export default function BSTScanPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  // Poll so a live transfer reflects the destination's receive progress (and any
  // concurrent edits) while the sender is still scanning.
  const { data: transfer, isLoading, refetch } = useBSTTransfer(transferId, {
    refetchInterval: BST_LIVE_POLL_MS,
  });
  const removeMut = useRemoveBSTScan();
  const queryClient = useQueryClient();

  const [manualBarcode, setManualBarcode] = useState('');

  // A live internal transfer stays sender-editable through IN_TRANSIT / RECEIVING
  // (the destination is already receiving) until it's sealed via approve
  // (scan_approved_at). Mirrors BSTService._live_editable on the backend.
  const liveActive =
    !!transfer &&
    isLiveBst(transfer) &&
    !transfer.scan_approved_at &&
    (transfer.status === 'SCANNING' ||
      transfer.status === 'IN_TRANSIT' ||
      transfer.status === 'RECEIVING');
  const editable = transfer?.status === 'DRAFT' || transfer?.status === 'SCANNING' || liveActive;
  const scans = useMemo(() => transfer?.box_scans ?? [], [transfer]);

  // What this BST is supposed to move (the SAP lines), shown with live progress.
  const items = useMemo(() => transfer?.items ?? [], [transfer]);
  const billItemCodes = new Set(items.map((it) => it.item_code));
  // Boxes to scan = the bill's total box count (line qty ÷ pieces-per-carton),
  // with a pack-size-from-name fallback for lines whose stored count is 0.
  const totalBoxes = useMemo(
    () => items.reduce((n, it) => n + expectedBstItemBoxes(it), 0),
    [items],
  );

  const isAlreadyScanned = useCallback(
    (barcode: string) =>
      (transfer?.box_scans ?? []).some(
        (s) => s.box_barcode.toLowerCase() === barcode.toLowerCase(),
      ),
    [transfer],
  );

  const { enqueue, pendingCount, flashing, failedScans, retryFailed, dismissFailed } =
    useBoxScanQueue({
      scanOne: async (barcode) => {
        const result = await bstApi.scanBox(transferId, barcode);
        return { duplicate: result.created_count === 0 && result.duplicate_count > 0 };
      },
      isAlreadyScanned,
      // Refresh the detail AND the dashboard/list counts (scanned_box_count).
      onDrained: () => queryClient.invalidateQueries({ queryKey: BST_QUERY_KEYS.all }),
      onDuplicate: (barcode) => toast.warning(`${barcode}: already scanned`),
      onAlreadyInList: () => toast.warning('This box is already in the scan list'),
    });

  const handleCameraScan = useCallback((decoded: string) => enqueue(decoded), [enqueue]);
  const scanner = useScanner({ onScan: handleCameraScan, debounceMs: 1800 });

  const handleManualSubmit = () => {
    enqueue(manualBarcode);
    setManualBarcode('');
  };

  const handleRemove = async (scanId: number) => {
    try {
      await removeMut.mutateAsync({ transferId, scanId });
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove scan'));
    }
  };

  const goToReview = () => navigate(`/warehouse/bst/${transferId}/review`);

  if (isLoading || !transfer) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  const handleManualFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleManualSubmit();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Scan Boxes — ${transfer.entry_no}`}
        description={`${transfer.sap_from_warehouse || '—'} → ${transfer.sap_to_warehouse || '—'} · ${
          transfer.doc_count > 1 ? `${transfer.doc_count} SAP documents` : `SAP #${transfer.sap_doc_num}`
        }`}
      >
        <BSTStatusBadge status={transfer.status} />
      </DashboardHeader>

      {liveActive && transfer.status !== 'SCANNING' && (
        <div className="flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          <Truck className="h-4 w-4 shrink-0" />
          <span>
            This transfer is live — the destination can receive these boxes as you scan. Keep
            scanning, then <span className="font-medium">Finish sending</span> when done.
          </span>
        </div>
      )}

      {/* Stock this BST should move (the SAP bill), with live scan progress */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Stock to transfer</p>
            <Badge variant="outline">
              {scans.length} of {totalBoxes} box{totalBoxes === 1 ? '' : 'es'} scanned
            </Badge>
          </div>
          <BSTBillTable items={items} scans={scans} />
        </CardContent>
      </Card>

      {!editable ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This BST is no longer open for scanning.
            <div className="mt-3">
              <Button variant="outline" onClick={() => navigate(`/warehouse/bst/${transferId}`)}>
                View details
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scan area — camera + manual input, like the docking flow */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 rounded-md border bg-muted/10 p-3 xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]">
                <BoxScanCamera scanner={scanner} flashing={flashing} />

                <form className="space-y-3" onSubmit={handleManualFormSubmit}>
                  <Label htmlFor="bst-scan-input">Scan boxes or pallets onto this transfer</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="bst-scan-input"
                      autoFocus
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Scan or type a box / pallet barcode"
                      className={cn('font-mono', flashing && 'ring-2 ring-emerald-400 ring-offset-1')}
                    />
                    <Button type="submit" disabled={!manualBarcode.trim()}>
                      Add
                    </Button>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing {pendingCount}…
                      </span>
                    ) : null}
                    <span>Only the bill&apos;s items are accepted, up to the bill box count, from the source warehouse.</span>
                  </p>
                  {scanner.error && <p className="text-xs text-red-600">{scanner.error}</p>}
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Failed scans */}
          {failedScans.length > 0 && (
            <div className="overflow-hidden rounded-md border border-red-200">
              <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                Failed scans ({failedScans.length})
              </div>
              <div className="divide-y">
                {failedScans.map((f) => (
                  <div key={f.barcode} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{f.barcode}</span>{' '}
                      <span className="text-muted-foreground">— {f.reason}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
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
            </div>
          )}
        </>
      )}

      {/* Scanned boxes */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-3">Scanned boxes ({scans.length})</p>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No boxes scanned yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3">Box</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Batch</th>
                    <th className="py-2 px-3">Pallet</th>
                    {editable && <th className="py-2 px-3" />}
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 px-3 font-medium">{s.box_barcode}</td>
                      <td className="py-2 px-3">
                        {s.item_code}
                        {!billItemCodes.has(s.item_code) && (
                          <Badge
                            variant="outline"
                            className="ml-1 border-red-200 bg-red-50 text-red-700"
                          >
                            off-bill
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">{s.batch_number}</td>
                      <td className="py-2 px-3">{s.pallet_code || '—'}</td>
                      {editable && (
                        <td className="py-2 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => handleRemove(s.id)}
                            disabled={removeMut.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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

      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/warehouse/bst/${transferId}`)}>
            Save &amp; exit
          </Button>
          <Button onClick={goToReview} disabled={scans.length === 0}>
            <ClipboardCheck className="h-4 w-4 mr-1" />
            {liveActive && transfer.status !== 'SCANNING' ? 'Finish sending' : 'Review & approve'}
          </Button>
        </div>
      )}
    </div>
  );
}
