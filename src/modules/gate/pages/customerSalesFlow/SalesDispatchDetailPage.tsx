import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  FileText,
  Filter,
  PackageCheck,
  Paperclip,
  Printer,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type SalesDispatchBoxScan,
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchItem,
  useCancelSalesDispatch,
  useRejectSalesDispatch,
  useSalesDispatch,
} from '@/modules/gate/api';
import { useArrivalDockings } from '@/modules/gate/api/arrivals/arrivals.queries';
import { GateStatusBadge, StepLoadingSpinner } from '@/modules/gate/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  getExpectedDocumentBoxes,
  getExpectedItemBoxes,
  getExpectedItemsBoxes,
} from './salesDispatchBoxCounts';
import {
  formatDateTime,
  formatDocumentType,
  formatTimestamp,
  formatValue,
  isMultiDockingTruck,
} from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';
import {
  groupItemsByItemCode,
  type ItemScanRow,
  normalizeItemCode,
  summarizeItems,
} from './salesDispatchScanSummary';

interface DetailDocument extends SalesDispatchGateOutDocument {
  key: string;
  items: SalesDispatchItem[];
  // The company (docking) this bill came from — a cross-company truck carries bills
  // from several companies, so each bill is tagged to tell them apart.
  companyName?: string;
}

interface AuditEvent {
  label: string;
  value: string;
  detail?: string;
}

