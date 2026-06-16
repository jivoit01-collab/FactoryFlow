import {
  ArrowLeft,
  CalendarClock,
  FileText,
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
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchBoxScan,
  type SalesDispatchItem,
  useCancelSalesDispatch,
  useRejectSalesDispatch,
  useSalesDispatch,
} from '@/modules/gate/api';
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
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  formatDateTime,
  formatDocumentType,
  formatTimestamp,
  formatValue,
} from './salesDispatchFlow.helpers';
import {
  getExpectedDispatchBoxes,
  getExpectedDocumentBoxes,
  getExpectedItemBoxes,
} from './salesDispatchBoxCounts';
import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';

interface DetailDocument extends SalesDispatchGateOutDocument {
  key: string;
  items: SalesDispatchItem[];
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

  const detailDocuments = getDetailDocuments(entry);

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

      <DockingOverviewCard entry={entry} documents={detailDocuments} />

      <DocumentsCard documents={detailDocuments} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Items to Load
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentItemsByDocument documents={detailDocuments} itemSummary={entry.item_summary} />
        </CardContent>
      </Card>

      <BoxScansCard entry={entry} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entry.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments uploaded</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {entry.attachments.map((attachment) => (
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
  documents,
}: {
  entry: SalesDispatchGateOut;
  documents: DetailDocument[];
}) {
  const primaryDocument = documents[0];
  const customer = entry.customer_name || primaryDocument?.customer_name || entry.to_warehouse;
  const destination = primaryDocument
    ? formatDocumentDestination(primaryDocument)
    : entry.ship_to_address || entry.warehouses;
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
      <CardContent className="grid gap-6 text-sm lg:grid-cols-3">
        <InfoGroup title="Vehicle & Driver">
          <InfoItem label="Vehicle" value={entry.vehicle_no} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="Driver Mobile" value={entry.driver_mobile_no} />
          <InfoItem label="Transporter" value={entry.transporter_name} />
          <InfoItem label="Bilty / LR" value={entry.bilty_no} />
        </InfoGroup>

        <InfoGroup title="Document">
          <InfoItem label="SAP Document" value={formatDocumentNumbers(entry)} />
          <InfoItem label="Customer" value={customer} />
          <InfoItem label="Destination" value={destination} />
          <InfoItem label="GSTIN" value={entry.bp_gstin || primaryDocument?.bp_gstin} />
          {hasDisplayValue(entry.eway_bill || primaryDocument?.eway_bill) ? (
            <InfoItem label="E-way Bill" value={entry.eway_bill || primaryDocument?.eway_bill} />
          ) : null}
        </InfoGroup>

        <InfoGroup title="Docking">
          <InfoItem label="Vehicle Entry" value={entry.vehicle_entry_no} />
          <InfoItem label="Docked At" value={formatTimestamp(entry.docked_at)} />
          <InfoItem label="Box Scan Progress" value={formatScanProgress(entry)} />
          <InfoItem label="Invoice Weight" value={formatInvoiceWeightValue(entry.total_weight)} />
          <InfoItem label="Tare Weight" value={formatWeightValue(entry.tare_weight)} />
          {hasDisplayValue(entry.gross_weight) ? (
            <InfoItem label="Gross Weight" value={formatWeightValue(entry.gross_weight)} />
          ) : null}
          {hasDisplayValue(entry.net_weight) ? (
            <InfoItem label="Net Weight" value={formatWeightValue(entry.net_weight)} />
          ) : null}
          <InfoItem label="Security" value={entry.security_name} />
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

function BoxScansCard({ entry }: { entry: SalesDispatchGateOut }) {
  const scans = entry.box_scans ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5" />
          Scanned Boxes
        </CardTitle>
        <div className="text-sm text-muted-foreground">{formatScanProgress(entry)}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Scanned Boxes" value={scans.length} />
          <InfoItem label="Expected Boxes" value={formatCount(getExpectedDispatchBoxes(entry))} />
          <InfoItem label="Total Scanned Quantity" value={formatScannedQuantity(entry)} />
          <InfoItem label="Last Scan" value={formatTimestamp(scans[0]?.scanned_at || null)} />
        </div>

        {scans.length > 0 ? (
          <div className="overflow-hidden rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Barcode</th>
                    <th className="p-3 text-left text-sm font-medium">Item</th>
                    <th className="p-3 text-right text-sm font-medium">Quantity</th>
                    <th className="p-3 text-left text-sm font-medium">Pallet</th>
                    <th className="p-3 text-left text-sm font-medium">Scanned At</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-t align-top">
                      <td className="whitespace-nowrap p-3 text-sm font-semibold">
                        {formatValue(scan.box_barcode || scan.barcode_raw)}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="font-medium">
                          {formatValue(scan.item_name || scan.item_code)}
                        </div>
                        {scan.batch_number ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Batch: {scan.batch_number}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                        {formatQuantityWithUom(scan.quantity, scan.uom)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {formatValue(scan.pallet_code)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {formatTimestamp(scan.scanned_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No boxes scanned yet
          </div>
        )}
      </CardContent>
    </Card>
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

function DocumentsCard({ documents }: { documents: DetailDocument[] }) {
  const showEwayBill = documents.some((document) => hasDisplayValue(document.eway_bill));
  const showAmount = documents.some((document) => hasDisplayValue(document.sap_doc_total));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          SAP Documents
        </CardTitle>
        <div className="text-sm text-muted-foreground">{formatDocumentCount(documents)}</div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-[190px] p-3 text-left text-sm font-medium">Document</th>
                  <th className="w-[260px] p-3 text-left text-sm font-medium">
                    Customer / Destination
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Address / Warehouse</th>
                  {showEwayBill ? (
                    <th className="w-[150px] p-3 text-left text-sm font-medium">E-way Bill</th>
                  ) : null}
                  {showAmount ? (
                    <th className="w-[120px] p-3 text-right text-sm font-medium">Amount</th>
                  ) : null}
                  <th className="w-[210px] p-3 text-left text-sm font-medium">Load</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.key} className="border-t align-top">
                    <td className="p-3 text-sm">
                      <div className="font-semibold">{formatValue(document.sap_doc_num)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDocumentType(document.document_type)}
                        {document.sap_doc_date ? ` - ${document.sap_doc_date}` : ''}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="font-medium">
                        {formatValue(document.customer_name || document.to_warehouse)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatValue(document.customer_code || document.place_of_supply)}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {formatValue(formatDocumentDestination(document))}
                    </td>
                    {showEwayBill ? (
                      <td className="whitespace-nowrap p-3 text-sm">
                        {formatValue(document.eway_bill)}
                      </td>
                    ) : null}
                    {showAmount ? (
                      <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                        {formatValue(document.sap_doc_total)}
                      </td>
                    ) : null}
                    <td className="p-3 text-sm">{formatDocumentLoad(document)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentItemsByDocument({
  documents,
  itemSummary,
}: {
  documents: DetailDocument[];
  itemSummary?: string;
}) {
  const itemGroups = documents.filter((document) => document.items.length > 0);

  if (itemGroups.length === 0) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        {itemSummary || 'No document lines found'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {itemGroups.map((document) => (
        <DocumentItemsTable key={document.key} document={document} />
      ))}
    </div>
  );
}

function DocumentItemsTable({ document }: { document: DetailDocument }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-col gap-1 border-b bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold">
          {formatDocumentType(document.document_type)} {formatValue(document.sap_doc_num)}
        </div>
        <div className="text-muted-foreground">
          {document.customer_name || formatDocumentDestination(document)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item Code</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-right text-sm font-medium">Quantity</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
              <th className="p-3 text-left text-sm font-medium">Warehouse</th>
              <th className="p-3 text-left text-sm font-medium">Metrics</th>
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, index) => (
              <tr key={item.id || `${document.key}-${index}`} className="border-t align-top">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getDetailDocuments(entry: SalesDispatchGateOut): DetailDocument[] {
  if (entry.documents?.length) {
    return entry.documents.map((document) => ({
      ...document,
      key: String(document.id),
      items: getDocumentItems(entry, document),
    }));
  }

  return [
    {
      id: entry.sap_doc_entry,
      key: `${entry.document_type}:${entry.sap_doc_entry}`,
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

function formatDocumentNumbers(entry: SalesDispatchGateOut) {
  const numbers = entry.document_numbers?.length
    ? entry.document_numbers
    : entry.sap_doc_num
      ? [entry.sap_doc_num]
      : [];
  return numbers.join(', ') || '-';
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

function formatScanProgress(entry: SalesDispatchGateOut) {
  const scanned = entry.box_scans?.length ?? 0;
  const expected = getExpectedDispatchBoxes(entry);
  if (expected) return `${scanned} / ${formatCount(expected)} boxes`;
  return scanned > 0 ? `${scanned} scanned` : 'No boxes scanned';
}

function formatScannedQuantity(entry: SalesDispatchGateOut) {
  const quantity = sumScannedQuantity(entry.box_scans);
  if (!quantity) return '';
  const uom = entry.box_scans?.find((scan) => hasDisplayValue(scan.uom))?.uom || entry.uom;
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

  return 'Resume Flow';
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
  return `${routes.newEntry}?entryId=${entry.vehicle_entry}`;
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
