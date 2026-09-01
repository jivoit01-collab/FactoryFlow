import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  PackagePlus,
  Play,
  RefreshCw,
  Undo2,
  Upload,
  UserCheck,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { resolveFileUrl } from '@/shared/utils/media';

import {
  useApproveMaintenanceWorkOrder,
  useAssignMaintenanceWorkOrder,
  useCloseMaintenanceWorkOrder,
  useCompleteMaintenanceWorkOrder,
  useCompleteVendorVisit,
  useCreateVendorVisit,
  useMaintenanceAssets,
  useMaintenanceOptions,
  useMaintenanceSpares,
  useMaintenanceWorkOrder,
  useRequestWorkOrderSpare,
  useSendBackMaintenanceWorkOrder,
  useSetMaintenanceWorkOrderStatus,
  useSpareRequests,
  useStartMaintenanceWorkOrder,
  useStartVendorVisit,
  useUpdateMaintenanceWorkOrder,
  useUploadWorkOrderPhoto,
  useVendorVisits,
  useWorkOrderLogs,
  useWorkOrderPhotos,
} from '../api';
import {
  WorkOrderApprovalDialog,
  WorkOrderAssignDialog,
  WorkOrderCompleteDialog,
  WorkOrderFormDialog,
  WorkOrderPhotoUploadDialog,
  WorkOrderSendBackDialog,
  WorkOrderStatusBadge,
  WorkOrderStatusDialog,
} from '../components';
import type {
  MaintenanceChoice,
  MaintenanceDecimal,
  MaintenanceSpare,
  MaintenanceVendorVisit,
  MaintenanceVendorVisitPayload,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderApprovalPayload,
  MaintenanceWorkOrderAssignPayload,
  MaintenanceWorkOrderCompletePayload,
  MaintenanceWorkOrderLog,
  MaintenanceWorkOrderPayload,
  MaintenanceWorkOrderPhoto,
  MaintenanceWorkOrderPhotoUploadPayload,
  MaintenanceWorkOrderSendBackPayload,
  MaintenanceWorkOrderStatusPayload,
  SpareRequest,
  WorkImpact,
  WorkOrderPhotoType,
  WorkOrderSpareRequestPayload,
  WorkType,
} from '../types';

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{valueOrDash(value)}</div>
    </div>
  );
}

function choiceLabel<TValue extends string>(
  choices: MaintenanceChoice<TValue>[] | undefined,
  value: TValue,
) {
  return choices?.find((item) => item.value === value)?.label ?? value.replaceAll('_', ' ');
}

function formatMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function fileNameFromUrl(fileUrl: string) {
  const cleanUrl = fileUrl.split('?')[0] ?? fileUrl;
  const fileName = cleanUrl.split('/').pop();
  return fileName ? decodeURIComponent(fileName) : 'Photo';
}

function decimalNumber(value: MaintenanceDecimal | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQty(value: MaintenanceDecimal | null | undefined) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(decimalNumber(value));
}

function formatMoney(value: MaintenanceDecimal | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(decimalNumber(value));
}

function isClosed(workOrder?: MaintenanceWorkOrder | null) {
  return workOrder?.status === 'CLOSED';
}

function canStartStatus(workOrder?: MaintenanceWorkOrder | null) {
  return (
    !!workOrder &&
    ['OPEN', 'ASSIGNED', 'REOPENED', 'WAITING_SPARE', 'WAITING_VENDOR', 'ON_HOLD'].includes(
      workOrder.status,
    )
  );
}

/** The hand-off trail, newest last, so the whole conversation reads in order. */
function WorkOrderLogList({
  logs,
  isLoading,
}: {
  logs: MaintenanceWorkOrderLog[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading history...</div>;
  }
  if (logs.length === 0) {
    return <div className="text-sm text-muted-foreground">Nothing has happened yet.</div>;
  }
  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{log.action_label}</span>
            <span className="text-xs text-muted-foreground">{log.created_at}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {log.created_by_name || 'System'}
            {log.status_label ? ` - ${log.status_label}` : ''}
          </div>
          {log.remarks && <p className="mt-2 whitespace-pre-line text-sm">{log.remarks}</p>}
        </li>
      ))}
    </ol>
  );
}

function canCompleteStatus(workOrder?: MaintenanceWorkOrder | null) {
  return !!workOrder && !['COMPLETED', 'APPROVED', 'CLOSED'].includes(workOrder.status);
}