export default function SalesDispatchDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const isGateOutMode = isSalesDispatchOutPath(location.pathname);
  const { hasPermission } = usePermission();
  const { entryId } = useParams();
  const id = Number(entryId || 0) || null;
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const { data: entry, isLoading, error, refetch } = useSalesDispatch(id);
  // One physical truck = one page: a multi-docking truck (multi-company or a
  // same-company split load) pulls in every docking so this page shows all the
  // bills (and scans + photos), not just the one docking that was opened.
  const isMultiCompanyArrival = isMultiDockingTruck(entry);
  const arrivalDockings = useArrivalDockings(entry?.arrival, { enabled: isMultiCompanyArrival });
  const cancelSalesDispatch = useCancelSalesDispatch();
  const rejectSalesDispatch = useRejectSalesDispatch();

  const canCancel = Boolean(
    entry &&
    !['PRINT_COMMITTED', 'DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status) &&
    hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.CANCEL),
  );
  const canReject = Boolean(
    entry &&
    !['DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status) &&
    hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REJECT),
  );
  const canReprintGatepass = Boolean(
    entry &&
    !isGateOutMode &&
    entry.gatepass_no &&
    entry.printed_at &&
    !['CANCELLED', 'REJECTED'].includes(entry.status) &&
    hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS),
  );

  const handleCancel = async () => {
    if (!entry) return;

    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    try {
      await cancelSalesDispatch.mutateAsync({
        id: entry.id,
        data: { reason: trimmedReason },
      });
      await refetch();
      setCancelReason('');
      setCancelError('');
      setIsCancelDialogOpen(false);
      toast.success('Docking entry cancelled');
    } catch (cancelErrorValue) {
      setCancelError(getErrorMessage(cancelErrorValue, 'Failed to cancel Docking entry'));
    }
  };

  const handleReject = async () => {
    if (!entry) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectError('Please enter a rejection reason');
      return;
    }

    try {
      await rejectSalesDispatch.mutateAsync({
        id: entry.id,
        data: { reason: trimmedReason },
      });
      await refetch();
      setRejectReason('');
      setRejectError('');
      setIsRejectDialogOpen(false);
      toast.success('Docking entry rejected');
    } catch (rejectErrorValue) {
      setRejectError(getErrorMessage(rejectErrorValue, 'Failed to reject Docking entry'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(routes.dashboard)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState
          text={
            error ? getErrorMessage(error, 'Docking entry not found') : 'Docking entry not found'
          }
        />
      </div>
    );
  }

  // The truck's dockings (all companies) when multi-company, else just this one.
  const truckDockings =
    isMultiCompanyArrival && arrivalDockings.dockings.length ? arrivalDockings.dockings : [entry];
  const detailDocuments = truckDockings.flatMap((docking) => getDetailDocuments(docking));
  // Merge scans + attachments across the truck so Scanned Boxes + Attachments show
  // the whole load, not just the opened docking. (Overview/Audit keep this docking.)
  const loadEntry =
    truckDockings.length > 1
      ? {
          ...entry,
          box_scans: truckDockings.flatMap((docking) => docking.box_scans ?? []),
          attachments: truckDockings.flatMap((docking) => docking.attachments ?? []),
        }
      : entry;
  // Box-scan progress is a whole-load figure: expected = every bill on the truck (all
  // dockings), scanned = the merged scans. Using the opened docking alone would ignore a
  // cross-company sibling bill's boxes (e.g. show 0/3 for a load that's really 0/38).
  const loadScannedBoxes = loadEntry.box_scans?.length ?? 0;
  const loadExpectedBoxes = getExpectedLoadBoxes(detailDocuments);
  // Only flag companies when the truck actually carries bills from more than one.
  const showCompany =
    new Set(detailDocuments.map((doc) => doc.companyName).filter(Boolean)).size > 1;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(routes.dashboard)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entry_no}</h2>
            <p className="text-muted-foreground">
              {isGateOutMode ? 'Invoice dispatch gate-out entry' : 'Docking gate-out entry'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(getPrimaryActionPath(entry, isGateOutMode, routes))}
          >
            {getPrimaryActionLabel(entry, isGateOutMode)}
          </Button>
          {canReprintGatepass && entry && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(routes.reprint(entry.id))}
            >
              <Printer className="mr-2 h-4 w-4" />
              Reprint Gatepass
            </Button>
          )}
          {canCancel && !isGateOutMode && (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setCancelError('');
                setIsCancelDialogOpen(true);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Entry
            </Button>
          )}
          {canReject && (
            <Button
              variant="destructive"
              onClick={() => {
                setRejectError('');
                setIsRejectDialogOpen(true);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Entry
            </Button>
          )}
        </div>
      </div>

      <DockingOverviewCard
        entry={entry}
        scanScanned={loadScannedBoxes}
        scanExpected={loadExpectedBoxes}
      />

      <DocumentsCard
        documents={detailDocuments}
        entry={loadEntry}
        itemSummary={entry.item_summary}
        showCompany={showCompany}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadEntry.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments uploaded</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {loadEntry.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={resolveFileUrl(attachment.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="font-medium">{attachment.original_filename || 'Attachment'}</div>
                  <div className="text-xs text-muted-foreground">{attachment.attachment_type}</div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AuditTrailCard entry={entry} />

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Docking Entry</DialogTitle>
            <DialogDescription>
              This cancels the Docking entry and releases the SAP document for a fresh entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sales-dispatch-cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="sales-dispatch-cancel-reason"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError('');
              }}
              placeholder="Why is this Docking entry being cancelled?"
            />
            {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Keep Entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelSalesDispatch.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {cancelSalesDispatch.isPending ? 'Cancelling...' : 'Cancel Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Docking Entry</DialogTitle>
            <DialogDescription>
              This marks the Docking entry as rejected and keeps the reason in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sales-dispatch-reject-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="sales-dispatch-reject-reason"
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
                setRejectError('');
              }}
              placeholder="Why is this Docking entry being rejected?"
            />
            {rejectError && <p className="text-sm text-destructive">{rejectError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Keep Entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectSalesDispatch.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {rejectSalesDispatch.isPending ? 'Rejecting...' : 'Reject Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DockingOverviewCard({
  entry,
  scanScanned,
  scanExpected,
}: {
  entry: SalesDispatchGateOut;
  scanScanned: number;
  scanExpected: number;
}) {
  const showGatepass = hasDisplayValue(entry.gatepass_no);
  const showActualGateOut = entry.status === 'DISPATCHED';
  const showRemarks = hasDisplayValue(entry.remarks);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Docking Overview
        </CardTitle>
        <GateStatusBadge status={entry.status} />
      </CardHeader>
      <CardContent className="grid gap-6 text-sm lg:grid-cols-2">
        <InfoGroup title="Vehicle & Driver">
          <InfoItem label="Vehicle" value={entry.vehicle_no} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="Driver Mobile" value={entry.driver_mobile_no} />
          <InfoItem label="Transporter" value={entry.transporter_name} />
          <InfoItem label="Bilty / LR" value={entry.bilty_no} />
        </InfoGroup>

        <InfoGroup title="Docking">
          <InfoItem label="Vehicle Entry" value={entry.vehicle_entry_no} />
          <InfoItem label="Docked At" value={formatTimestamp(entry.docked_at)} />
          <ScanProgressField
            label="Box Scan Progress"
            scanned={scanScanned}
            expected={scanExpected}
          />
          <InfoItem label="Invoice Weight" value={formatInvoiceWeightValue(entry.total_weight)} />
          {hasPositiveWeight(entry.challan_weight) ? (
            <InfoItem
              label="Challan Weight"
              value={`${formatWeightValue(entry.challan_weight)}${
                entry.challan_weight_by_name ? ` (by ${entry.challan_weight_by_name})` : ''
              }`}
            />
          ) : null}
          {hasPositiveWeight(entry.tare_weight) ? (
            <InfoItem label="Tare Weight" value={formatWeightValue(entry.tare_weight)} />
          ) : null}
          {hasPositiveWeight(entry.gross_weight) ? (
            <InfoItem label="Gross Weight" value={formatWeightValue(entry.gross_weight)} />
          ) : null}
          {hasPositiveWeight(entry.net_weight) ? (
            <InfoItem label="Net Weight" value={formatWeightValue(entry.net_weight)} />
          ) : null}
          {hasDisplayValue(entry.security_name) ? (
            <InfoItem label="Security" value={entry.security_name} />
          ) : null}
          {showGatepass ? <InfoItem label="Gatepass No." value={entry.gatepass_no} /> : null}
          {showActualGateOut ? (
            <InfoItem label="Actual Gate Out" value={formatActualGateOut(entry)} />
          ) : null}
          {showRemarks ? <InfoItem label="Remarks" value={entry.remarks} /> : null}
        </InfoGroup>
      </CardContent>
    </Card>
  );
}

interface ScanSheetFilter {
  document: string;
  item: string;
}

// Right-side panel of all scanned boxes for the load, with Bill + Item filters. Opened
// either from the header button (unfiltered) or by clicking an item row (pre-filtered to
// that bill + item). Filtering is display-only — it never changes what was scanned.
function ScannedBoxesSheet({
  entry,
  documents,
  open,
  onOpenChange,
  filter,
  onFilterChange,
}: {
  entry: SalesDispatchGateOut;
  documents: DetailDocument[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: ScanSheetFilter;
  onFilterChange: (filter: ScanSheetFilter) => void;
}) {
  const selectedDoc =
    filter.document !== 'ALL' ? documents.find((doc) => doc.sap_doc_num === filter.document) : null;
  const scopeDocs = selectedDoc ? [selectedDoc] : documents;

  const scans = (entry.box_scans ?? []).filter((scan) => {
    if (filter.document !== 'ALL') {
      const matchesDoc =
        (selectedDoc != null && scan.document === selectedDoc.id) ||
        scan.document_sap_doc_num === filter.document;
      if (!matchesDoc) return false;
    }
    if (
      filter.item !== 'ALL' &&
      normalizeItemCode(scan.item_code) !== normalizeItemCode(filter.item)
    ) {
      return false;
    }
    return true;
  });

  const expected =
    filter.item !== 'ALL'
      ? getExpectedItemsBoxes(
          scopeDocs.flatMap((doc) =>
            doc.items.filter(
              (item) => normalizeItemCode(item.item_code) === normalizeItemCode(filter.item),
            ),
          ),
        )
      : selectedDoc
        ? getExpectedDocumentBoxes(selectedDoc)
        : getExpectedLoadBoxes(documents);

  const billOptions = documents
    .filter((doc) => hasDisplayValue(doc.sap_doc_num))
    .map((doc) => ({
      value: doc.sap_doc_num,
      label: `${doc.sap_doc_num}${doc.customer_name ? ` · ${doc.customer_name}` : ''}`,
    }));
  const itemOptions = buildScanItemOptions(scopeDocs);
  const hasActiveFilter = filter.document !== 'ALL' || filter.item !== 'ALL';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-4 overflow-hidden sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Scanned Boxes
          </SheetTitle>
          <SheetDescription asChild>
            <div>
              <ScanProgressBadge scanned={scans.length} expected={expected} />
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex shrink-0 flex-col gap-3 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={filter.document}
              onValueChange={(value) => onFilterChange({ document: value, item: 'ALL' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All bills" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All bills</SelectItem>
                {billOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter.item}
              onValueChange={(value) => onFilterChange({ ...filter, item: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All items</SelectItem>
                {itemOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilter ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange({ document: 'ALL', item: 'ALL' })}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid shrink-0 gap-3 text-sm sm:grid-cols-2">
          <InfoItem label="Scanned Boxes" value={scans.length} />
          <InfoItem label="Expected Boxes" value={formatCount(expected)} />
          <InfoItem
            label="Total Scanned Quantity"
            value={formatScannedQuantity(scans, entry.uom)}
          />
          <InfoItem label="Last Scan" value={formatTimestamp(scans[0]?.scanned_at || null)} />
        </div>

        {scans.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Barcode
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Item
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                    Quantity
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Pallet
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Scanned At
                  </th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm font-semibold">
                      {formatValue(scan.box_barcode || scan.barcode_raw)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">
                      <span className="font-medium">
                        {formatValue(scan.item_name || scan.item_code)}
                      </span>
                      {scan.batch_number ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Batch: {scan.batch_number}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-sm tabular-nums">
                      {formatQuantityWithUom(scan.quantity, scan.uom)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">
                      {formatValue(scan.pallet_code)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">
                      {formatTimestamp(scan.scanned_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {hasActiveFilter ? 'No boxes match the current filter.' : 'No boxes scanned yet'}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function buildScanItemOptions(docs: DetailDocument[]) {
  const seen = new Map<string, { code: string; name: string }>();
  docs.forEach((doc) =>
    doc.items.forEach((item) => {
      const normalized = normalizeItemCode(item.item_code);
      if (normalized && !seen.has(normalized)) {
        seen.set(normalized, { code: item.item_code || '', name: item.item_name || '' });
      }
    }),
  );
  return Array.from(seen.values()).map((option) => ({
    value: option.code,
    label: `${option.code}${option.name ? ` · ${option.name}` : ''}`,
  }));
}

type ScanTone = 'complete' | 'partial' | 'none' | 'unknown';

const SCAN_TONE_CLASSES: Record<ScanTone, string> = {
  complete: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  none: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  unknown: 'bg-muted text-muted-foreground',
};

function getScanTone(scanned: number, expected: number): ScanTone {
  if (expected <= 0) return scanned > 0 ? 'partial' : 'unknown';
  if (scanned >= expected) return 'complete';
  if (scanned > 0) return 'partial';
  return 'none';
}

// Subtle row tint mirroring the scan tone (green = fully scanned, amber = partial,
// red = nothing scanned yet). Kept faint so the row text stays readable.
const SCAN_ROW_CLASSES: Record<ScanTone, string> = {
  complete: 'bg-green-50/70 dark:bg-green-950/20',
  partial: 'bg-amber-50/70 dark:bg-amber-950/20',
  none: 'bg-red-50/60 dark:bg-red-950/20',
  unknown: '',
};

// Per-item tone is judged on invoiced vs scanned QUANTITY (the barcode signal), matching
// the scan page and backend gate — not on a possibly-underived box count.
function getItemScanTone(row?: ItemScanRow): ScanTone {
  if (!row || row.expectedQuantity <= 0) return row && row.scanCount > 0 ? 'partial' : 'unknown';
  if (row.isComplete) return 'complete';
  return row.scanCount > 0 ? 'partial' : 'none';
}

// Colour-coded scan progress pill used everywhere box scanning is surfaced:
// green = fully scanned, amber = partially scanned, red = nothing scanned yet.
function ScanProgressBadge({
  scanned,
  expected,
  className,
}: {
  scanned: number;
  expected: number;
  className?: string;
}) {
  const tone = getScanTone(scanned, expected);
  const label =
    expected > 0
      ? `${scanned} / ${formatCount(expected)} boxes`
      : scanned > 0
        ? `${scanned} scanned`
        : 'No boxes scanned';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        SCAN_TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ScanProgressField({
  label,
  scanned,
  expected,
}: {
  label: string;
  scanned: number;
  expected: number;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1">
        <ScanProgressBadge scanned={scanned} expected={expected} />
      </div>
    </div>
  );
}

function AuditTrailCard({ entry }: { entry: SalesDispatchGateOut }) {
  const events = buildAuditEvents(entry);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.label} className="border-l-2 pl-4">
              <div className="text-sm font-medium">{event.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{event.value}</div>
              {event.detail ? (
                <div className="mt-1 text-xs text-muted-foreground">{event.detail}</div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{children}</div>
    </div>
  );
}

function DocumentsCard({
  documents,
  entry,
  itemSummary,
  showCompany,
}: {
  documents: DetailDocument[];
  entry: SalesDispatchGateOut;
  itemSummary?: string;
  showCompany: boolean;
}) {
  const scans = entry.box_scans ?? [];
  const [isScanSheetOpen, setIsScanSheetOpen] = useState(false);
  const [scanFilter, setScanFilter] = useState<ScanSheetFilter>({ document: 'ALL', item: 'ALL' });

  const openScanSheet = (filter: ScanSheetFilter) => {
    setScanFilter(filter);
    setIsScanSheetOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          SAP Documents
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{formatDocumentCount(documents)}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openScanSheet({ document: 'ALL', item: 'ALL' })}
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Scanned Boxes
            <ScanProgressBadge
              scanned={scans.length}
              expected={getExpectedLoadBoxes(documents)}
              className="ml-2"
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {itemSummary || 'No SAP documents'}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <DocumentSection
                key={document.key}
                document={document}
                scans={getDocumentScans(scans, document)}
                showCompany={showCompany}
                onOpenItem={(itemCode) =>
                  openScanSheet({ document: document.sap_doc_num, item: itemCode })
                }
              />
            ))}
          </div>
        )}
      </CardContent>

      <ScannedBoxesSheet
        entry={entry}
        documents={documents}
        open={isScanSheetOpen}
        onOpenChange={setIsScanSheetOpen}
        filter={scanFilter}
        onFilterChange={setScanFilter}
      />
    </Card>
  );
}

// Whole-load expected boxes = every bill on the truck (across all dockings). Summing per
// bill (not reading a single docking's stored total) is what makes the count span
// companies on a cross-company truck.
function getExpectedLoadBoxes(documents: DetailDocument[]) {
  return documents.reduce((total, document) => total + getExpectedDocumentBoxes(document), 0);
}

// Attribute a box scan to a bill by its document id, falling back to the SAP doc number
// (the single-document fallback row keys off sap_doc_entry, not the document row id).
function getDocumentScans(scans: SalesDispatchBoxScan[], document: DetailDocument) {
  return scans.filter(
    (scan) =>
      (scan.document != null && scan.document === document.id) ||
      (hasDisplayValue(scan.document_sap_doc_num) &&
        scan.document_sap_doc_num === document.sap_doc_num),
  );
}

// Each SAP document is a collapsible block: header (customer, destination, amount,
// load rollup, e-way) stays visible, line items expand/collapse. Merges what used to
// be the separate "SAP Documents" table and "Items to Load" section.
function DocumentSection({
  document,
  scans,
  showCompany,
  onOpenItem,
}: {
  document: DetailDocument;
  scans: SalesDispatchBoxScan[];
  showCompany: boolean;
  onOpenItem: (itemCode: string) => void;
}) {
  const load = formatDocumentLoad(document);
  const destination = formatValue(formatDocumentDestination(document));
  const expectedBoxes = getExpectedDocumentBoxes(document);
  // Per-item scan status, keyed by item code, computed the same way the barcode scan
  // page does (lines grouped by code, scanned qty vs invoiced qty) so the colours and
  // completion here match the scanning screen exactly.
  const scanStatusByCode = new Map<string, ItemScanRow>(
    summarizeItems(groupItemsByItemCode(document.items), scans).items.map((row) => [
      normalizeItemCode(row.itemCode),
      row,
    ]),
  );

  return (
    <details className="group overflow-hidden rounded-md border">
      <summary className="flex cursor-pointer list-none flex-col gap-3 bg-muted/30 p-3 text-sm sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-2">
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0" />
          <div className="space-y-0.5">
            {showCompany && document.companyName ? (
              <span className="inline-flex rounded-full border bg-background px-2 py-0.5 text-xs font-medium">
                {document.companyName}
              </span>
            ) : null}
            <div className="font-semibold">
              {formatValue(document.sap_doc_num)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {formatDocumentType(document.document_type)}
                {document.sap_doc_date ? ` · ${document.sap_doc_date}` : ''}
              </span>
            </div>
            <div>
              {formatValue(document.customer_name || document.to_warehouse)}
              {hasDisplayValue(document.customer_code) ? (
                <span className="ml-2 text-xs text-muted-foreground">{document.customer_code}</span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">{destination}</div>
            {hasDisplayValue(document.bp_gstin) ? (
              <div className="text-xs text-muted-foreground">GSTIN: {document.bp_gstin}</div>
            ) : null}
          </div>
        </div>
        <div className="ml-6 flex flex-col items-start gap-1 text-xs text-muted-foreground sm:ml-0 sm:items-end">
          <ScanProgressBadge scanned={scans.length} expected={expectedBoxes} />
          {hasDisplayValue(document.sap_doc_total) ? (
            <div className="text-sm font-medium tabular-nums text-foreground">
              {formatValue(document.sap_doc_total)}
            </div>
          ) : null}
          {load !== '-' ? <div>{load}</div> : null}
          {hasDisplayValue(document.eway_bill) ? <div>E-way: {document.eway_bill}</div> : null}
        </div>
      </summary>

      {document.items.length > 0 ? (
        <div className="overflow-x-auto border-t">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Item Code</th>
                <th className="p-3 text-left text-sm font-medium">Item</th>
                <th className="p-3 text-right text-sm font-medium">Quantity</th>
                <th className="p-3 text-left text-sm font-medium">UOM</th>
                <th className="p-3 text-left text-sm font-medium">Warehouse</th>
                <th className="p-3 text-left text-sm font-medium">Metrics</th>
                <th className="p-3 text-left text-sm font-medium">Scan</th>
              </tr>
            </thead>
            <tbody>
              {document.items.map((item, index) => {
                const status = scanStatusByCode.get(normalizeItemCode(item.item_code));
                const tone = getItemScanTone(status);
                return (
                  <tr
                    key={item.id || `${document.key}-${index}`}
                    role="button"
                    tabIndex={0}
                    title="Open barcode scanning for this item"
                    onClick={() => onOpenItem(item.item_code)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenItem(item.item_code);
                      }
                    }}
                    className={cn(
                      'cursor-pointer border-t align-top transition-colors hover:bg-muted/50',
                      SCAN_ROW_CLASSES[tone],
                    )}
                  >
                    <td className="whitespace-nowrap p-3 text-sm font-semibold">
                      {formatValue(item.item_code)}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="font-medium">{formatValue(item.item_name)}</div>
                      {item.base_ref ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Base Ref: {item.base_ref}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                      {formatValue(item.quantity)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-sm">{formatValue(item.uom)}</td>
                    <td className="whitespace-nowrap p-3 text-sm">{formatItemWarehouse(item)}</td>
                    <td className="p-3 text-sm text-muted-foreground">{formatItemMetrics(item)}</td>
                    <td className="whitespace-nowrap p-3 text-sm">
                      <ScanProgressBadge
                        scanned={status?.scanCount ?? 0}
                        expected={status?.expectedBoxes ?? getExpectedItemBoxes(item)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-t p-3 text-sm text-muted-foreground">
          No line items on this document
        </div>
      )}
    </details>
  );
}

function getDetailDocuments(entry: SalesDispatchGateOut): DetailDocument[] {
  if (entry.documents?.length) {
    return entry.documents.map((document) => ({
      ...document,
      key: String(document.id),
      items: getDocumentItems(entry, document),
      companyName: entry.company_name,
    }));
  }

  return [
    {
      id: entry.sap_doc_entry,
      key: `${entry.document_type}:${entry.sap_doc_entry}`,
      companyName: entry.company_name,
      document_type: entry.document_type,
      sap_doc_entry: entry.sap_doc_entry,
      sap_doc_num: entry.sap_doc_num,
      sap_doc_date: entry.sap_doc_date,
      sap_doc_total: entry.sap_doc_total,
      sap_branch_id: entry.sap_branch_id,
      sap_branch_name: entry.sap_branch_name,
      sap_reference: entry.sap_reference,
      sap_comments: entry.sap_comments,
      customer_code: entry.customer_code,
      customer_name: entry.customer_name,
      ship_to_code: entry.ship_to_code,
      ship_to_address: entry.ship_to_address,
      place_of_supply: entry.place_of_supply,
      bp_gstin: entry.bp_gstin,
      eway_bill: entry.eway_bill,
      from_warehouse: entry.from_warehouse,
      to_warehouse: entry.to_warehouse,
      warehouses: entry.warehouses,
      item_summary: entry.item_summary,
      base_refs: entry.base_refs,
      total_quantity: entry.total_quantity,
      total_litres: entry.total_litres,
      total_boxes: entry.total_boxes,
      total_weight: entry.total_weight,
      items: entry.items,
    },
  ];
}

function getDocumentItems(
  entry: SalesDispatchGateOut,
  document: SalesDispatchGateOutDocument,
): SalesDispatchItem[] {
  if (document.items?.length) return document.items;

  const matchedItems = entry.items.filter(
    (item) =>
      (item.document && item.document === document.id) ||
      (item.document_sap_doc_num && item.document_sap_doc_num === document.sap_doc_num),
  );
  if (matchedItems.length) return matchedItems;

  return entry.documents?.length ? [] : entry.items;
}

function formatDocumentCount(documents: DetailDocument[]) {
  if (documents.length === 0) return 'No SAP documents';
  return documents.length === 1 ? '1 SAP document' : `${documents.length} SAP documents`;
}

function formatDocumentLoad(document: DetailDocument) {
  const itemCount = document.items.length
    ? `${document.items.length} ${document.items.length === 1 ? 'item' : 'items'}`
    : '';
  const expectedBoxes = getExpectedDocumentBoxes(document);
  const parts = [
    itemCount,
    document.total_quantity ? `${document.total_quantity} qty` : '',
    expectedBoxes > 0 ? `${formatCount(expectedBoxes)} boxes` : '',
    document.total_litres ? `${document.total_litres} litres` : '',
    document.total_weight ? formatWeightValue(document.total_weight) : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' / ') : '-';
}

function formatScannedQuantity(scans: SalesDispatchBoxScan[], fallbackUom?: string) {
  const quantity = sumScannedQuantity(scans);
  if (!quantity) return '';
  const uom = scans.find((scan) => hasDisplayValue(scan.uom))?.uom || fallbackUom;
  return [quantity, uom].filter(Boolean).join(' ');
}

function formatQuantityWithUom(quantity?: string | number | null, uom?: string | null) {
  if (!hasDisplayValue(quantity)) return '-';
  return [quantity, uom].filter(Boolean).join(' ');
}

function sumScannedQuantity(scans?: SalesDispatchBoxScan[]) {
  if (!scans?.length) return '';
  const total = scans.reduce((sum, scan) => {
    const quantity = Number(scan.quantity);
    return Number.isFinite(quantity) ? sum + quantity : sum;
  }, 0);
  return total > 0 ? total.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '';
}

function formatActualGateOut(entry: SalesDispatchGateOut) {
  if (entry.status !== 'DISPATCHED') return '-';
  return entry.gate_out_date || entry.out_time
    ? formatDateTime(entry.gate_out_date, entry.out_time)
    : formatTimestamp(entry.dispatched_at);
}

function formatCount(value: number) {
  return value > 0
    ? value.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })
    : '';
}

function getPrimaryActionLabel(entry: SalesDispatchGateOut, isGateOutMode: boolean) {
  if (isGateOutMode) {
    return hasCompleteGateOutWeighment(entry) ? 'Open Gate Out' : 'Record Gross Weight';
  }

  if (entry.status === 'DOCKED') return 'Continue Barcode Scan';
  if (entry.status === 'PHOTO_ATTACHED' || entry.status === 'READY_FOR_GATEPASS') {
    return 'Prepare Gatepass';
  }
  if (entry.status === 'GATEPASS_PRINTED') return 'Commit Gatepass Print';
  if (entry.status === 'PRINT_COMMITTED') return 'Dispatch Vehicle';

  // Terminal entries (dispatched / rejected / cancelled): read-only step walk.
  return 'View Steps';
}

function getPrimaryActionPath(
  entry: SalesDispatchGateOut,
  isGateOutMode: boolean,
  routes: ReturnType<typeof getSalesDispatchRoutes>,
) {
  if (isGateOutMode) {
    return hasCompleteGateOutWeighment(entry)
      ? routes.gatepass(entry.vehicle_entry)
      : routes.weighment(entry.vehicle_entry);
  }
  if (entry.status === 'DOCKED') return routes.barcodeScan(entry.vehicle_entry);
  if (entry.status === 'PHOTO_ATTACHED' || entry.status === 'READY_FOR_GATEPASS') {
    return routes.gatepass(entry.vehicle_entry);
  }
  if (entry.status === 'GATEPASS_PRINTED' || entry.status === 'PRINT_COMMITTED') {
    return routes.gatepass(entry.vehicle_entry);
  }
  // Terminal entries: walk the flow read-only (review mode).
  return routes.barcodeScan(entry.vehicle_entry, true);
}

function hasCompleteGateOutWeighment(entry: SalesDispatchGateOut) {
  const gross = toFiniteNumber(entry.gross_weight);
  const tare = toFiniteNumber(entry.tare_weight);
  return gross !== null && gross > 0 && tare !== null && tare >= 0 && gross >= tare;
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasPositiveWeight(value?: string | number | null) {
  const numeric = toFiniteNumber(value);
  return numeric !== null && numeric > 0;
}

function buildAuditEvents(entry: SalesDispatchGateOut): AuditEvent[] {
  const events: AuditEvent[] = [];

  if (hasDisplayValue(entry.docked_at)) {
    events.push({
      label: 'Docked',
      value: formatTimestamp(entry.docked_at),
      detail: entry.dock_incharge ? `Dock incharge: ${entry.dock_incharge}` : undefined,
    });
  }

  if (hasDisplayValue(entry.photo_uploaded_at)) {
    events.push({
      label: 'Truck Photo Uploaded',
      value: formatTimestamp(entry.photo_uploaded_at),
    });
  }

  if (hasDisplayValue(entry.printed_at)) {
    events.push({
      label: 'Gatepass Printed',
      value: formatTimestamp(entry.printed_at),
      detail: entry.gatepass_no ? `Gatepass: ${entry.gatepass_no}` : undefined,
    });
  }

  if (hasDisplayValue(entry.print_committed_at)) {
    events.push({
      label: 'Print Committed',
      value: formatTimestamp(entry.print_committed_at),
    });
  }

  if (entry.status === 'DISPATCHED' && (entry.dispatched_at || entry.gate_out_date)) {
    events.push({
      label: 'Dispatched',
      value: formatActualGateOut(entry),
    });
  }

  if (entry.status === 'CANCELLED') {
    events.push({
      label: 'Cancelled',
      value: formatTimestamp(entry.cancelled_at),
      detail: entry.cancel_reason,
    });
  }

  if (entry.status === 'REJECTED') {
    events.push({
      label: 'Rejected',
      value: formatTimestamp(entry.rejected_at),
      detail: entry.reject_reason,
    });
  }

  if (hasDisplayValue(entry.remarks)) {
    events.push({
      label: 'Remarks',
      value: String(entry.remarks),
    });
  }

  events.push({
    label: 'Last Updated',
    value: formatTimestamp(entry.updated_at),
  });

  return events;
}

function formatDocumentDestination(document: SalesDispatchGateOutDocument) {
  const warehouses = [document.from_warehouse, document.to_warehouse]
    .filter(hasDisplayValue)
    .join(' -> ');
  return document.ship_to_address || document.warehouses || warehouses || document.place_of_supply;
}

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== '' && text !== '-';
}

function formatWeightValue(value?: string | number | null) {
  if (!hasDisplayValue(value)) return '';
  const text = String(value);
  return /\b(kg|mt|ton|tons)\b/i.test(text) ? text : `${text} kg`;
}

function formatInvoiceWeightValue(value?: string | number | null) {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric <= 0) return 'Not on invoice';
  return formatWeightValue(numeric);
}

function formatItemWarehouse(item: SalesDispatchItem) {
  const from = item.from_warehouse;
  const to = item.to_warehouse;
  if (from && to && from !== to) return `${from} -> ${to}`;
  return item.warehouse_code || from || to || '-';
}

function formatItemMetrics(item: SalesDispatchItem) {
  const expectedBoxes = getExpectedItemBoxes(item);
  const metrics = [
    expectedBoxes > 0 ? `${formatCount(expectedBoxes)} boxes` : '',
    item.total_litres ? `${item.total_litres} litres` : '',
    item.total_weight ? formatWeightValue(item.total_weight) : '',
  ].filter(Boolean);

  return metrics.length ? metrics.join(' / ') : '-';
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
