import {
  AlertCircle,
  Ban,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Flashlight,
  Loader2,
  PackageCheck,
  PackageSearch,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ADMIN_PERMISSIONS, GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type DockingPartialScanRequest,
  type DockingScanSkipRequest,
  useCreateDockingPartialScanRequest,
  useCreateDockingScanSkipRequest,
  useDockingPartialScanRequestByDispatch,
  useDockingScanSkipRequestByDispatch,
} from '@/modules/admin/api';
import { useScanner } from '@/modules/barcode/hooks/useScanner';
import {
  type BarcodeDispatchSession,
  type SalesDispatchBoxScan,
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchItem,
  useImportSalesDispatchBarcodeScans,
  useRemoveSalesDispatchBoxScan,
  useSalesDispatchBarcodeScans,
  useSalesDispatchBoxScans,
  useSalesDispatchByVehicleEntry,
  useScanSalesDispatchBox,
} from '@/modules/gate/api';
import { StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { ReviewModeBanner } from './ReviewModeBanner';
import {
  getExpectedDispatchBoxes,
  getExpectedDocumentBoxes,
  getExpectedItemBoxes,
  parsePositiveNumber,
} from './salesDispatchBoxCounts';
import { DOCKING_TOTAL_STEPS, formatTimestamp, formatValue } from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

const SCAN_CLOSED_STATUSES = [
  'GATEPASS_PRINTED',
  'PRINT_COMMITTED',
  'DISPATCHED',
  'REJECTED',
  'CANCELLED',
] as const;

// A connected hardware scanner behaves like a keyboard, so it needs the box-barcode
// field kept focused to receive each scan. But on touch devices, programmatically
// focusing a text field pops the on-screen keyboard, which covers the camera and
// knocks it out of place. So we only auto-focus on devices with a fine pointer
// (desktop/laptop with a mouse or trackpad) — where hardware scanners are actually
// used — and never on phones/tablets, where camera scanning is the workflow. Mobile
// users can still tap the field to type manually; the keyboard just won't pop on its own.
function detectFinePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(pointer: fine)').matches;
}

