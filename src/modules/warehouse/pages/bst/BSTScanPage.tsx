import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ClipboardCheck, Loader2, Trash2, Truck, X } from 'lucide-react';
import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/modules/barcode/components';
import { useScanner } from '@/modules/barcode/hooks/useScanner';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ScanMetricTile } from '@/shared/components/scanReview';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { useBoxScanQueue } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  BST_LIVE_POLL_MS,
  BST_QUERY_KEYS,
  bstApi,
  useBSTTransfer,
  useRemoveBSTScan,
  useRemoveBSTScans,
  useRequestBSTPartialTransfer,
  useSaveBSTManualEntry,
} from '../../api';
import { BoxScanCamera } from './BoxScanCamera';
import { BSTBillTable } from './BSTBillTable';
import { isLiveBst } from './bstFormat';
import { formatBstNumber, summarizeBstBill } from './bstScanSummary';
import { BSTStatusBadge } from './bstStatus';

export default function BSTScanPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  // Poll so a live transfer reflects the destination's receive progress (and any
  // concurrent edits) while the sender is still scanning.
  const {
    data: transfer,
    isLoading,
    refetch,
  } = useBSTTransfer(transferId, {
    refetchInterval: BST_LIVE_POLL_MS,
  });
  const removeMut = useRemoveBSTScan();
  const removeManyMut = useRemoveBSTScans();
  const requestMut = useRequestBSTPartialTransfer();
  const manualMut = useSaveBSTManualEntry();
  const queryClient = useQueryClient();

  const [manualBarcode, setManualBarcode] = useState('');
  const [partialReason, setPartialReason] = useState('');
  // Boxes ticked for removal. One wrong pallet puts dozens of rows on a transfer, so
  // they come off together instead of one confirm-and-wait at a time.
  const [pickedScanIds, setPickedScanIds] = useState<number[]>([]);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

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
  // Scanned-vs-expected QUANTITY gate (authoritative — the same rule blocks approve()
  // on the backend). Drives the short-scan lock banner.
  const scanStatus = transfer?.scan_status;
  // A PM-only bill needs no scanning; any non-PM line requires it. Mirrors the
  // backend approve() gate. Default true (require scanning) if status not loaded.
  const requiresScanning = scanStatus?.requires_scanning ?? true;

  // What this BST is supposed to move (the SAP lines), shown with live progress.
  const items = useMemo(() => transfer?.items ?? [], [transfer]);
  const billItemCodes = new Set(items.map((it) => it.item_code));
  // Boxes to scan = the bill's total box count (line qty ÷ pieces-per-carton),
  // with a pack-size-from-name fallback for lines whose stored count is 0. The
  // same tallies feed the header tiles and the bill table.
  const bill = useMemo(() => summarizeBstBill(items, scans), [items, scans]);
  const totalBoxes = bill.expectedBoxes;

  // On a live transfer the destination may already have accepted or rejected a box,
  // and the sender may not pull those back — so they are the rows that can't be ticked.
  // Keeping them out of the selection matters: the removal is all-or-nothing, and one
  // received box in the batch would refuse the whole lot.
  const removableScans = useMemo(
    () => scans.filter((s) => s.receive_status === 'PENDING'),
    [scans],
  );
  // Only ids still removable count: a row this screen (or another one) already removed
  // must not sit in the tally, nor be named in the next bulk delete — the backend
  // refuses a stale selection whole rather than half-applying it.
  const pickedIds = useMemo(() => {
    const live = new Set(removableScans.map((s) => s.id));
    return pickedScanIds.filter((id) => live.has(id));
  }, [pickedScanIds, removableScans]);
  const allPicked = removableScans.length > 0 && pickedIds.length === removableScans.length;
  const togglePicked = (scanId: number) =>
    setPickedScanIds((prev) =>
      prev.includes(scanId) ? prev.filter((id) => id !== scanId) : [...prev, scanId],
    );
  const toggleAllPicked = () => setPickedScanIds(allPicked ? [] : removableScans.map((s) => s.id));

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

  // Packaging material has no barcodes to scan, so its quantity is typed on the
  // bill row. Rethrown on failure so the cell reverts to the stored value.
  const handleSaveManualQty = useCallback(
    async (itemCode: string, quantity: string | null) => {
      try {
        await manualMut.mutateAsync({ transferId, payload: { item_code: itemCode, quantity } });
        toast.success(
          quantity === null ? `${itemCode}: entry cleared` : `${itemCode}: ${quantity} recorded`,
        );
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not save the quantity'));
        throw err;
      }
    },
    [manualMut, transferId],
  );

  const handleRemove = async (scanId: number) => {
    try {
      await removeMut.mutateAsync({ transferId, scanId });
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove scan'));
    }
  };

  const handleRemovePicked = async () => {
    try {
      const { removed } = await removeManyMut.mutateAsync({ transferId, scanIds: pickedIds });
      // Cleared only on success: a refused removal (a box the destination already
      // received, a row someone else removed) takes none of them off, so the operator
      // keeps the selection they can fix and retry.
      setPickedScanIds([]);
      toast.success(`${removed} box${removed === 1 ? '' : 'es'} removed`);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the selected scans'));
    } finally {
      setConfirmRemoveOpen(false);
    }
  };

  const goToReview = () => navigate(`/warehouse/bst/${transferId}/review`);

  // Same request the review page offers — surfaced here so an operator stuck on a
  // short load can raise it without leaving the scan screen (mirrors dispatch).
  const handleRequestPartial = async () => {
    if (!partialReason.trim()) {
      toast.error('Add a reason for the partial transfer');
      return;
    }
    try {
      await requestMut.mutateAsync({ transferId, reason: partialReason.trim() });
      setPartialReason('');
      toast.success('Partial-transfer approval requested — waiting for a supervisor');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not request approval'));
    }
  };

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
          transfer.doc_count > 1
            ? `${transfer.doc_count} SAP documents`
            : `SAP #${transfer.sap_doc_num}`
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

      {!requiresScanning && (
        <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">No scanning required.</span> This transfer is packaging
            material (PM) only — type the quantity sent in the{' '}
            <span className="font-medium">Sent (manual)</span> column below, then{' '}
            {liveActive && transfer.status !== 'SCANNING' ? 'finish sending' : 'review & approve'}.
          </span>
        </div>
      )}

      {scanStatus?.is_partial && transfer.partial_transfer?.is_approved && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Partial transfer approved.</span> You can finish sending
            this short load ({scanStatus.scanned_qty} of {scanStatus.expected_qty} pcs).
          </span>
        </div>
      )}
      {scanStatus?.is_partial && !transfer.partial_transfer?.is_approved && (
        <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">Short scan — sending is locked.</span> Scanned{' '}
              {scanStatus.scanned_qty} of {scanStatus.expected_qty} pcs.
              {scanStatus.short_items.length > 0 && (
                <>
                  {' '}
                  Still short:{' '}
                  {scanStatus.short_items
                    .map(
                      (i) =>
                        `${i.item_code} (${Number(i.expected_qty) - Number(i.scanned_qty)} ${i.uom})`,
                    )
                    .join(', ')}
                  .
                </>
              )}{' '}
              {transfer.partial_transfer?.is_pending
                ? 'A partial-transfer approval has been requested — waiting for a supervisor.'
                : 'Scan the remaining boxes, or request a partial-transfer approval to send it short.'}
            </span>
          </div>
          {editable && !transfer.partial_transfer?.is_pending && (
            <div className="space-y-2">
              <Textarea
                value={partialReason}
                onChange={(e) => setPartialReason(e.target.value)}
                placeholder="Reason for sending this transfer short (e.g. damaged boxes held back)…"
                rows={2}
                className="bg-white"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestPartial}
                  disabled={!partialReason.trim() || requestMut.isPending}
                >
                  {requestMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Request partial-transfer approval
                </Button>
              </div>
            </div>
          )}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <ScanMetricTile
              label="Expected Boxes"
              value={totalBoxes > 0 ? formatBstNumber(totalBoxes) : '-'}
            />
            <ScanMetricTile
              label="Scanned Boxes"
              value={formatBstNumber(bill.scannedBoxes)}
              hint={bill.offBillBoxes > 0 ? `${formatBstNumber(bill.offBillBoxes)} off-bill` : ''}
            />
            <ScanMetricTile
              label="Scanned Qty"
              value={bill.scannedQty > 0 ? formatBstNumber(bill.scannedQty) : '-'}
              hint={bill.expectedQty > 0 ? `of ${formatBstNumber(bill.expectedQty)}` : ''}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Scan progress</span>
              <span>
                {bill.expectedQty > 0 || totalBoxes > 0 ? `${bill.progressPercent}%` : 'Open count'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${bill.progressPercent}%` }}
              />
            </div>
          </div>
          <BSTBillTable
            items={items}
            scans={scans}
            manualEntries={transfer.manual_entries}
            onSaveManualQty={editable ? handleSaveManualQty : undefined}
          />
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
                      className={cn(
                        'font-mono',
                        flashing && 'ring-2 ring-emerald-400 ring-offset-1',
                      )}
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
                    <span>
                      Only the bill&apos;s items are accepted, up to the bill box count, from the
                      source warehouse.
                    </span>
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
                  <div
                    key={f.barcode}
                    className="flex items-center justify-between gap-2 p-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{f.barcode}</span>{' '}
                      <span className="text-muted-foreground">— {f.reason}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => retryFailed(f.barcode)}
                      >
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => dismissFailed(f.barcode)}
                      >
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Scanned boxes ({scans.length})</p>
            {editable && removableScans.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {pickedIds.length > 0 && (
                  <span className="text-sm text-muted-foreground">{pickedIds.length} selected</span>
                )}
                <Button size="sm" variant="outline" className="h-8" onClick={toggleAllPicked}>
                  {allPicked ? 'Clear selection' : `Select all (${removableScans.length})`}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8"
                  disabled={pickedIds.length === 0 || removeManyMut.isPending}
                  onClick={() => setConfirmRemoveOpen(true)}
                >
                  {removeManyMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-4 w-4" />
                  )}
                  Delete selected
                </Button>
              </div>
            )}
          </div>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No boxes scanned yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {editable && (
                      <th className="py-2 px-3 w-8">
                        <Checkbox
                          checked={allPicked}
                          onCheckedChange={toggleAllPicked}
                          aria-label="Select every scanned box"
                        />
                      </th>
                    )}
                    <th className="py-2 px-3">Box</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Batch</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3">Pallet</th>
                    {editable && <th className="py-2 px-3" />}
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr
                      key={s.id}
                      className={cn('border-b', pickedIds.includes(s.id) && 'bg-muted/50')}
                    >
                      {editable && (
                        <td className="py-2 px-3">
                          {s.receive_status === 'PENDING' ? (
                            <Checkbox
                              checked={pickedIds.includes(s.id)}
                              onCheckedChange={() => togglePicked(s.id)}
                              aria-label={`Select ${s.box_barcode}`}
                            />
                          ) : (
                            <Checkbox
                              checked={false}
                              disabled
                              aria-label={`${s.box_barcode} was already received and can't be removed`}
                            />
                          )}
                        </td>
                      )}
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
                      <td className="py-2 px-3 text-right tabular-nums">
                        {s.quantity} {s.uom}
                      </td>
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

      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={`Remove ${pickedIds.length} scanned box${pickedIds.length === 1 ? '' : 'es'}?`}
        description="The boxes come off this transfer and can be scanned again."
        confirmLabel="Remove"
        destructive
        pending={removeManyMut.isPending}
        onConfirm={handleRemovePicked}
      />

      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/warehouse/bst/${transferId}`)}>
            Save &amp; exit
          </Button>
          <Button onClick={goToReview} disabled={requiresScanning && scans.length === 0}>
            <ClipboardCheck className="h-4 w-4 mr-1" />
            {liveActive && transfer.status !== 'SCANNING' ? 'Finish sending' : 'Review & approve'}
          </Button>
        </div>
      )}
    </div>
  );
}