function WorkOrderPhotoList({
  photos,
  isLoading,
  photoTypes,
}: {
  photos: MaintenanceWorkOrderPhoto[];
  isLoading: boolean;
  photoTypes?: MaintenanceChoice<WorkOrderPhotoType>[];
}) {
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading photos...</div>;
  }
  if (photos.length === 0) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No work photos uploaded yet.</div>;
  }

  return (
    <div className="space-y-2">
      {photos.map((photo) => (
        <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {photo.caption || fileNameFromUrl(photo.photo)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {choiceLabel(photoTypes, photo.photo_type)} - {photo.taken_on}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={resolveFileUrl(photo.photo)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}

function SpareRequestBadge({ status }: { status: SpareRequest['status'] }) {
  const classes: Record<SpareRequest['status'], string> = {
    REQUESTED: 'border-sky-200 bg-sky-50 text-sky-700',
    PARTIALLY_ISSUED: 'border-amber-200 bg-amber-50 text-amber-700',
    ISSUED: 'border-blue-200 bg-blue-50 text-blue-700',
    PARTIALLY_CONSUMED: 'border-violet-200 bg-violet-50 text-violet-700',
    CLOSED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CANCELLED: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return (
    <Badge variant="outline" className={classes[status]}>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}

function WorkOrderSpareRequestDialog({
  open,
  spares,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  spares: MaintenanceSpare[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: WorkOrderSpareRequestPayload) => Promise<void> | void;
}) {
  const [spareId, setSpareId] = useState('');
  const [requestedQty, setRequestedQty] = useState('');
  const [requiredBy, setRequiredBy] = useState('');
  const [purpose, setPurpose] = useState('');

  const selectedSpare = spares.find((spare) => String(spare.id) === spareId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      spare: Number(spareId),
      requested_qty: requestedQty,
      required_by: requiredBy || null,
      purpose: purpose.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Spare</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="work_spare">Spare</Label>
            <NativeSelect
              id="work_spare"
              value={spareId}
              onChange={(event) => setSpareId(event.target.value)}
              required
            >
              <SelectOption value="">Select spare</SelectOption>
              {spares.map((spare) => (
                <SelectOption key={spare.id} value={String(spare.id)}>
                  {spare.part_number} - {spare.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          {selectedSpare && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">
                Stock: {formatQty(selectedSpare.current_stock)} {selectedSpare.uom}
              </div>
              <div className="text-xs text-muted-foreground">
                Reorder {formatQty(selectedSpare.reorder_level)} - {selectedSpare.storage_location || 'No bin'}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work_spare_qty">Quantity</Label>
              <Input
                id="work_spare_qty"
                type="number"
                min="0.001"
                step="0.001"
                value={requestedQty}
                onChange={(event) => setRequestedQty(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_spare_required_by">Required By</Label>
              <Input
                id="work_spare_required_by"
                type="date"
                value={requiredBy}
                onChange={(event) => setRequiredBy(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_spare_purpose">Purpose</Label>
            <Textarea
              id="work_spare_purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || spares.length === 0}>
              <PackagePlus className="h-4 w-4" />
              Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkOrderSpareRequestList({
  requests,
  isLoading,
}: {
  requests: SpareRequest[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading spare requests...</div>;
  }
  if (requests.length === 0) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No spares requested yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Spare</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Requested</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Issued</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Consumed</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                <div className="font-medium">{request.spare_part_number}</div>
                <div className="text-xs text-muted-foreground">{request.spare_name}</div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatQty(request.requested_qty)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatQty(request.issued_qty)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatQty(request.consumed_qty)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMoney(request.total_cost)}</td>
              <td className="px-4 py-3">
                <SpareRequestBadge status={request.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VendorVisitBadge({ status }: { status: MaintenanceVendorVisit['status'] }) {
  const classes: Record<MaintenanceVendorVisit['status'], string> = {
    PLANNED: 'border-sky-200 bg-sky-50 text-sky-700',
    IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700',
    COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CANCELLED: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return (
    <Badge variant="outline" className={classes[status]}>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}

function VendorVisitDialog({
  open,
  workOrder,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  workOrder: MaintenanceWorkOrder;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceVendorVisitPayload) => Promise<void> | void;
}) {
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [personGateEntry, setPersonGateEntry] = useState('');
  const [materialGateEntry, setMaterialGateEntry] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [serviceReport, setServiceReport] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      work_order: workOrder.id,
      asset: workOrder.asset ?? undefined,
      vendor_name: vendorName,
      vendor_code: vendorCode,
      contact_person: contactPerson,
      contact_phone: contactPhone,
      planned_start: plannedStart || null,
      planned_end: plannedEnd || null,
      person_gate_entry: personGateEntry ? Number(personGateEntry) : null,
      material_gate_entry: materialGateEntry ? Number(materialGateEntry) : null,
      service_report_attachment: serviceReport,
      invoice_number: invoiceNumber,
      invoice_attachment: invoiceFile,
      remarks,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan Vendor Visit</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                value={vendorName}
                onChange={(event) => setVendorName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_code">Vendor Code</Label>
              <Input
                id="vendor_code"
                value={vendorCode}
                onChange={(event) => setVendorCode(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_contact_person">Contact Person</Label>
              <Input
                id="vendor_contact_person"
                value={contactPerson}
                onChange={(event) => setContactPerson(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_contact_phone">Contact Phone</Label>
              <Input
                id="vendor_contact_phone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_planned_start">Planned Start</Label>
              <Input
                id="vendor_planned_start"
                type="datetime-local"
                value={plannedStart}
                onChange={(event) => setPlannedStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_planned_end">Planned End</Label>
              <Input
                id="vendor_planned_end"
                type="datetime-local"
                value={plannedEnd}
                onChange={(event) => setPlannedEnd(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_person_gate_entry">Person Gate Entry ID</Label>
              <Input
                id="vendor_person_gate_entry"
                type="number"
                min="1"
                value={personGateEntry}
                onChange={(event) => setPersonGateEntry(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_material_gate_entry">Material Gate Entry ID</Label>
              <Input
                id="vendor_material_gate_entry"
                type="number"
                min="1"
                value={materialGateEntry}
                onChange={(event) => setMaterialGateEntry(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_service_report">Service Report</Label>
              <Input
                id="vendor_service_report"
                type="file"
                onChange={(event) => setServiceReport(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_invoice_file">Invoice Attachment</Label>
              <Input
                id="vendor_invoice_file"
                type="file"
                onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_invoice_number">Invoice Number</Label>
              <Input
                id="vendor_invoice_number"
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor_remarks">Remarks</Label>
            <Textarea
              id="vendor_remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <UserCheck className="h-4 w-4" />
              Save Visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VendorVisitList({
  visits,
  isLoading,
  isUpdating,
  onStart,
  onComplete,
}: {
  visits: MaintenanceVendorVisit[];
  isLoading: boolean;
  isUpdating?: boolean;
  onStart: (visitId: number) => void;
  onComplete: (visitId: number) => void;
}) {
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading vendor visits...</div>;
  }
  if (visits.length === 0) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No vendor visits planned.</div>;
  }

  return (
    <div className="space-y-2">
      {visits.map((visit) => (
        <div key={visit.id} className="rounded-md border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{visit.vendor_name}</div>
                <VendorVisitBadge status={visit.status} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {visit.vendor_code || 'No vendor code'} - {visit.contact_person || 'No contact'} -{' '}
                {visit.planned_start || 'No plan time'}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {visit.person_gate_entry_name && (
                  <Badge variant="secondary">Person: {visit.person_gate_entry_name}</Badge>
                )}
                {visit.material_gate_entry_no && (
                  <Badge variant="secondary">Material: {visit.material_gate_entry_no}</Badge>
                )}
                {visit.invoice_number && <Badge variant="secondary">{visit.invoice_number}</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visit.service_report_attachment && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={resolveFileUrl(visit.service_report_attachment)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Report
                  </a>
                </Button>
              )}
              {visit.invoice_attachment && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={resolveFileUrl(visit.invoice_attachment)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Invoice
                  </a>
                </Button>
              )}
              {visit.status === 'PLANNED' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                  onClick={() => onStart(visit.id)}
                >
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              )}
              {visit.status === 'IN_PROGRESS' && (
                <Button size="sm" disabled={isUpdating} onClick={() => onComplete(visit.id)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MaintenanceWorkOrderDetailPage() {
  const navigate = useNavigate();
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const numericWorkOrderId = workOrderId ? Number(workOrderId) : null;
  const validWorkOrderId =
    numericWorkOrderId !== null && Number.isFinite(numericWorkOrderId) ? numericWorkOrderId : null;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [spareDialogOpen, setSpareDialogOpen] = useState(false);
  const [vendorVisitDialogOpen, setVendorVisitDialogOpen] = useState(false);

  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_WORK_ORDER);
  const canEdit = canManage || hasPermission(MAINTENANCE_PERMISSIONS.EDIT_MAINTENANCE_WORK_ORDER);
  const canAssign = canManage || hasPermission(MAINTENANCE_PERMISSIONS.ASSIGN_WORK_ORDER);
  const canStart = canManage || hasPermission(MAINTENANCE_PERMISSIONS.START_WORK_ORDER);
  const canComplete = canManage || hasPermission(MAINTENANCE_PERMISSIONS.COMPLETE_WORK_ORDER);
  const canClose = canManage || hasPermission(MAINTENANCE_PERMISSIONS.CLOSE_WORK_ORDER);
  const canUploadPhoto =
    canManage || hasPermission(MAINTENANCE_PERMISSIONS.CREATE_WORK_ORDER_PHOTO);
  const canRequestSpare =
    canManage ||
    hasPermission(MAINTENANCE_PERMISSIONS.REQUEST_SPARE) ||
    hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_SPARE);
  const canManageVendor = canManage || hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_VENDOR);

  const workOrderQuery = useMaintenanceWorkOrder(validWorkOrderId);
  const workOrder = workOrderQuery.data;
  const photosQuery = useWorkOrderPhotos(validWorkOrderId);
  const logsQuery = useWorkOrderLogs(validWorkOrderId);
  const optionsQuery = useMaintenanceOptions();
  const assetsQuery = useMaintenanceAssets({ is_active: true });
  const sparesQuery = useMaintenanceSpares(
    workOrder?.asset ? { compatible_asset: workOrder.asset, is_active: true } : { is_active: true },
    !!workOrder,
  );
  const spareRequestsQuery = useSpareRequests(
    validWorkOrderId ? { work_order: validWorkOrderId, is_active: true } : undefined,
    validWorkOrderId !== null,
  );
  const vendorVisitsQuery = useVendorVisits(
    validWorkOrderId ? { work_order: validWorkOrderId, is_active: true } : undefined,
    validWorkOrderId !== null,
  );
  const updateWorkOrder = useUpdateMaintenanceWorkOrder();
  const assignWorkOrder = useAssignMaintenanceWorkOrder();
  const startWorkOrder = useStartMaintenanceWorkOrder();
  const completeWorkOrder = useCompleteMaintenanceWorkOrder();
  const approveWorkOrder = useApproveMaintenanceWorkOrder();
  const closeWorkOrder = useCloseMaintenanceWorkOrder();
  const sendBackWorkOrder = useSendBackMaintenanceWorkOrder();
  const setWorkOrderStatus = useSetMaintenanceWorkOrderStatus();
  const uploadPhoto = useUploadWorkOrderPhoto();
  const requestSpare = useRequestWorkOrderSpare();
  const createVendorVisit = useCreateVendorVisit();
  const startVendorVisit = useStartVendorVisit();
  const completeVendorVisit = useCompleteVendorVisit();

  const photos = photosQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  // Verification belongs to whoever raised the job; a maintenance head can
  // stand in. The backend decides and says so on the work order.
  const canVerify = !!workOrder?.can_verify;
  const spareRequests = spareRequestsQuery.data ?? [];
  const vendorVisits = vendorVisitsQuery.data ?? [];

  const handleRefresh = () => {
    void workOrderQuery.refetch();
    void photosQuery.refetch();
    void logsQuery.refetch();
    void sparesQuery.refetch();
    void spareRequestsQuery.refetch();
    void vendorVisitsQuery.refetch();
  };

  const handleEdit = async (payload: MaintenanceWorkOrderPayload) => {
    if (!workOrder) return;
    await updateWorkOrder.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Work order updated');
    setEditDialogOpen(false);
  };

  const handleAssign = async (payload: MaintenanceWorkOrderAssignPayload) => {
    if (!workOrder) return;
    await assignWorkOrder.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Work order assigned');
    setAssignDialogOpen(false);
  };

  const handleStart = async () => {
    if (!workOrder) return;
    await startWorkOrder.mutateAsync(workOrder.id);
    toast.success('Work order started');
  };

  const handleComplete = async (payload: MaintenanceWorkOrderCompletePayload) => {
    if (!workOrder) return;
    await completeWorkOrder.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Work order completed');
    setCompleteDialogOpen(false);
  };

  const handleApprove = async (payload: MaintenanceWorkOrderApprovalPayload) => {
    if (!workOrder) return;
    await approveWorkOrder.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Closure approved');
    setApprovalDialogOpen(false);
  };

  const handleSendBack = async (payload: MaintenanceWorkOrderSendBackPayload) => {
    if (!workOrder) return;
    await sendBackWorkOrder.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Sent back for rework');
    setSendBackDialogOpen(false);
  };

  const handleClose = async () => {
    if (!workOrder || !window.confirm(`Close ${workOrder.work_order_no}?`)) return;
    await closeWorkOrder.mutateAsync(workOrder.id);
    toast.success('Work order closed');
  };

  const handleStatusUpdate = async (payload: MaintenanceWorkOrderStatusPayload) => {
    if (!workOrder) return;
    await setWorkOrderStatus.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Work status updated');
    setStatusDialogOpen(false);
  };

  const handlePhotoUpload = async (payload: MaintenanceWorkOrderPhotoUploadPayload) => {
    await uploadPhoto.mutateAsync(payload);
    toast.success('Work photo uploaded');
    setPhotoDialogOpen(false);
  };

  const handleSpareRequest = async (payload: WorkOrderSpareRequestPayload) => {
    if (!workOrder) return;
    await requestSpare.mutateAsync({ workOrderId: workOrder.id, payload });
    toast.success('Spare requested');
    setSpareDialogOpen(false);
  };

  const handleVendorVisitCreate = async (payload: MaintenanceVendorVisitPayload) => {
    await createVendorVisit.mutateAsync(payload);
    toast.success('Vendor visit saved');
    setVendorVisitDialogOpen(false);
  };

  const handleVendorVisitStart = async (visitId: number) => {
    await startVendorVisit.mutateAsync(visitId);
    toast.success('Vendor visit started');
  };

  const handleVendorVisitComplete = async (visitId: number) => {
    await completeVendorVisit.mutateAsync(visitId);
    toast.success('Vendor visit completed');
  };

  if (validWorkOrderId === null) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate('/maintenance/work-orders')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title={workOrder?.work_order_no ?? 'Work Order'}
        description={workOrder?.title ?? 'Maintenance work detail'}
      >
        <Button variant="outline" size="sm" asChild>
          <Link to="/maintenance/work-orders">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={workOrderQuery.isFetching || photosQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditDialogOpen(true)}
          disabled={!workOrder || !canEdit || isClosed(workOrder)}
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAssignDialogOpen(true)}
          disabled={!workOrder || !canAssign || isClosed(workOrder)}
        >
          <UserCheck className="h-4 w-4" />
          Assign
        </Button>
        <Button
          size="sm"
          onClick={() => void handleStart()}
          disabled={!workOrder || !canStart || !canStartStatus(workOrder) || startWorkOrder.isPending}
        >
          <Play className="h-4 w-4" />
          Start
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSpareDialogOpen(true)}
          disabled={!workOrder || !canRequestSpare || isClosed(workOrder)}
        >
          <PackagePlus className="h-4 w-4" />
          Request Spare
        </Button>
        <Button
          size="sm"
          onClick={() => setCompleteDialogOpen(true)}
          disabled={!workOrder || !canComplete || !canCompleteStatus(workOrder)}
        >
          <CheckCircle2 className="h-4 w-4" />
          Complete
        </Button>
      </DashboardHeader>

      {workOrderQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-md border text-sm text-muted-foreground">
          Loading work order...
        </div>
      ) : !workOrder ? (
        <div className="flex h-48 items-center justify-center rounded-md border text-sm text-muted-foreground">
          Work order not found.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Work Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Type"
                  value={choiceLabel<WorkType>(optionsQuery.data?.work_types, workOrder.work_type)}
                />
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <WorkOrderStatusBadge status={workOrder.status} />
                  </div>
                </div>
                <DetailItem label="Priority" value={workOrder.priority} />
                <DetailItem
                  label="Impact"
                  value={choiceLabel<WorkImpact>(optionsQuery.data?.work_impacts, workOrder.impact)}
                />
                <DetailItem
                  label="Asset"
                  value={
                    workOrder.asset
                      ? `${workOrder.asset_code} - ${workOrder.asset_name}`
                      : workOrder.asset_text
                  }
                />
                <DetailItem label="Department" value={workOrder.department_name} />
                <DetailItem label="Area" value={workOrder.area} />
                <DetailItem label="Line" value={workOrder.line} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem label="Reported By" value={workOrder.reported_by_name} />
                <DetailItem label="Assigned To" value={workOrder.assigned_to_display} />
                <DetailItem label="Target Date" value={workOrder.target_date} />
                {workOrder.rework_count > 0 && (
                  <DetailItem label="Sent Back" value={`${workOrder.rework_count} time(s)`} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem label="Response" value={formatMinutes(workOrder.response_time_minutes)} />
                <DetailItem label="Repair" value={formatMinutes(workOrder.repair_time_minutes)} />
                <DetailItem label="Downtime" value={formatMinutes(workOrder.downtime_minutes)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <DetailItem label="Created" value={workOrder.created_at} />
              <DetailItem label="Started" value={workOrder.start_time} />
              <DetailItem label="Completed" value={workOrder.completed_at} />
              <DetailItem label="Approved" value={workOrder.approved_at} />
              <DetailItem label="Closed" value={workOrder.closed_at} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hand-off Trail</CardTitle>
              <CardDescription>
                Every assignment, completion and send-back, with its remarks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkOrderLogList logs={logs} isLoading={logsQuery.isLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Spare Usage</CardTitle>
                <CardDescription>
                  {workOrder.spare_requests_count} requests - {formatQty(workOrder.spare_consumed_qty)} consumed
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setSpareDialogOpen(true)}
                disabled={!canRequestSpare || isClosed(workOrder)}
              >
                <PackagePlus className="h-4 w-4" />
                Request
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailItem label="Requests" value={workOrder.spare_requests_count} />
                <DetailItem label="Consumed Qty" value={formatQty(workOrder.spare_consumed_qty)} />
                <DetailItem label="Consumed Cost" value={formatMoney(workOrder.spare_consumed_cost)} />
              </div>
              <WorkOrderSpareRequestList
                requests={spareRequests}
                isLoading={spareRequestsQuery.isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Vendor Visits</CardTitle>
                <CardDescription>{vendorVisits.length} planned or completed visits</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setVendorVisitDialogOpen(true)}
                disabled={!canManageVendor || isClosed(workOrder)}
              >
                <UserCheck className="h-4 w-4" />
                Plan Visit
              </Button>
            </CardHeader>
            <CardContent>
              <VendorVisitList
                visits={vendorVisits}
                isLoading={vendorVisitsQuery.isLoading}
                isUpdating={startVendorVisit.isPending || completeVendorVisit.isPending}
                onStart={(visitId) => void handleVendorVisitStart(visitId)}
                onComplete={(visitId) => void handleVendorVisitComplete(visitId)}
              />
            </CardContent>
          </Card>

          {workOrder.production_run && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Production Breakdown</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/production/execution/runs/${workOrder.production_run}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Run
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <DetailItem label="Run" value={`#${workOrder.production_run_number}`} />
                <DetailItem label="Date" value={workOrder.production_run_date} />
                <DetailItem label="Line" value={workOrder.production_line_name} />
                <DetailItem label="Product" value={workOrder.production_product} />
                <DetailItem label="Breakdown Reason" value={workOrder.production_breakdown_reason} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Problem and Resolution</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <DetailItem label="Problem" value={workOrder.problem_statement} />
              <DetailItem label="Impact Notes" value={workOrder.impact_notes} />
              <DetailItem label="Technician Remarks" value={workOrder.technician_remarks} />
              <DetailItem label="Completion Remarks" value={workOrder.completion_remarks} />
              <DetailItem label="Root Cause" value={workOrder.root_cause} />
              <DetailItem label="Downtime Reason" value={workOrder.downtime_reason} />
              <DetailItem label="Corrective Action" value={workOrder.corrective_action} />
              <DetailItem label="Preventive Action" value={workOrder.preventive_action} />
              <DetailItem label="Closure Remarks" value={workOrder.closure_remarks} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Work Photos</CardTitle>
                  <CardDescription>{photos.length || workOrder.photos_count} uploaded</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPhotoDialogOpen(true)}
                  disabled={!canUploadPhoto || isClosed(workOrder)}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <WorkOrderPhotoList
                  photos={photos}
                  isLoading={photosQuery.isLoading}
                  photoTypes={optionsQuery.data?.work_photo_types}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verification</CardTitle>
                <CardDescription>
                  {workOrder.status === 'COMPLETED'
                    ? canVerify
                      ? 'Check the work, then approve it or send it back.'
                      : `Waiting for ${workOrder.reported_by_name || 'the raiser'} to check the work.`
                    : workOrder.status === 'REOPENED'
                      ? `Back with ${workOrder.assigned_to_display || 'the assignee'} for rework.`
                      : `${workOrder.reported_by_name || 'The raiser'} checks the work once it is completed.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => setStatusDialogOpen(true)}
                  disabled={!canEdit || isClosed(workOrder)}
                >
                  <Clock className="h-4 w-4" />
                  Waiting / Hold
                </Button>
                <Button
                  onClick={() => setApprovalDialogOpen(true)}
                  disabled={workOrder.status !== 'COMPLETED' || !canVerify}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setSendBackDialogOpen(true)}
                  disabled={
                    !['COMPLETED', 'APPROVED'].includes(workOrder.status) ||
                    !canVerify ||
                    sendBackWorkOrder.isPending
                  }
                >
                  <Undo2 className="h-4 w-4" />
                  Send Back
                </Button>
                <Button
                  onClick={() => void handleClose()}
                  disabled={
                    workOrder.status !== 'APPROVED' ||
                    !(canClose || canVerify) ||
                    closeWorkOrder.isPending
                  }
                >
                  Close Work Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {workOrder && (
        <>
          {editDialogOpen && (
            <WorkOrderFormDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              workOrder={workOrder}
              options={optionsQuery.data}
              assets={assetsQuery.data ?? []}
              isSubmitting={updateWorkOrder.isPending}
              onSubmit={handleEdit}
            />
          )}
          {assignDialogOpen && (
            <WorkOrderAssignDialog
              open={assignDialogOpen}
              onOpenChange={setAssignDialogOpen}
              options={optionsQuery.data}
              currentAssignee={workOrder.assigned_to_display}
              currentTargetDate={workOrder.target_date}
              isSubmitting={assignWorkOrder.isPending}
              onSubmit={handleAssign}
            />
          )}
          {sendBackDialogOpen && (
            <WorkOrderSendBackDialog
              open={sendBackDialogOpen}
              onOpenChange={setSendBackDialogOpen}
              workOrderNo={workOrder.work_order_no}
              isSubmitting={sendBackWorkOrder.isPending}
              onSubmit={handleSendBack}
            />
          )}
          {completeDialogOpen && (
            <WorkOrderCompleteDialog
              open={completeDialogOpen}
              onOpenChange={setCompleteDialogOpen}
              isSubmitting={completeWorkOrder.isPending}
              onSubmit={handleComplete}
            />
          )}
          {approvalDialogOpen && (
            <WorkOrderApprovalDialog
              open={approvalDialogOpen}
              onOpenChange={setApprovalDialogOpen}
              isSubmitting={approveWorkOrder.isPending}
              onSubmit={handleApprove}
            />
          )}
          {statusDialogOpen && (
            <WorkOrderStatusDialog
              open={statusDialogOpen}
              onOpenChange={setStatusDialogOpen}
              currentStatus={workOrder.status}
              isSubmitting={setWorkOrderStatus.isPending}
              onSubmit={handleStatusUpdate}
            />
          )}
          {photoDialogOpen && (
            <WorkOrderPhotoUploadDialog
              open={photoDialogOpen}
              onOpenChange={setPhotoDialogOpen}
              workOrderId={workOrder.id}
              photoTypes={optionsQuery.data?.work_photo_types}
              isSubmitting={uploadPhoto.isPending}
              onSubmit={handlePhotoUpload}
            />
          )}
          {spareDialogOpen && (
            <WorkOrderSpareRequestDialog
              open={spareDialogOpen}
              onOpenChange={setSpareDialogOpen}
              spares={sparesQuery.data ?? []}
              isSubmitting={requestSpare.isPending}
              onSubmit={handleSpareRequest}
            />
          )}
          {vendorVisitDialogOpen && (
            <VendorVisitDialog
              open={vendorVisitDialogOpen}
              onOpenChange={setVendorVisitDialogOpen}
              workOrder={workOrder}
              isSubmitting={createVendorVisit.isPending}
              onSubmit={handleVendorVisitCreate}
            />
          )}
        </>
      )}
    </div>
  );
}
