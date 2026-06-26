import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Loader2,
  PackageCheck,
  PackageSearch,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  Truck,
  WifiOff,
} from 'lucide-react';
import {
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  memo,
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
  type SalesDispatchBoxScanFailureReason,
  type SalesDispatchGateOut,
  type SalesDispatchItem,
  useImportSalesDispatchBarcodeScans,
  useRemoveSalesDispatchBoxScan,
  useSalesDispatchBarcodeScans,
  useSalesDispatchBoxScans,
  useSalesDispatchByVehicleEntry,
} from '@/modules/gate/api';
import { StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
import {
  MAX_SYNC_ATTEMPTS,
  type QueuedScan,
  scanFeedback,
  useBoxScanSync,
} from '@/modules/gate/services/boxScanQueue';
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
  getExpectedItemBoxes,
  parsePositiveNumber,
} from './salesDispatchBoxCounts';
import { DOCKING_TOTAL_STEPS, formatTimestamp, formatValue } from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

type ScanSource = 'camera' | 'manual';

const FAILURE_LABELS: Record<SalesDispatchBoxScanFailureReason, string> = {
  EMPTY: 'Empty',
  UNKNOWN_BARCODE: 'Unknown barcode',
  NOT_A_BOX: 'Not a box',
  INVALID_STATUS: 'Invalid status',
  DUPLICATE: 'Duplicate',
};