export default function SalesDispatchBarcodeScanPage() {
  const navigate = useNavigate();
  const { hasAnyPermission, hasPermission } = usePermission();
  const { entryId, entryIdNumber } = useEntryId();
  const [searchParams] = useSearchParams();
  const isReview = searchParams.get('review') === '1';
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState('');
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipError, setSkipError] = useState('');
  const [isPartialDialogOpen, setIsPartialDialogOpen] = useState(false);
  const [partialReason, setPartialReason] = useState('');
  const [partialError, setPartialError] = useState('');
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);
  // Computed once per device — auto-focus the barcode field only where a hardware
  // scanner is used (fine pointer), so we never pop the soft keyboard on mobile.
  const [autoFocusBarcode] = useState(detectFinePointer);
  // Which bill (document) is expanded for scanning — one at a time so a single
  // camera element is mounted. Boxes scanned while a bill is open are attributed to
  // that bill. `scanTargetRef` mirrors the open bill's document id for the camera
  // callback (which is created once and can't read fresh state).
  const [openBillKey, setOpenBillKey] = useState<number | null>(null);
  const scanTargetRef = useRef<number | null>(null);
  const didAutoOpenRef = useRef(false);
  // Non-blocking scan queue: scans (camera or hardware gun) are accepted instantly
  // and synced to the backend one at a time in the background, so the barcode field
  // and Add button never lock up and the operator can keep firing boxes. `pendingCount`
  // drives the "syncing" indicator; `flashing` drives the green success blink.
  const [pendingCount, setPendingCount] = useState(0);
  const [flashing, setFlashing] = useState(false);
  // Boxes whose sync was rejected (over-invoice, not on bill, not found, …). Shown in
  // a separate queue under the scanner so the operator can see/retry/dismiss each one.
  const [failedScans, setFailedScans] = useState<FailedScan[]>([]);
  const scanQueueRef = useRef<{ barcode: string; documentId: number | null }[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const processingRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: scans = [], isLoading: isScansLoading } = useSalesDispatchBoxScans(entry?.id);
  const { data: skipRequest } = useDockingScanSkipRequestByDispatch(entry?.id);
  const { data: partialRequest } = useDockingPartialScanRequestByDispatch(entry?.id);
  const {
    data: barcodeScans,
    isFetching: isBarcodeScansLoading,
    error: barcodeScansError,
  } = useSalesDispatchBarcodeScans(entry?.id, { enabled: isBarcodeDialogOpen });
  const scanBox = useScanSalesDispatchBox();
  const removeScan = useRemoveSalesDispatchBoxScan();
  const createSkipRequest = useCreateDockingScanSkipRequest();
  const createPartialRequest = useCreateDockingPartialScanRequest();

  const isReadOnly = entry ? SCAN_CLOSED_STATUSES.includes(entry.status) : false;
  // In review mode we deliberately stay on the page to walk a closed entry.
  const closedScanRedirectPath = isReview ? '' : getClosedScanRedirectPath(entry);
  const canEditDocking = hasAnyPermission([
    GATE_PERMISSIONS.SALES_DISPATCH.CREATE,
    GATE_PERMISSIONS.SALES_DISPATCH.EDIT,
  ]);
  const canRequestScanSkip = hasPermission(ADMIN_PERMISSIONS.DOCKING.REQUEST_SCAN_SKIP);
  const canRequestPartial = hasPermission(ADMIN_PERMISSIONS.DOCKING.REQUEST_PARTIAL_SCAN);
  // Some companies (e.g. Jivo Beverages) don't scan boxes at the factory at all, so box
  // scanning is optional for them: operators can continue without scanning and without
  // the admin scan-skip approval flow. Driven by the backend per the entry's company.
  const isBoxScanOptional = entry?.gatepass_readiness?.box_scan_optional ?? false;
  const skipStatus = skipRequest?.status ?? null;
  const isSkipApproved = skipStatus === 'APPROVED';
  const isSkipPending = skipStatus === 'PENDING';
  const partialStatus = partialRequest?.status ?? null;
  const isPartialApproved = partialStatus === 'APPROVED';
  const isPartialPending = partialStatus === 'PENDING';
  const isSaving = scanBox.isPending || removeScan.isPending;

  // Keep the barcode field focused so a connected hardware scanner can fire one box
  // after another without the user clicking back into it. The field is never disabled
  // (scans queue in the background), so focus is retained between scans; we only need
  // to re-assert it on load and when the open bill changes. Skipped on touch devices
  // (autoFocusBarcode) so the soft keyboard never pops over the camera.
  useEffect(() => {
    if (autoFocusBarcode && entry && !isReadOnly && canEditDocking) {
      manualInputRef.current?.focus();
    }
  }, [autoFocusBarcode, entry, isReadOnly, canEditDocking, openBillKey]);

  const expectedBoxes = getExpectedDispatchBoxes(entry);
  // Partial = at least one box scanned but fewer than expected. Such a load needs a
  // partial-dispatch approval (the zero-scan case still uses the scan-skip flow).
  const isPartialScan = scans.length > 0 && expectedBoxes > 0 && scans.length < expectedBoxes;
  const scannedQuantity = useMemo(
    () => scans.reduce((total, scan) => total + parsePositiveNumber(scan.quantity), 0),
    [scans],
  );
  const billGroups = useMemo(() => buildBillGroups(entry, scans), [entry, scans]);
  const progressPercent =
    expectedBoxes > 0 ? Math.min(100, Math.round((scans.length / expectedBoxes) * 100)) : 0;

  // Auto-open the only bill (nothing to choose); multi-bill loads stay collapsed.
  useEffect(() => {
    if (!didAutoOpenRef.current && billGroups.length === 1) {
      didAutoOpenRef.current = true;
      setOpenBillKey(billGroups[0].key);
    }
  }, [billGroups]);

  // Keep the camera's scan target pointed at the currently open bill.
  useEffect(() => {
    const open = billGroups.find((bill) => bill.key === openBillKey);
    scanTargetRef.current = open ? open.documentId : null;
  }, [billGroups, openBillKey]);

  useEffect(() => {
    if (!closedScanRedirectPath || !entry) return;
    toast.info(getScanClosedMessage(entry.status));
    navigate(closedScanRedirectPath, { replace: true });
  }, [closedScanRedirectPath, entry, navigate]);

  // Latest entry id / refetch / mutation, read by the background queue worker so it
  // never closes over stale values while it drains.
  const queueCtxRef = useRef({ entryId: entry?.id, refetchEntry, scanBox });
  queueCtxRef.current = { entryId: entry?.id, refetchEntry, scanBox };

  const triggerFlash = useCallback(() => {
    setFlashing(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashing(false), 350);
  }, []);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  // Drain the queue one scan at a time. Reentrancy-guarded so only one worker runs;
  // new scans pushed while it runs are picked up before it exits.
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    let didProcess = false;
    while (scanQueueRef.current.length > 0) {
      const next = scanQueueRef.current[0];
      const { entryId, scanBox: scanMutation } = queueCtxRef.current;
      const key = next.barcode.toLowerCase();
      try {
        if (entryId == null) throw new Error('Docking details not found.');
        const saved = await scanMutation.mutateAsync({
          id: entryId,
          data: { barcode_raw: next.barcode, document: next.documentId },
        });
        if (saved.duplicate) {
          toast.warning(`${next.barcode}: already scanned for this docking`);
        } else {
          triggerFlash();
        }
        // It synced — drop it from the error queue if it was there from a prior try.
        setFailedScans((prev) => prev.filter((failed) => failed.barcode.toLowerCase() !== key));
      } catch (scanError) {
        const message = getErrorMessage(scanError, `Couldn't scan ${next.barcode}`);
        // Surface it in the persistent error queue (deduped by barcode), newest first.
        setFailedScans((prev) => [
          { barcode: next.barcode, documentId: next.documentId, reason: message },
          ...prev.filter((failed) => failed.barcode.toLowerCase() !== key),
        ]);
      } finally {
        scanQueueRef.current.shift();
        inFlightRef.current.delete(next.barcode.toLowerCase());
        setPendingCount(scanQueueRef.current.length);
        didProcess = true;
      }
    }
    processingRef.current = false;
    if (didProcess) await queueCtxRef.current.refetchEntry();
    if (scanQueueRef.current.length > 0) void processQueue();
  }, [triggerFlash]);

  // Accept a scan instantly: validate, dedupe, enqueue, keep the field focused, and
  // kick the background worker. Never awaits the network, so it can't block the field.
  const enqueueScan = useCallback(
    (rawBarcode: string, documentId: number | null) => {
      const barcode = rawBarcode.trim();
      if (!entry) {
        setError('Docking details not found.');
        return;
      }
      if (!barcode) {
        setError('Enter or scan a box barcode.');
        return;
      }
      if (isReadOnly || !canEditDocking) {
        setError('Box scans cannot be changed for this Docking entry.');
        return;
      }
      const key = barcode.toLowerCase();
      const already =
        inFlightRef.current.has(key) ||
        scans.some(
          (scan) =>
            scan.box_barcode.toLowerCase() === key || scan.barcode_raw.toLowerCase() === key,
        );
      if (already) {
        setError('');
        toast.warning('This box is already in the scan list');
        setManualBarcode('');
        return;
      }
      setError('');
      inFlightRef.current.add(key);
      scanQueueRef.current.push({ barcode, documentId });
      setPendingCount(scanQueueRef.current.length);
      setManualBarcode('');
      if (autoFocusBarcode) manualInputRef.current?.focus();
      void processQueue();
    },
    [autoFocusBarcode, canEditDocking, entry, isReadOnly, scans, processQueue],
  );

  // Stable ref so the camera's one-time onScan callback always enqueues against the
  // latest state and the currently open bill.
  const enqueueRef = useRef(enqueueScan);
  enqueueRef.current = enqueueScan;
  const handleCameraScan = useCallback((decodedText: string) => {
    enqueueRef.current(decodedText, scanTargetRef.current);
  }, []);

  const scanner = useScanner({ onScan: handleCameraScan, debounceMs: 1800 });

  // Switching bills tears the camera element out of one accordion and into another,
  // so stop any running camera first; the operator restarts it in the open bill.
  useEffect(() => {
    if (scanner.isScanning) scanner.stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBillKey]);

  const handleManualSubmit = (documentId: number | null) => {
    enqueueScan(manualBarcode, documentId);
  };

  const handleToggleBill = (key: number) => {
    setOpenBillKey((current) => (current === key ? null : key));
  };

  const handleRetryFailedScan = (failed: FailedScan) => {
    setFailedScans((prev) =>
      prev.filter((item) => item.barcode.toLowerCase() !== failed.barcode.toLowerCase()),
    );
    enqueueScan(failed.barcode, failed.documentId);
  };

  const handleDismissFailedScan = (failed: FailedScan) => {
    setFailedScans((prev) =>
      prev.filter((item) => item.barcode.toLowerCase() !== failed.barcode.toLowerCase()),
    );
  };

  const handleRemoveScan = async (scan: SalesDispatchBoxScan) => {
    if (!entry || isReadOnly || !canEditDocking) return;
    setError('');
    try {
      await removeScan.mutateAsync({ id: entry.id, scanId: scan.id });
      await refetchEntry();
      toast.success('Box scan removed');
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'Unable to remove this box scan'));
    }
  };

  const handleNext = () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }
    if (!isBoxScanOptional) {
      if (scans.length === 0 && !isSkipApproved) {
        setError(
          isSkipPending
            ? 'Box scanning skip is awaiting admin approval. You can continue once it is approved.'
            : 'Scan at least one box, or request approval to skip scanning.',
        );
        return;
      }
      if (isPartialScan && !isPartialApproved) {
        setError(
          isPartialPending
            ? 'Partial dispatch is awaiting admin approval. You can continue once it is approved.'
            : 'Scan all boxes, or request partial dispatch approval to continue.',
        );
        return;
      }
    }
    navigate(DOCKING_ROUTES.attachments(entry.vehicle_entry));
  };

  const handleSubmitSkipRequest = async () => {
    if (!entry) return;
    const trimmedReason = skipReason.trim();
    if (!trimmedReason) {
      setSkipError('Enter a reason for skipping box scanning.');
      return;
    }
    setSkipError('');
    try {
      await createSkipRequest.mutateAsync({ sales_dispatch: entry.id, reason: trimmedReason });
      setIsSkipDialogOpen(false);
      setSkipReason('');
      toast.success('Scan skip request sent for admin approval');
    } catch (submitError) {
      setSkipError(getErrorMessage(submitError, 'Unable to submit the skip request'));
    }
  };

  const handleSubmitPartialRequest = async () => {
    if (!entry) return;
    const trimmedReason = partialReason.trim();
    if (!trimmedReason) {
      setPartialError('Enter a reason for dispatching with a partial scan.');
      return;
    }
    setPartialError('');
    try {
      await createPartialRequest.mutateAsync({ sales_dispatch: entry.id, reason: trimmedReason });
      setIsPartialDialogOpen(false);
      setPartialReason('');
      toast.success('Partial dispatch request sent for admin approval');
    } catch (submitError) {
      setPartialError(getErrorMessage(submitError, 'Unable to submit the partial dispatch request'));
    }
  };

  if (isEntryLoading || isScansLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={2}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={
            error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(DOCKING_ROUTES.newEntry)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  if (closedScanRedirectPath) {
    return <StepLoadingSpinner label="Opening the current Docking step..." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={2}
        totalSteps={DOCKING_TOTAL_STEPS}
        title="Docking"
        error={error || scanner.error || null}
      />

      {isReview ? <ReviewModeBanner /> : null}

      {isBoxScanOptional ? (
        <ScanOptionalPanel />
      ) : scans.length === 0 ? (
        <ScanSkipPanel
          skipRequest={skipRequest}
          canRequest={canRequestScanSkip && !isReadOnly && canEditDocking}
          hasScans={false}
          isSubmitting={createSkipRequest.isPending}
          onRequest={() => {
            setSkipReason('');
            setSkipError('');
            setIsSkipDialogOpen(true);
          }}
        />
      ) : isPartialScan ? (
        <PartialScanPanel
          partialRequest={partialRequest}
          canRequest={canRequestPartial && !isReadOnly && canEditDocking}
          scanned={scans.length}
          expected={expectedBoxes}
          isSubmitting={createPartialRequest.isPending}
          onRequest={() => {
            setPartialReason('');
            setPartialError('');
            setIsPartialDialogOpen(true);
          }}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ScanLine className="h-5 w-5" />
                  Box Scanning
                </CardTitle>
                <CardDescription>
                  Open a bill below to scan its boxes against that bill.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBarcodeDialogOpen(true)}
                >
                  <PackageSearch className="h-4 w-4" />
                  Check Barcode Scans
                </Button>
                {pendingCount > 0 ? (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Syncing {pendingCount}
                  </Badge>
                ) : null}
                <Badge variant={scans.length > 0 ? 'success' : 'outline'}>
                  {scans.length} scanned
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <ScanMetric
                label="Expected Boxes"
                value={expectedBoxes > 0 ? formatNumber(expectedBoxes) : '-'}
              />
              <ScanMetric label="Scanned Boxes" value={String(scans.length)} />
              <ScanMetric
                label="Scanned Qty"
                value={scannedQuantity > 0 ? formatNumber(scannedQuantity) : '-'}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Scan progress</span>
                <span>{expectedBoxes > 0 ? `${progressPercent}%` : 'Open count'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: expectedBoxes > 0 ? `${progressPercent}%` : scans.length ? '100%' : '0%',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Truck className="h-5 w-5" />
              Load Context
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <InfoItem label="Entry No." value={entry.entry_no} />
            <InfoItem label="Vehicle" value={entry.vehicle_no} />
            <InfoItem label="Driver" value={entry.driver_name} />
            <InfoItem label="Customer" value={entry.customer_name || entry.to_warehouse} />
            <InfoItem label="Docked At" value={formatTimestamp(entry.docked_at)} />
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="h-5 w-5" />
            Bills on this Load
          </CardTitle>
          <CardDescription>
            {billGroups.length} bill{billGroups.length === 1 ? '' : 's'}. Open a bill to scan its
            boxes — each box is recorded against that bill only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {billGroups.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              {entry.item_summary || 'No bills/items found for this Docking entry.'}
            </div>
          ) : (
            billGroups.map((bill) => (
              <BillScanCard
                key={bill.key}
                bill={bill}
                isOpen={openBillKey === bill.key}
                onToggle={handleToggleBill}
                scanner={scanner}
                manualBarcode={manualBarcode}
                manualInputRef={manualInputRef}
                autoFocusBarcode={autoFocusBarcode}
                pendingCount={pendingCount}
                flashing={flashing}
                failedScans={failedScans}
                isReadOnly={isReadOnly}
                canEdit={canEditDocking}
                onManualChange={(value) => {
                  setManualBarcode(value);
                  setError('');
                }}
                onManualSubmit={() => handleManualSubmit(bill.documentId)}
                onRemoveScan={handleRemoveScan}
                onRetryFailed={handleRetryFailedScan}
                onDismissFailed={handleDismissFailedScan}
              />
            ))
          )}
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() =>
          isReview
            ? navigate(DOCKING_ROUTES.detail(entry.id))
            : navigate(`${DOCKING_ROUTES.newEntry}?entryId=${entryId || entry.vehicle_entry}`)
        }
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={
          isReview
            ? () => navigate(DOCKING_ROUTES.attachments(entry.vehicle_entry, true))
            : handleNext
        }
        isSaving={isSaving}
        nextLabel={isReview ? 'Next →' : 'Continue to Attachments'}
      />

      <Dialog
        open={isSkipDialogOpen}
        onOpenChange={(open) => {
          if (createSkipRequest.isPending) return;
          setIsSkipDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Skip Box Scanning</DialogTitle>
            <DialogDescription>
              Send this Docking entry to Admin for approval to continue without scanning boxes. You
              cannot continue until an admin approves the request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="docking-scan-skip-reason">Reason</Label>
            <Textarea
              id="docking-scan-skip-reason"
              value={skipReason}
              onChange={(event) => {
                setSkipReason(event.target.value);
                setSkipError('');
              }}
              placeholder="Why should box scanning be skipped for this Docking entry?"
            />
            {skipError ? <p className="text-sm text-destructive">{skipError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSkipDialogOpen(false)}
              disabled={createSkipRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitSkipRequest()}
              disabled={createSkipRequest.isPending || !skipReason.trim()}
            >
              {createSkipRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPartialDialogOpen}
        onOpenChange={(open) => {
          if (createPartialRequest.isPending) return;
          setIsPartialDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Partial Dispatch Approval</DialogTitle>
            <DialogDescription>
              Only {scans.length} of {expectedBoxes} boxes are scanned. Send this Docking entry to
              Admin for approval to dispatch with a partial scan. You cannot continue until an admin
              approves the request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="docking-partial-scan-reason">Reason</Label>
            <Textarea
              id="docking-partial-scan-reason"
              value={partialReason}
              onChange={(event) => {
                setPartialReason(event.target.value);
                setPartialError('');
              }}
              placeholder="Why is this Docking entry dispatched with a partial box scan?"
            />
            {partialError ? <p className="text-sm text-destructive">{partialError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPartialDialogOpen(false)}
              disabled={createPartialRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitPartialRequest()}
              disabled={createPartialRequest.isPending || !partialReason.trim()}
            >
              {createPartialRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScansDialog
        open={isBarcodeDialogOpen}
        onOpenChange={setIsBarcodeDialogOpen}
        isLoading={isBarcodeScansLoading}
        sessions={barcodeScans?.sessions ?? []}
        errorMessage={
          barcodeScansError
            ? getErrorMessage(barcodeScansError, 'Unable to load barcode scans')
            : null
        }
        sapDocNum={entry.sap_doc_num}
        entryId={entry.id}
        canEdit={canEditDocking && !isReadOnly}
        onImported={() => void refetchEntry()}
      />
    </div>
  );
}

function BarcodeScansDialog({
  open,
  onOpenChange,
  isLoading,
  sessions,
  errorMessage,
  sapDocNum,
  entryId,
  canEdit,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  sessions: BarcodeDispatchSession[];
  errorMessage: string | null;
  sapDocNum?: string | null;
  entryId: number;
  canEdit: boolean;
  onImported: () => void;
}) {
  const totalBoxes = sessions.reduce((sum, session) => sum + session.box_count, 0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const importScans = useImportSalesDispatchBarcodeScans();

  const toggle = (set: Set<number>, id: number) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const selectedCount = selected.size;
  const selectedBoxCount = sessions
    .filter((session) => selected.has(session.session_id))
    .reduce((sum, session) => sum + session.box_count, 0);

  const handleAdd = async () => {
    if (selectedCount === 0) return;
    try {
      const result = await importScans.mutateAsync({
        id: entryId,
        data: { session_ids: Array.from(selected) },
      });
      toast.success(
        `Added ${result.imported} box${result.imported === 1 ? '' : 'es'} to docking` +
          (result.skipped ? ` (${result.skipped} skipped)` : ''),
      );
      setSelected(new Set());
      onImported();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add boxes to docking'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Boxes Scanned in Barcode Module
          </DialogTitle>
          <DialogDescription>
            Sessions scanned in the barcode module for SAP invoice{' '}
            <span className="font-medium">{formatValue(sapDocNum)}</span>. Select one or more
            sessions and add their boxes to this Docking entry.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking barcode module...
          </div>
        ) : errorMessage ? (
          <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PackageSearch className="h-8 w-8 text-muted-foreground/60" />
            <p className="font-medium">No barcode scans found for this invoice.</p>
            <p>This dispatch was not scanned in the barcode module, or used a different bill.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Found <span className="font-medium text-foreground">{totalBoxes}</span> box
              {totalBoxes === 1 ? '' : 'es'} across{' '}
              <span className="font-medium text-foreground">{sessions.length}</span> barcode session
              {sessions.length === 1 ? '' : 's'}.
            </div>
            {sessions.map((session) => {
              const isOpen = expanded.has(session.session_id);
              const isSelected = selected.has(session.session_id);
              return (
                <div key={session.session_id} className="overflow-hidden rounded-md border">
                  <div className="flex items-center gap-3 bg-muted/40 p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                      checked={isSelected}
                      disabled={!canEdit || session.box_count === 0}
                      onChange={() => setSelected((prev) => toggle(prev, session.session_id))}
                      title={
                        session.box_count === 0
                          ? 'No boxes to add'
                          : canEdit
                            ? 'Select to add to docking'
                            : 'You cannot edit this Docking entry'
                      }
                    />
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setExpanded((prev) => toggle(prev, session.session_id))}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          Bill {formatValue(session.bill_number)}
                          {session.customer_name ? (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · {session.customer_name}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Scanned {formatTimestamp(session.scanned_at)}
                        </div>
                      </div>
                    </button>
                    <Badge variant="outline">{session.status}</Badge>
                    <Badge variant={session.box_count > 0 ? 'success' : 'outline'}>
                      {session.box_count} box{session.box_count === 1 ? '' : 'es'}
                    </Badge>
                  </div>

                  {isOpen ? (
                    <div className="border-t">
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Scanned at {formatTimestamp(session.scanned_at)}
                      </div>
                      {session.boxes.length === 0 ? (
                        <div className="p-4 pt-0 text-sm text-muted-foreground">
                          No active box scans on this session.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border-t">
                          <table className="w-full text-sm">
                            <thead className="border-b bg-muted/30">
                              <tr>
                                <th className="p-3 text-left font-medium">Barcode</th>
                                <th className="p-3 text-left font-medium">Item</th>
                                <th className="p-3 text-left font-medium">Batch</th>
                                <th className="p-3 text-left font-medium">Qty</th>
                                <th className="p-3 text-left font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {session.boxes.map((box) => (
                                <tr key={box.id} className="border-b last:border-b-0">
                                  <td className="p-3 font-mono text-xs font-medium">{box.barcode}</td>
                                  <td className="p-3">
                                    <div className="font-medium">{box.item_code || '-'}</div>
                                    <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                                      {box.item_name || '-'}
                                    </div>
                                  </td>
                                  <td className="p-3">{formatValue(box.batch_number)}</td>
                                  <td className="p-3">
                                    {[box.quantity, box.uom].filter(Boolean).join(' ') || '-'}
                                  </td>
                                  <td className="p-3">
                                    <Badge variant="outline">
                                      {box.scan_status || box.box_status || '-'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importScans.isPending}
          >
            Close
          </Button>
          {sessions.length > 0 ? (
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!canEdit || selectedCount === 0 || importScans.isPending}
            >
              {importScans.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {selectedCount > 0
                ? `Add ${selectedCount} session${selectedCount === 1 ? '' : 's'} (${selectedBoxCount} box${selectedBoxCount === 1 ? '' : 'es'})`
                : 'Add to docking'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FailedScan {
  barcode: string;
  documentId: number | null;
  reason: string;
}

interface ItemScanRow {
  key: string;
  lineNum: number;
  itemCode: string;
  itemName: string;
  expectedQuantity: number;
  uom: string;
  totalWeight: number;
  expectedBoxes: number;
  scanCount: number;
  scannedQuantity: number;
  progressPercent: number | null;
  isComplete: boolean;
}

function BillScanCard({
  bill,
  isOpen,
  onToggle,
  scanner,
  manualBarcode,
  manualInputRef,
  autoFocusBarcode,
  pendingCount,
  flashing,
  failedScans,
  isReadOnly,
  canEdit,
  onManualChange,
  onManualSubmit,
  onRemoveScan,
  onRetryFailed,
  onDismissFailed,
}: {
  bill: BillGroup;
  isOpen: boolean;
  onToggle: (key: number) => void;
  scanner: ReturnType<typeof useScanner>;
  manualBarcode: string;
  manualInputRef: RefObject<HTMLInputElement | null>;
  autoFocusBarcode: boolean;
  pendingCount: number;
  flashing: boolean;
  failedScans: FailedScan[];
  isReadOnly: boolean;
  canEdit: boolean;
  onManualChange: (value: string) => void;
  onManualSubmit: () => void;
  onRemoveScan: (scan: SalesDispatchBoxScan) => void;
  onRetryFailed: (failed: FailedScan) => void;
  onDismissFailed: (failed: FailedScan) => void;
}) {
  const canScan = !isReadOnly && canEdit;
  const inputId = `box-barcode-${bill.key}`;

  return (
    <div className="overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={() => onToggle(bill.key)}
        className="flex w-full items-center gap-3 bg-muted/40 p-3 text-left transition-colors hover:bg-muted/60"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            Bill {formatValue(bill.sapDocNum)}
            {bill.customerName ? (
              <span className="font-normal text-muted-foreground"> · {bill.customerName}</span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {bill.items.length} item{bill.items.length === 1 ? '' : 's'}
          </div>
        </div>
        <Badge variant="outline">
          {bill.scannedBoxes}
          {bill.expectedBoxes > 0 ? `/${bill.expectedBoxes}` : ''} box
          {bill.scannedBoxes === 1 && bill.expectedBoxes <= 1 ? '' : 'es'}
        </Badge>
        <Badge
          variant={bill.status === 'Complete' ? 'success' : 'outline'}
          className={cn(bill.status === 'Partial' && 'border-amber-200 bg-amber-50 text-amber-700')}
        >
          {bill.status === 'Complete' ? (
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          ) : null}
          {bill.status}
        </Badge>
      </button>

      {isOpen ? (
        <div className="space-y-4 border-t p-4">
          <BillItemsTable summary={bill.summary} />

          {canScan ? (
            <div className="grid gap-4 rounded-md border bg-muted/10 p-3 xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                {/* The camera viewport only takes space while the camera is running;
                    when off we just show the Start button. */}
                {scanner.isScanning ? (
                  <>
                    <div className="relative overflow-hidden rounded-md border bg-slate-950">
                      <div
                        id={scanner.elementId}
                        className="aspect-square min-h-[220px] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
                      />
                      <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-white/80" />
                      {/* Green blink confirming a box was accepted via the camera. */}
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-0 bg-emerald-400/60 transition-opacity duration-200',
                          flashing ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={scanner.stopScanning}
                        className="flex-1"
                      >
                        <Camera className="h-4 w-4" />
                        Stop
                      </Button>
                      {scanner.torchSupported ? (
                        <Button
                          type="button"
                          variant={scanner.torchOn ? 'default' : 'outline'}
                          onClick={() => void scanner.toggleTorch()}
                          title="Toggle flashlight"
                        >
                          <Flashlight className="h-4 w-4" />
                          {scanner.torchOn ? 'Light on' : 'Light'}
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={scanner.startScanning}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4" />
                    Start Camera
                  </Button>
                )}
              </div>

              <form
                className="space-y-3"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  onManualSubmit();
                }}
              >
                <Label htmlFor={inputId}>Scan boxes for Bill {formatValue(bill.sapDocNum)}</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    ref={manualInputRef}
                    id={inputId}
                    autoFocus={autoFocusBarcode}
                    value={manualBarcode}
                    onChange={(event) => onManualChange(event.target.value)}
                    placeholder="Scan or type barcode"
                    className={cn(
                      'font-mono transition-shadow',
                      flashing && 'ring-2 ring-emerald-400 ring-offset-1',
                    )}
                  />
                  <Button type="submit" disabled={!manualBarcode.trim()}>
                    <PackageCheck className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {pendingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing {pendingCount}…
                    </span>
                  ) : null}
                  <span>Boxes are recorded against this bill only, capped at its invoiced quantity.</span>
                </p>
              </form>
            </div>
          ) : null}

          <FailedScansQueue
            failedScans={failedScans}
            canEdit={canScan}
            onRetry={onRetryFailed}
            onDismiss={onDismissFailed}
          />

          <BillScannedBoxes
            scans={bill.scans}
            canRemove={canScan}
            onRemoveScan={onRemoveScan}
          />
        </div>
      ) : null}
    </div>
  );
}

function BillItemsTable({ summary }: { summary: BillScanSummary }) {
  const { items, unplannedScanCount } = summary;
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No item lines on this bill.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
            <th className="p-3 text-left font-medium">Item</th>
            <th className="w-[140px] p-3 text-right font-medium">Invoice Qty</th>
            <th className="w-[110px] p-3 text-right font-medium">Boxes</th>
            <th className="w-[170px] p-3 text-left font-medium">Scanned</th>
            <th className="w-[120px] p-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.key}
              className={cn(
                'border-b last:border-b-0',
                item.scanCount > 0 && !item.isComplete && 'bg-amber-50/60',
                item.isComplete && 'bg-emerald-50/60',
              )}
            >
              <td className="whitespace-nowrap p-3 align-top font-mono text-xs font-semibold">
                {formatValue(item.itemCode)}
              </td>
              <td className="p-3 align-top">
                <div className="font-medium">{formatValue(item.itemName)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Line {item.lineNum + 1}</div>
              </td>
              <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                {formatQuantity(item.expectedQuantity, item.uom)}
              </td>
              <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                {item.expectedBoxes > 0 ? formatNumber(item.expectedBoxes) : '-'}
              </td>
              <td className="p-3 align-top">
                <div className="font-medium">
                  {item.scanCount} box{item.scanCount === 1 ? '' : 'es'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.scannedQuantity > 0 ? formatQuantity(item.scannedQuantity, item.uom) : '-'}
                </div>
                {item.progressPercent !== null ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                ) : null}
              </td>
              <td className="p-3 align-top">
                <Badge
                  variant={item.isComplete ? 'success' : 'outline'}
                  className={cn(
                    !item.isComplete &&
                      item.scanCount > 0 &&
                      'border-amber-200 bg-amber-50 text-amber-700',
                  )}
                >
                  {item.isComplete ? 'Complete' : item.scanCount > 0 ? 'Partial' : 'Open'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {unplannedScanCount > 0 ? (
        <div className="border-t bg-red-50 p-2 text-xs text-red-700">
          {unplannedScanCount} scanned box{unplannedScanCount === 1 ? '' : 'es'} outside this bill's
          item list.
        </div>
      ) : null}
    </div>
  );
}

function FailedScansQueue({
  failedScans,
  canEdit,
  onRetry,
  onDismiss,
}: {
  failedScans: FailedScan[];
  canEdit: boolean;
  onRetry: (failed: FailedScan) => void;
  onDismiss: (failed: FailedScan) => void;
}) {
  if (failedScans.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-md border border-red-200">
      <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed scans ({failedScans.length})
      </div>
      <ul className="divide-y">
        {failedScans.map((failed) => (
          <li
            key={failed.barcode}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="font-mono text-xs font-medium">{failed.barcode}</div>
              <div className="text-xs text-red-600">{failed.reason}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit}
                onClick={() => onRetry(failed)}
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canEdit}
                onClick={() => onDismiss(failed)}
                title="Remove from list"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BillScannedBoxes({
  scans,
  canRemove,
  onRemoveScan,
}: {
  scans: SalesDispatchBoxScan[];
  canRemove: boolean;
  onRemoveScan: (scan: SalesDispatchBoxScan) => void;
}) {
  if (scans.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No boxes scanned for this bill yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Barcode</th>
            <th className="p-3 text-left font-medium">Item</th>
            <th className="p-3 text-left font-medium">Batch</th>
            <th className="p-3 text-left font-medium">Qty</th>
            <th className="p-3 text-left font-medium">Warehouse</th>
            <th className="p-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan.id} className="border-b last:border-b-0">
              <td className="p-3 font-mono text-xs font-medium">{scan.box_barcode}</td>
              <td className="p-3">
                <div className="font-medium">{scan.item_code || '-'}</div>
                <div className="max-w-[280px] truncate text-xs text-muted-foreground">
                  {scan.item_name || '-'}
                </div>
              </td>
              <td className="p-3">{formatValue(scan.batch_number)}</td>
              <td className="p-3">{[scan.quantity, scan.uom].filter(Boolean).join(' ') || '-'}</td>
              <td className="p-3">{formatValue(scan.warehouse_code)}</td>
              <td className="p-3 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canRemove}
                  onClick={() => void onRemoveScan(scan)}
                  title="Remove scan"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ScanOptionalPanel() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 p-4 text-sky-900">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">Box scanning is optional</p>
        <p className="text-sm">
          Boxes are not scanned at the factory for this company. You can continue to attachments
          without scanning. You may still scan boxes below if you want to record them.
        </p>
      </div>
    </div>
  );
}

function ScanSkipPanel({
  skipRequest,
  canRequest,
  hasScans,
  isSubmitting,
  onRequest,
}: {
  skipRequest?: DockingScanSkipRequest | null;
  canRequest: boolean;
  hasScans: boolean;
  isSubmitting: boolean;
  onRequest: () => void;
}) {
  const status = skipRequest?.status ?? null;

  if (status === 'APPROVED') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Scanning skip approved</p>
          <p className="text-sm">
            {skipRequest?.reviewed_by_name
              ? `Approved by ${skipRequest.reviewed_by_name}. `
              : ''}
            You can continue to attachments without scanning boxes.
          </p>
          {skipRequest?.review_notes ? (
            <p className="text-sm text-emerald-800">Note: {skipRequest.review_notes}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Scanning skip pending approval</p>
          <p className="text-sm">
            An admin must approve this request before you can continue without scanning. You can
            still scan boxes to proceed normally.
          </p>
          {skipRequest?.reason ? (
            <p className="text-sm text-amber-800">Reason: {skipRequest.reason}</p>
          ) : null}
        </div>
      </div>
    );
  }

  // Rejected or no request yet.
  const wasRejected = status === 'REJECTED';

  if (!wasRejected && !canRequest) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">
            {wasRejected ? 'Scanning skip rejected' : "Can't scan these boxes?"}
          </p>
          <p className="text-sm text-muted-foreground">
            {wasRejected
              ? 'Please scan boxes to continue, or raise a new skip request.'
              : 'Request admin approval to continue without scanning boxes for this Docking entry.'}
          </p>
          {wasRejected && skipRequest?.review_notes ? (
            <p className="text-sm text-red-700">Reason: {skipRequest.review_notes}</p>
          ) : null}
        </div>
      </div>
      {canRequest ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRequest}
          disabled={isSubmitting || hasScans}
          title={hasScans ? 'Remove scans before requesting a skip' : undefined}
        >
          {wasRejected ? 'Request Again' : 'Request to Skip Scanning'}
        </Button>
      ) : null}
    </div>
  );
}

function PartialScanPanel({
  partialRequest,
  canRequest,
  scanned,
  expected,
  isSubmitting,
  onRequest,
}: {
  partialRequest?: DockingPartialScanRequest | null;
  canRequest: boolean;
  scanned: number;
  expected: number;
  isSubmitting: boolean;
  onRequest: () => void;
}) {
  const status = partialRequest?.status ?? null;

  if (status === 'APPROVED') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Partial dispatch approved</p>
          <p className="text-sm">
            {partialRequest?.reviewed_by_name ? `Approved by ${partialRequest.reviewed_by_name}. ` : ''}
            You can continue to attachments with the boxes scanned so far.
          </p>
          {partialRequest?.review_notes ? (
            <p className="text-sm text-emerald-800">Note: {partialRequest.review_notes}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Partial dispatch pending approval</p>
          <p className="text-sm">
            An admin must approve this request before you can continue with a partial scan. You can
            still scan the remaining boxes to proceed normally.
          </p>
          {partialRequest?.reason ? (
            <p className="text-sm text-amber-800">Reason: {partialRequest.reason}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const wasRejected = status === 'REJECTED';

  if (!wasRejected && !canRequest) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">
            {wasRejected ? 'Partial dispatch rejected' : 'Dispatching with a partial scan?'}
          </p>
          <p className="text-sm text-muted-foreground">
            {wasRejected
              ? 'Please scan the remaining boxes to continue, or raise a new request.'
              : `Only ${scanned} of ${expected} boxes are scanned. Request admin approval to dispatch this Docking entry with a partial scan.`}
          </p>
          {wasRejected && partialRequest?.review_notes ? (
            <p className="text-sm text-red-700">Reason: {partialRequest.review_notes}</p>
          ) : null}
        </div>
      </div>
      {canRequest ? (
        <Button type="button" variant="outline" onClick={onRequest} disabled={isSubmitting}>
          {wasRejected ? 'Request Again' : 'Request Partial Dispatch Approval'}
        </Button>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="border-b pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}

function getClosedScanRedirectPath(entry?: SalesDispatchGateOut) {
  if (!entry || !SCAN_CLOSED_STATUSES.includes(entry.status)) return '';
  if (entry.status === 'GATEPASS_PRINTED' || entry.status === 'PRINT_COMMITTED') {
    return DOCKING_ROUTES.gatepass(entry.vehicle_entry);
  }
  return DOCKING_ROUTES.detail(entry.id);
}

function getScanClosedMessage(status: SalesDispatchGateOut['status']) {
  if (status === 'GATEPASS_PRINTED' || status === 'PRINT_COMMITTED') {
    return 'Box scanning is closed after gatepass printing.';
  }
  return 'Box scanning is closed for this Docking entry.';
}

interface BillScanSummary {
  items: ItemScanRow[];
  unplannedScanCount: number;
}

interface BillGroup {
  key: number;
  documentId: number | null;
  sapDocNum: string;
  customerName: string;
  items: SalesDispatchItem[];
  scans: SalesDispatchBoxScan[];
  expectedBoxes: number;
  scannedBoxes: number;
  summary: BillScanSummary;
  status: 'Open' | 'Partial' | 'Complete';
}

// Group the load's scans under the bill (SAP document) each belongs to, so the
// operator scans into one bill at a time and a box never reflects on every bill.
function buildBillGroups(
  entry: SalesDispatchGateOut | undefined,
  scans: SalesDispatchBoxScan[],
): BillGroup[] {
  if (!entry) return [];
  const documents = entry.documents ?? [];
  if (documents.length > 0) {
    return documents.map((document) =>
      makeBillGroup({
        key: document.id,
        documentId: document.id,
        sapDocNum: document.sap_doc_num || String(document.sap_doc_entry || ''),
        customerName: document.customer_name || '',
        items: getDocumentItems(entry, document),
        scans: scans.filter((scan) => scan.document === document.id),
        expectedBoxes: getExpectedDocumentBoxes(document),
      }),
    );
  }
  // Legacy single-document docking: synthesize one bill from the entry header.
  const items = entry.items ?? [];
  if (items.length === 0 && scans.length === 0) return [];
  return [
    makeBillGroup({
      key: 0,
      documentId: null,
      sapDocNum: entry.sap_doc_num || '',
      customerName: entry.customer_name || entry.to_warehouse || '',
      items,
      scans,
      expectedBoxes: getExpectedDispatchBoxes(entry),
    }),
  ];
}

function makeBillGroup(args: {
  key: number;
  documentId: number | null;
  sapDocNum: string;
  customerName: string;
  items: SalesDispatchItem[];
  scans: SalesDispatchBoxScan[];
  expectedBoxes: number;
}): BillGroup {
  const summary = summarizeItems(args.items, args.scans);
  const scannedBoxes = args.scans.length;
  const allComplete = summary.items.length > 0 && summary.items.every((item) => item.isComplete);
  const status: BillGroup['status'] = allComplete
    ? 'Complete'
    : scannedBoxes > 0
      ? 'Partial'
      : 'Open';
  return { ...args, scannedBoxes, summary, status };
}

function getDocumentItems(
  entry: SalesDispatchGateOut,
  document: SalesDispatchGateOutDocument,
): SalesDispatchItem[] {
  if (document.items?.length) return document.items;
  const matched = entry.items.filter(
    (item) =>
      (item.document != null && item.document === document.id) ||
      (item.document_sap_doc_num && item.document_sap_doc_num === document.sap_doc_num),
  );
  if (matched.length) return matched;
  return entry.documents?.length ? [] : entry.items;
}

// Allocate a single bill's scans to its item lines (document already matches), with
// a greedy fallback for legacy null-document scans so none is double-counted.
function summarizeItems(
  expectedItems: SalesDispatchItem[],
  scans: SalesDispatchBoxScan[],
): BillScanSummary {
  const stats = expectedItems.map(() => ({ count: 0, quantity: 0 }));
  const candidatesByCode = new Map<string, number[]>();
  expectedItems.forEach((item, index) => {
    const code = normalizeItemCode(item.item_code);
    if (!code) return;
    const list = candidatesByCode.get(code);
    if (list) list.push(index);
    else candidatesByCode.set(code, [index]);
  });

  let unplannedScanCount = 0;
  for (const scan of scans) {
    const code = normalizeItemCode(scan.item_code);
    const candidates = code ? candidatesByCode.get(code) : undefined;
    if (!candidates || candidates.length === 0) {
      unplannedScanCount += 1;
      continue;
    }

    let targetIndex = -1;
    // 1) The exact bill the backend attributed this scan to.
    if (scan.document != null) {
      const matched = candidates.find((index) => expectedItems[index].document === scan.document);
      if (matched !== undefined) targetIndex = matched;
    }
    // 2) Greedy fill: the first bill that still has un-scanned boxes for the item.
    if (targetIndex === -1) {
      const open = candidates.find((index) => {
        const expectedBoxes = getExpectedItemBoxes(expectedItems[index]);
        return expectedBoxes <= 0 || stats[index].count < expectedBoxes;
      });
      targetIndex = open !== undefined ? open : candidates[0];
    }

    stats[targetIndex].count += 1;
    stats[targetIndex].quantity += parsePositiveNumber(scan.quantity);
  }

  const items = expectedItems.map((item, index) => {
    const itemCode = item.item_code || '';
    const scanStats = stats[index];
    const expectedQuantity = parsePositiveNumber(item.quantity);
    const progressPercent =
      expectedQuantity > 0
        ? Math.min(100, Math.round((scanStats.quantity / expectedQuantity) * 100))
        : null;

    return {
      key: String(item.id || `${item.item_code}-${item.line_num}-${index}`),
      lineNum: Number(item.line_num ?? index),
      itemCode,
      itemName: item.item_name || '',
      expectedQuantity,
      uom: item.uom || '',
      totalWeight: parsePositiveNumber(item.total_weight),
      expectedBoxes: getExpectedItemBoxes(item),
      scanCount: scanStats.count,
      scannedQuantity: scanStats.quantity,
      progressPercent,
      isComplete: expectedQuantity > 0 ? scanStats.quantity >= expectedQuantity : false,
    };
  });

  return { items, unplannedScanCount };
}

function normalizeItemCode(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function formatQuantity(quantity: number, uom?: string) {
  if (!quantity) return '-';
  return [formatNumber(quantity), uom].filter(Boolean).join(' ');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);
}
