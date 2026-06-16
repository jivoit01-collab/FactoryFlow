import {
  AlertCircle,
  Ban,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  Trash2,
  Truck,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ADMIN_PERMISSIONS, GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type DockingScanSkipRequest,
  useCreateDockingScanSkipRequest,
  useDockingScanSkipRequestByDispatch,
} from '@/modules/admin/api';
import { useScanner } from '@/modules/barcode/hooks/useScanner';
import {
  type SalesDispatchBoxScan,
  type SalesDispatchGateOut,
  type SalesDispatchItem,
  useRemoveSalesDispatchBoxScan,
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

import {
  getExpectedDispatchBoxes,
  getExpectedItemBoxes,
  parsePositiveNumber,
} from './salesDispatchBoxCounts';
import { DOCKING_TOTAL_STEPS, formatTimestamp, formatValue } from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

type ScanSource = 'camera' | 'manual';

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
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState('');
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipError, setSkipError] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: scans = [], isLoading: isScansLoading } = useSalesDispatchBoxScans(entry?.id);
  const { data: skipRequest } = useDockingScanSkipRequestByDispatch(entry?.id);
  const scanBox = useScanSalesDispatchBox();
  const removeScan = useRemoveSalesDispatchBoxScan();
  const createSkipRequest = useCreateDockingScanSkipRequest();

  const isReadOnly = entry ? SCAN_CLOSED_STATUSES.includes(entry.status) : false;
  const closedScanRedirectPath = getClosedScanRedirectPath(entry);
  const canEditDocking = hasAnyPermission([
    GATE_PERMISSIONS.SALES_DISPATCH.CREATE,
    GATE_PERMISSIONS.SALES_DISPATCH.EDIT,
  ]);
  const canRequestScanSkip = hasPermission(ADMIN_PERMISSIONS.DOCKING.REQUEST_SCAN_SKIP);
  // Some companies (e.g. Jivo Beverages) don't scan boxes at the factory at all, so box
  // scanning is optional for them: operators can continue without scanning and without
  // the admin scan-skip approval flow. Driven by the backend per the entry's company.
  const isBoxScanOptional = entry?.gatepass_readiness?.box_scan_optional ?? false;
  const skipStatus = skipRequest?.status ?? null;
  const isSkipApproved = skipStatus === 'APPROVED';
  const isSkipPending = skipStatus === 'PENDING';
  const isSaving = scanBox.isPending || removeScan.isPending;

  const expectedBoxes = getExpectedDispatchBoxes(entry);
  const scannedQuantity = useMemo(
    () => scans.reduce((total, scan) => total + parsePositiveNumber(scan.quantity), 0),
    [scans],
  );
  const itemScanSummary = useMemo(() => buildItemScanSummary(entry, scans), [entry, scans]);
  const progressPercent =
    expectedBoxes > 0 ? Math.min(100, Math.round((scans.length / expectedBoxes) * 100)) : 0;

  useEffect(() => {
    if (!closedScanRedirectPath || !entry) return;
    toast.info(getScanClosedMessage(entry.status));
    navigate(closedScanRedirectPath, { replace: true });
  }, [closedScanRedirectPath, entry, navigate]);

  const processBarcode = useCallback(
    async (rawBarcode: string, source: ScanSource) => {
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

      const alreadyScanned = scans.some(
        (scan) =>
          scan.box_barcode.toLowerCase() === barcode.toLowerCase() ||
          scan.barcode_raw.toLowerCase() === barcode.toLowerCase(),
      );
      if (alreadyScanned) {
        setError('');
        toast.warning('This box is already in the scan list');
        setManualBarcode('');
        return;
      }

      setError('');
      try {
        const savedScan = await scanBox.mutateAsync({
          id: entry.id,
          data: { barcode_raw: barcode },
        });
        setManualBarcode('');
        await refetchEntry();
        if (savedScan.duplicate) {
          toast.warning('This box was already scanned for this docking entry');
        } else {
          toast.success(source === 'camera' ? 'Camera scan added' : 'Box scan added');
        }
        manualInputRef.current?.focus();
      } catch (scanError) {
        setError(getErrorMessage(scanError, 'Unable to save this box scan'));
      }
    },
    [canEditDocking, entry, isReadOnly, refetchEntry, scanBox, scans],
  );

  const handleCameraScan = useCallback(
    (decodedText: string) => {
      void processBarcode(decodedText, 'camera');
    },
    [processBarcode],
  );

  const scanner = useScanner({ onScan: handleCameraScan, debounceMs: 1800 });

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void processBarcode(manualBarcode, 'manual');
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
    if (scans.length === 0 && !isSkipApproved && !isBoxScanOptional) {
      if (isSkipPending) {
        setError(
          'Box scanning skip is awaiting admin approval. You can continue once it is approved.',
        );
      } else {
        setError('Scan at least one box, or request approval to skip scanning.');
      }
      return;
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

      <ItemsToScanCard
        items={itemScanSummary.items}
        unplannedScanCount={itemScanSummary.unplannedScanCount}
        itemSummary={entry.item_summary}
      />

      {isBoxScanOptional ? (
        <ScanOptionalPanel />
      ) : (
        <ScanSkipPanel
          skipRequest={skipRequest}
          canRequest={canRequestScanSkip && !isReadOnly && canEditDocking}
          hasScans={scans.length > 0}
          isSubmitting={createSkipRequest.isPending}
          onRequest={() => {
            setSkipReason('');
            setSkipError('');
            setIsSkipDialogOpen(true);
          }}
        />
      )}

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
              <Badge variant={scans.length > 0 ? 'success' : 'outline'}>
                {scans.length} scanned
              </Badge>
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
                      disabled={isReadOnly || !canEditDocking || isSaving}
                      onChange={(event) => {
                        setManualBarcode(event.target.value);
                        setError('');
                      }}
                      placeholder="Scan or type barcode"
                      className="font-mono"
                    />
                    <Button
                      type="submit"
                      disabled={isReadOnly || !canEditDocking || isSaving || !manualBarcode.trim()}
                    >
                      {scanBox.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PackageCheck className="h-4 w-4" />
                      )}
                      Add
                    </Button>
                  </div>
                </form>

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
                        width:
                          expectedBoxes > 0 ? `${progressPercent}%` : scans.length ? '100%' : '0%',
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

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-5 w-5" />
            Scanned Boxes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scans.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No boxes scanned yet.</div>
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
                          disabled={isReadOnly || !canEditDocking || isSaving}
                          onClick={() => void handleRemoveScan(scan)}
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

      <StepFooter
        onPrevious={() =>
          navigate(`${DOCKING_ROUTES.newEntry}?entryId=${entryId || entry.vehicle_entry}`)
        }
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={handleNext}
        isSaving={isSaving}
        nextLabel="Continue to Attachments"
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
    </div>
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

function ItemsToScanCard({
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