const SCAN_CLOSED_STATUSES = [
  'GATEPASS_PRINTED',
  'PRINT_COMMITTED',
  'DISPATCHED',
  'REJECTED',
  'CANCELLED',
] as const;

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

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const {
    data: scans = [],
    isLoading: isScansLoading,
    refetch: refetchScans,
  } = useSalesDispatchBoxScans(entry?.id);
  const { data: skipRequest } = useDockingScanSkipRequestByDispatch(entry?.id);
  const { data: partialRequest } = useDockingPartialScanRequestByDispatch(entry?.id);
  const {
    data: barcodeScans,
    isFetching: isBarcodeScansLoading,
    error: barcodeScansError,
  } = useSalesDispatchBarcodeScans(entry?.id, { enabled: isBarcodeDialogOpen });
  const removeScan = useRemoveSalesDispatchBoxScan();
  const createSkipRequest = useCreateDockingScanSkipRequest();
  const createPartialRequest = useCreateDockingPartialScanRequest();

  const isReadOnly = entry ? SCAN_CLOSED_STATUSES.includes(entry.status) : false;
  const canEditDocking = hasAnyPermission([
    GATE_PERMISSIONS.SALES_DISPATCH.CREATE,
    GATE_PERMISSIONS.SALES_DISPATCH.EDIT,
  ]);
  // Scanning + background sync run only when this entry is editable.
  const canScanNow = Boolean(entry) && !isReadOnly && canEditDocking;

  // Background sync: refetch server truth after a successful batch flush so the
  // Saved Boxes table and per-item progress reconcile with what was confirmed.
  const onServerChanged = useCallback(() => {
    void refetchScans();
    void refetchEntry();
  }, [refetchScans, refetchEntry]);

  // The two-lane scan engine: instant local accept + durable queue + 1.5s sync.
  const {
    acceptScan,
    acceptedCount,
    pendingCount,
    failedCount,
    queue,
    isSyncing,
    isOffline,
    flushNow,
    retryQueued,
    removeQueued,
  } = useBoxScanSync({
    dispatchId: entry?.id,
    serverScans: scans,
    enabled: canScanNow,
    onServerChanged,
  });
  // In review mode we deliberately stay on the page to walk a closed entry.
  const closedScanRedirectPath = isReview ? '' : getClosedScanRedirectPath(entry);
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
  const isSaving = removeScan.isPending;

  const expectedBoxes = getExpectedDispatchBoxes(entry);
  // Counts are driven by the instant in-memory tally (server-confirmed + locally
  // queued), so progress and the partial/skip gates react the moment a box is
  // scanned — long before the background sync confirms it.
  const isPartialScan = acceptedCount > 0 && expectedBoxes > 0 && acceptedCount < expectedBoxes;
  const scannedQuantity = useMemo(
    () => scans.reduce((total, scan) => total + parsePositiveNumber(scan.quantity), 0),
    [scans],
  );
  const itemScanSummary = useMemo(() => buildItemScanSummary(entry, scans), [entry, scans]);
  const progressPercent =
    expectedBoxes > 0 ? Math.min(100, Math.round((acceptedCount / expectedBoxes) * 100)) : 0;

  useEffect(() => {
    if (!closedScanRedirectPath || !entry) return;
    toast.info(getScanClosedMessage(entry.status));
    navigate(closedScanRedirectPath, { replace: true });
  }, [closedScanRedirectPath, entry, navigate]);

  // Auto-focus the barcode field once the entry is ready and no dialog is open, so
  // the operator can start scanning immediately without tapping the field.
  const isAnyDialogOpen = isSkipDialogOpen || isPartialDialogOpen || isBarcodeDialogOpen;
  useEffect(() => {
    if (!canScanNow || isAnyDialogOpen) return;
    manualInputRef.current?.focus();
  }, [canScanNow, isAnyDialogOpen]);

  const focusScanInput = useCallback(() => {
    // PDA wedge scanners type into whatever is focused, so keep the field hot.
    requestAnimationFrame(() => manualInputRef.current?.focus());
  }, []);

  // The scan hot path. Synchronous and non-blocking: it validates in memory
  // (dedupe), persists locally (fire-and-forget), beeps, and returns. No `await`,
  // no API call, no DB read — so it stays in single-digit milliseconds whether
  // it is box 4 or box 400. The background loop pushes the boxes to the server.
  const handleScan = useCallback(
    (rawBarcode: string, source: ScanSource) => {
      if (!entry) {
        setError('Docking details not found.');
        return;
      }
      if (isReadOnly || !canEditDocking) {
        setError('Box scans cannot be changed for this Docking entry.');
        return;
      }

      const outcome = acceptScan(rawBarcode);
      if (outcome === 'empty') {
        if (source === 'manual') setError('Enter or scan a box barcode.');
        return;
      }

      setError('');
      setManualBarcode('');
      if (outcome === 'accepted') {
        scanFeedback('accept');
      } else {
        // Already scanned this box (server-confirmed or still queued locally).
        scanFeedback('duplicate');
        toast.warning('This box is already scanned for this docking entry');
      }
      if (source === 'manual') focusScanInput();
    },
    [acceptScan, canEditDocking, entry, focusScanInput, isReadOnly],
  );

  const handleCameraScan = useCallback(
    (decodedText: string) => {
      handleScan(decodedText, 'camera');
    },
    [handleScan],
  );

  const scanner = useScanner({ onScan: handleCameraScan, debounceMs: 1800 });

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Honeywell wedge scanners terminate a scan with Enter, which submits the form.
    event.preventDefault();
    handleScan(manualBarcode, 'manual');
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Some PDA scanners are configured with a Tab suffix instead of Enter; treat
    // both as "commit this barcode" and never let Tab move focus off the field.
    if (event.key === 'Tab' && manualBarcode.trim()) {
      event.preventDefault();
      handleScan(manualBarcode, 'manual');
    }
  };

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    // Keep the scan field focused between scans, but allow intentional clicks on
    // buttons/links/other fields (and dialogs) to take focus normally.
    if (isReadOnly || !canEditDocking || isSaving) return;
    if (isSkipDialogOpen || isPartialDialogOpen || isBarcodeDialogOpen) return;
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.closest('button, a, input, textarea, select, [role="dialog"]')) return;
    focusScanInput();
  };

  const handleRemoveScan = useCallback(
    async (scan: SalesDispatchBoxScan) => {
      if (!entry || isReadOnly || !canEditDocking) return;
      setError('');
      try {
        await removeScan.mutateAsync({ id: entry.id, scanId: scan.id });
        await refetchScans();
        await refetchEntry();
        toast.success('Box scan removed');
      } catch (removeError) {
        setError(getErrorMessage(removeError, 'Unable to remove this box scan'));
      }
    },
    [canEditDocking, entry, isReadOnly, refetchEntry, refetchScans, removeScan],
  );

  // The single forward action = "Complete load" for this step. It validates from
  // the instant tally, then force-flushes the local queue and refuses to advance
  // until every scanned box is confirmed server-side. Nothing is ever left behind.
  const handleNext = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }
    if (failedCount > 0) {
      setError('Some scanned boxes could not be saved. Retry or remove them before continuing.');
      return;
    }
    if (!isBoxScanOptional) {
      if (acceptedCount === 0 && !isSkipApproved) {
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
    // Force-flush any boxes still queued locally and block until the server has them.
    if (pendingCount > 0 || failedCount > 0) {
      setError('');
      const { pendingRemaining, failedRemaining } = await flushNow();
      if (pendingRemaining > 0) {
        setError(
          'Still syncing scanned boxes. Reconnect to the network to finish, then continue.',
        );
        return;
      }
      if (failedRemaining > 0) {
        setError('Some scanned boxes could not be saved. Retry or remove them before continuing.');
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

      <ItemsToScanCard
        items={itemScanSummary.items}
        unplannedScanCount={itemScanSummary.unplannedScanCount}
        itemSummary={entry.item_summary}
      />

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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ScanLine className="h-5 w-5" />
                  Box Scanning
                </CardTitle>
                <CardDescription>
                  Capture each loaded box against this Docking entry.
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
                <Badge variant={acceptedCount > 0 ? 'success' : 'outline'}>
                  {acceptedCount} scanned
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-md border bg-slate-950">
                  <div
                    id={scanner.elementId}
                    className="aspect-square min-h-[260px] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
                  />
                  {!scanner.isScanning ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white">
                      <Camera className="h-10 w-10 text-white/80" />
                      <span className="text-sm font-medium">Camera scanner is idle</span>
                    </div>
                  ) : (
                    <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-white/80" />
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    variant={scanner.isScanning ? 'outline' : 'default'}
                    onClick={scanner.isScanning ? scanner.stopScanning : scanner.startScanning}
                    disabled={isReadOnly || !canEditDocking || isSaving}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4" />
                    {scanner.isScanning ? 'Stop' : 'Start'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <form className="space-y-3" onSubmit={handleManualSubmit}>
                  <Label htmlFor="sales-dispatch-box-barcode">Box Barcode</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      ref={manualInputRef}
                      id="sales-dispatch-box-barcode"
                      value={manualBarcode}
                      // PDA wedge scanners type into the focused field, so keep it focused.
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      disabled={isReadOnly || !canEditDocking}
                      onChange={(event) => {
                        setManualBarcode(event.target.value);
                        setError('');
                      }}
                      onKeyDown={handleInputKeyDown}
                      onBlur={handleInputBlur}
                      placeholder="Scan or type barcode, then Enter"
                      className="font-mono"
                    />
                    <Button
                      type="submit"
                      disabled={isReadOnly || !canEditDocking || !manualBarcode.trim()}
                    >
                      <PackageCheck className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </form>

                {/* Headline tally — the single number that updates on every scan. */}
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-muted/20 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Boxes scanned</p>
                    <p className="mt-1 text-4xl font-bold tabular-nums leading-none">
                      {formatNumber(acceptedCount)}
                      {expectedBoxes > 0 ? (
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {' '}
                          / {formatNumber(expectedBoxes)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <SyncStatusBadge
                    pendingCount={pendingCount}
                    isSyncing={isSyncing}
                    isOffline={isOffline}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ScanMetric
                    label="Expected Boxes"
                    value={expectedBoxes > 0 ? formatNumber(expectedBoxes) : '-'}
                  />
                  <ScanMetric label="Pending Sync" value={String(pendingCount)} />
                  <ScanMetric label="Saved Boxes" value={String(scans.length)} />
                  <ScanMetric
                    label="Saved Qty"
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
                        width:
                          expectedBoxes > 0
                            ? `${progressPercent}%`
                            : acceptedCount
                              ? '100%'
                              : '0%',
                      }}
                    />
                  </div>
                </div>
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
            <InfoItem label="SAP Invoice" value={entry.sap_doc_num} />
            <InfoItem label="Customer" value={entry.customer_name || entry.to_warehouse} />
            <InfoItem label="Docked At" value={formatTimestamp(entry.docked_at)} />
          </CardContent>
        </Card>
      </section>

      <SyncQueueCard
        queue={queue}
        pendingCount={pendingCount}
        failedCount={failedCount}
        isOffline={isOffline}
        canEdit={!isReadOnly && canEditDocking}
        onRetry={retryQueued}
        onRemove={removeQueued}
      />

      <SavedBoxesCard
        scans={scans}
        canEdit={!isReadOnly && canEditDocking}
        isSaving={isSaving}
        onRemove={handleRemoveScan}
      />

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
            : () => void handleNext()
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

// Memoized: its props derive from `entry`/`scans` (stable across scans), so it
// never reconciles on the per-scan count bump.
const ItemsToScanCard = memo(function ItemsToScanCard({
  items,
  unplannedScanCount,
  itemSummary,
}: {
  items: ItemScanRow[];
  unplannedScanCount: number;
  itemSummary?: string;
}) {
  const openCount = items.filter((item) => !item.isComplete).length;
  const scannedCount = items.reduce((total, item) => total + item.scanCount, 0);

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5" />
              Items to Scan
            </CardTitle>
            <CardDescription>
              {items.length > 0
                ? `${items.length} dispatch line${items.length === 1 ? '' : 's'}`
                : 'No dispatch lines found'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={openCount > 0 ? 'outline' : 'success'}>{openCount} open</Badge>
            <Badge variant={scannedCount > 0 ? 'success' : 'outline'}>{scannedCount} scanned</Badge>
            {unplannedScanCount > 0 ? (
              <Badge className="border-red-200 bg-red-50 text-red-700">
                {unplannedScanCount} outside list
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            {itemSummary || 'No item details available for this invoice.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
                  <th className="p-3 text-left font-medium">Item</th>
                  <th className="w-[150px] p-3 text-right font-medium">Invoice Qty</th>
                  <th className="w-[130px] p-3 text-right font-medium">Boxes</th>
                  <th className="w-[150px] p-3 text-right font-medium">Weight</th>
                  <th className="w-[190px] p-3 text-left font-medium">Scanned</th>
                  <th className="w-[130px] p-3 text-left font-medium">Status</th>
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
                      <div className="mt-1 text-xs text-muted-foreground">
                        Line {item.lineNum + 1}
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                      {formatQuantity(item.expectedQuantity, item.uom)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                      {item.expectedBoxes > 0 ? formatNumber(item.expectedBoxes) : '-'}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                      {item.totalWeight > 0 ? `${formatNumber(item.totalWeight)} kg` : '-'}
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium">
                        {item.scanCount} box{item.scanCount === 1 ? '' : 'es'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.scannedQuantity > 0
                          ? formatQuantity(item.scannedQuantity, item.uom)
                          : '-'}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/** Compact sync indicator: syncing / offline / all-synced. */
function SyncStatusBadge({
  pendingCount,
  isSyncing,
  isOffline,
}: {
  pendingCount: number;
  isSyncing: boolean;
  isOffline: boolean;
}) {
  if (isOffline && pendingCount > 0) {
    return (
      <Badge className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700">
        <WifiOff className="h-3.5 w-3.5" />
        Offline · {pendingCount} queued
      </Badge>
    );
  }
  if (pendingCount > 0 || isSyncing) {
    return (
      <Badge className="gap-1.5 border-sky-200 bg-sky-50 text-sky-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Syncing{pendingCount > 0 ? ` ${pendingCount}` : ''}…
      </Badge>
    );
  }
  return (
    <Badge className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      All synced
    </Badge>
  );
}

/**
 * Boxes the server rejected during background sync (unknown barcode, not a box,
 * wrong status). They are never silently dropped: the operator re-checks the
 * label and retries, or removes the box from the local queue.
 */
/** Cap how many queue rows we render so an offline backlog can't blow up the DOM. */
const MAX_QUEUE_ROWS = 50;

/** Per-box status chip in the sync queue. */
function QueueStatusPill({ status }: { status: QueuedScan['status'] }) {
  if (status === 'syncing') {
    return (
      <Badge className="shrink-0 gap-1 border-sky-200 bg-sky-50 text-sky-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing
      </Badge>
    );
  }
  if (status === 'rejected' || status === 'failed') {
    return (
      <Badge className="shrink-0 gap-1 border-red-200 bg-red-50 text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 gap-1">
      <Clock3 className="h-3 w-3" />
      Queued
    </Badge>
  );
}

function QueueRow({
  item,
  canEdit,
  onRetry,
  onRemove,
}: {
  item: QueuedScan;
  canEdit: boolean;
  onRetry: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const needsAction = item.status === 'rejected' || item.status === 'failed';
  const isSyncing = item.status === 'syncing';
  // Rejected = the server refused the box (has a reason). Failed = it couldn't be
  // synced after the auto-retry budget (a network/server problem).
  const message =
    item.status === 'rejected' && item.reason
      ? `${FAILURE_LABELS[item.reason]}: ${item.detail ?? ''}`
      : item.status === 'failed'
        ? `Couldn't sync after ${MAX_SYNC_ATTEMPTS} attempts. Check the connection, then retry.`
        : '';
  return (
    <div className={cn('flex items-center gap-3 p-3', needsAction && 'bg-red-50/60')}>
      <QueueStatusPill status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-medium">{item.barcode}</p>
        {needsAction && message ? (
          <div className="mt-0.5 flex items-start gap-1.5 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {needsAction ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEdit}
            onClick={() => onRetry(item.key)}
            title="Try saving this box again"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        ) : null}
        {/* A box that's mid-flight can't be cancelled; let the POST resolve first. */}
        {!isSyncing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canEdit}
            onClick={() => onRemove(item.key)}
            title="Remove this box from the queue"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Live sync queue: every scanned box that the server has not yet confirmed.
 * Boxes appear as "Queued", flip to "Syncing" while a batch is in flight, and
 * disappear the moment the server saves them. Rejected boxes stay (pinned to the
 * top) with the reason, so the operator can retry or remove them. The hot path
 * stays cheap because this list only holds unsynced boxes (it drains every ~1.5s)
 * and we render at most {@link MAX_QUEUE_ROWS} rows.
 */
function SyncQueueCard({
  queue,
  pendingCount,
  failedCount,
  isOffline,
  canEdit,
  onRetry,
  onRemove,
}: {
  queue: QueuedScan[];
  pendingCount: number;
  failedCount: number;
  isOffline: boolean;
  canEdit: boolean;
  onRetry: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const hasFailed = failedCount > 0;
  const visible = queue.slice(0, MAX_QUEUE_ROWS);
  const hiddenCount = queue.length - visible.length;

  return (
    <Card className={cn(hasFailed && 'border-red-300')}>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ScanLine className="h-5 w-5" />
              Sync Queue
            </CardTitle>
            <CardDescription>
              {hasFailed
                ? 'Retry or remove the failed boxes below. Saved boxes leave this list automatically.'
                : 'Boxes save to the server in the background and leave this list once confirmed.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 ? (
              <Badge className="gap-1.5 border-sky-200 bg-sky-50 text-sky-700">
                {isOffline ? (
                  <WifiOff className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {pendingCount} {isOffline ? 'waiting' : 'syncing'}
              </Badge>
            ) : null}
            {hasFailed ? (
              <Badge className="gap-1.5 border-red-200 bg-red-50 text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {failedCount} failed
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {queue.length === 0 ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            All scanned boxes are saved. Nothing waiting to sync.
          </div>
        ) : (
          <>
            <div className="divide-y">
              {visible.map((item) => (
                <QueueRow
                  key={item.key}
                  item={item}
                  canEdit={canEdit}
                  onRetry={onRetry}
                  onRemove={onRemove}
                />
              ))}
            </div>
            {hiddenCount > 0 ? (
              <div className="border-t p-3 text-center text-xs text-muted-foreground">
                and {hiddenCount} more box{hiddenCount === 1 ? '' : 'es'} waiting to sync…
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Server-confirmed boxes. Memoized so the (potentially large) table only
 * re-renders when the confirmed-scan list actually changes — never on the
 * per-scan count bump — keeping the scan hot path O(1) at any load size.
 */
const SavedBoxesCard = memo(function SavedBoxesCard({
  scans,
  canEdit,
  isSaving,
  onRemove,
}: {
  scans: SalesDispatchBoxScan[];
  canEdit: boolean;
  isSaving: boolean;
  onRemove: (scan: SalesDispatchBoxScan) => void;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CheckCircle2 className="h-5 w-5" />
          Saved Boxes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {scans.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No boxes saved yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Barcode</th>
                  <th className="p-3 text-left font-medium">Item</th>
                  <th className="p-3 text-left font-medium">Batch</th>
                  <th className="p-3 text-left font-medium">Qty</th>
                  <th className="p-3 text-left font-medium">Warehouse</th>
                  <th className="p-3 text-left font-medium">Status</th>
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
                    <td className="p-3">
                      {[scan.quantity, scan.uom].filter(Boolean).join(' ') || '-'}
                    </td>
                    <td className="p-3">{formatValue(scan.warehouse_code)}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          scan.box_status === 'ACTIVE' &&
                            'border-emerald-200 bg-emerald-50 text-emerald-700',
                        )}
                      >
                        {scan.box_status || 'BOX'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!canEdit || isSaving}
                        onClick={() => onRemove(scan)}
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
        )}
      </CardContent>
    </Card>
  );
});

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

function buildItemScanSummary(
  entry: SalesDispatchGateOut | undefined,
  scans: SalesDispatchBoxScan[],
) {
  const expectedItems = getExpectedItems(entry);
  const scansByItem = scans.reduce((map, scan) => {
    const key = normalizeItemCode(scan.item_code);
    if (!key) return map;
    const current = map.get(key) || { count: 0, quantity: 0 };
    current.count += 1;
    current.quantity += parsePositiveNumber(scan.quantity);
    map.set(key, current);
    return map;
  }, new Map<string, { count: number; quantity: number }>());

  const items = expectedItems.map((item, index) => {
    const itemCode = item.item_code || '';
    const scanStats = scansByItem.get(normalizeItemCode(itemCode)) || { count: 0, quantity: 0 };
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

  const plannedItemCodes = new Set(items.map((item) => normalizeItemCode(item.itemCode)));
  const unplannedScanCount = scans.filter((scan) => {
    const key = normalizeItemCode(scan.item_code);
    return key && !plannedItemCodes.has(key);
  }).length;

  return { items, unplannedScanCount };
}

function getExpectedItems(entry?: SalesDispatchGateOut): SalesDispatchItem[] {
  if (!entry) return [];
  if (entry.items?.length) return entry.items;
  return entry.documents?.flatMap((document) => document.items || []) || [];
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
