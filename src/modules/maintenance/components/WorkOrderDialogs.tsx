import { Save, Upload } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
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

import type {
  MaintenanceAsset,
  MaintenanceOptions,
  MaintenancePriority,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderApprovalPayload,
  MaintenanceWorkOrderAssignPayload,
  MaintenanceWorkOrderCompletePayload,
  MaintenanceWorkOrderPayload,
  MaintenanceWorkOrderPhotoUploadPayload,
  MaintenanceWorkOrderStatusPayload,
  WorkImpact,
  WorkOrderPhotoType,
  WorkOrderStatus,
  WorkType,
} from '../types';

interface WorkOrderFormDialogProps {
  open: boolean;
  workOrder?: MaintenanceWorkOrder | null;
  options?: MaintenanceOptions;
  assets?: MaintenanceAsset[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderPayload) => Promise<void> | void;
}

interface WorkOrderAssignDialogProps {
  open: boolean;
  options?: MaintenanceOptions;
  currentAssignee?: number | null;
  currentTargetDate?: string | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderAssignPayload) => Promise<void> | void;
}

interface WorkOrderCompleteDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderCompletePayload) => Promise<void> | void;
}

interface WorkOrderApprovalDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderApprovalPayload) => Promise<void> | void;
}

interface WorkOrderStatusDialogProps {
  open: boolean;
  currentStatus?: WorkOrderStatus;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderStatusPayload) => Promise<void> | void;
}

interface WorkOrderPhotoUploadDialogProps {
  open: boolean;
  workOrderId: number;
  photoTypes?: MaintenanceOptions['work_photo_types'];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderPhotoUploadPayload) => Promise<void> | void;
}

interface WorkOrderFormState {
  work_type: WorkType;
  priority: MaintenancePriority;
  asset: string;
  department: string;
  assigned_to: string;
  target_date: string;
  title: string;
  problem_statement: string;
  impact: WorkImpact;
  impact_notes: string;
  downtime_reason: string;
}

const EMPTY_WORK_ORDER_FORM: WorkOrderFormState = {
  work_type: 'COMPLAINT',
  priority: 'NORMAL',
  asset: '',
  department: '',
  assigned_to: '',
  target_date: '',
  title: '',
  problem_statement: '',
  impact: 'NO_IMPACT',
  impact_notes: '',
  downtime_reason: '',
};

const WAITING_STATUSES: WorkOrderStatus[] = ['WAITING_SPARE', 'WAITING_VENDOR', 'ON_HOLD', 'IN_PROGRESS'];

function formFromWorkOrder(workOrder?: MaintenanceWorkOrder | null): WorkOrderFormState {
  if (!workOrder) return EMPTY_WORK_ORDER_FORM;
  return {
    work_type: workOrder.work_type,
    priority: workOrder.priority,
    asset: workOrder.asset ? String(workOrder.asset) : '',
    department: String(workOrder.department),
    assigned_to: workOrder.assigned_to ? String(workOrder.assigned_to) : '',
    target_date: workOrder.target_date ?? '',
    title: workOrder.title,
    problem_statement: workOrder.problem_statement,
    impact: workOrder.impact,
    impact_notes: workOrder.impact_notes,
    downtime_reason: workOrder.downtime_reason,
  };
}

function nullableDate(value: string) {
  return value || null;
}

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, '');
}

function waitingStatusFrom(currentStatus?: WorkOrderStatus) {
  return currentStatus && WAITING_STATUSES.includes(currentStatus)
    ? currentStatus
    : 'WAITING_SPARE';
}

export function WorkOrderFormDialog({
  open,
  workOrder,
  options,
  assets = [],
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderFormDialogProps) {
  const [form, setForm] = useState<WorkOrderFormState>(() => formFromWorkOrder(workOrder));

  const selectedAsset = useMemo(
    () => assets.find((asset) => String(asset.id) === form.asset),
    [assets, form.asset],
  );

  const setField = <TKey extends keyof WorkOrderFormState>(
    key: TKey,
    value: WorkOrderFormState[TKey],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((item) => String(item.id) === assetId);
    setForm((current) => ({
      ...current,
      asset: assetId,
      department: asset ? String(asset.department) : current.department,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      work_type: form.work_type,
      priority: form.priority,
      asset: form.asset ? Number(form.asset) : null,
      department: form.department ? Number(form.department) : undefined,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      target_date: nullableDate(form.target_date),
      title: form.title.trim(),
      problem_statement: form.problem_statement.trim(),
      impact: form.impact,
      impact_notes: form.impact_notes.trim(),
      downtime_reason: form.downtime_reason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workOrder ? 'Edit Work Order' : 'New Work Order'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="work_order_type">Type</Label>
              <NativeSelect
                id="work_order_type"
                value={form.work_type}
                onChange={(event) => setField('work_type', event.target.value as WorkType)}
              >
                {options?.work_types.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_order_priority">Priority</Label>
              <NativeSelect
                id="work_order_priority"
                value={form.priority}
                onChange={(event) =>
                  setField('priority', event.target.value as MaintenancePriority)
                }
              >
                {options?.priorities.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_order_impact">Impact</Label>
              <NativeSelect
                id="work_order_impact"
                value={form.impact}
                onChange={(event) => setField('impact', event.target.value as WorkImpact)}
              >
                {options?.work_impacts.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="work_order_asset">Asset</Label>
              <NativeSelect
                id="work_order_asset"
                value={form.asset}
                onChange={(event) => handleAssetChange(event.target.value)}
              >
                <SelectOption value="">Select asset (optional)</SelectOption>
                {assets.map((asset) => (
                  <SelectOption key={asset.id} value={String(asset.id)}>
                    {asset.asset_code} - {asset.name}
                  </SelectOption>
                ))}
              </NativeSelect>
              {selectedAsset && (
                <div className="text-xs text-muted-foreground">
                  {selectedAsset.department_name} / {selectedAsset.line || selectedAsset.area || '-'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_order_department">Department</Label>
              <NativeSelect
                id="work_order_department"
                value={form.department}
                onChange={(event) => setField('department', event.target.value)}
              >
                <SelectOption value="">Use asset department</SelectOption>
                {options?.org_departments.map((department) => (
                  <SelectOption key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="work_order_assignee">Assignee</Label>
              <NativeSelect
                id="work_order_assignee"
                value={form.assigned_to}
                onChange={(event) => setField('assigned_to', event.target.value)}
              >
                <SelectOption value="">Unassigned</SelectOption>
                {options?.users.map((user) => (
                  <SelectOption key={user.id} value={String(user.id)}>
                    {user.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_order_target_date">Target Date</Label>
              <Input
                id="work_order_target_date"
                type="date"
                value={form.target_date}
                onChange={(event) => setField('target_date', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="work_order_title">Title</Label>
              <Input
                id="work_order_title"
                value={form.title}
                onChange={(event) => setField('title', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="work_order_problem">Problem</Label>
              <Textarea
                id="work_order_problem"
                value={form.problem_statement}
                onChange={(event) => setField('problem_statement', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="work_order_impact_notes">Impact Notes</Label>
              <Textarea
                id="work_order_impact_notes"
                value={form.impact_notes}
                onChange={(event) => setField('impact_notes', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="work_order_downtime_reason">Downtime Reason</Label>
              <Textarea
                id="work_order_downtime_reason"
                value={form.downtime_reason}
                onChange={(event) => setField('downtime_reason', event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.title.trim() || (!form.asset && !form.department)}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderAssignDialog({
  open,
  options,
  currentAssignee,
  currentTargetDate,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderAssignDialogProps) {
  const [assignedTo, setAssignedTo] = useState(currentAssignee ? String(currentAssignee) : '');
  const [targetDate, setTargetDate] = useState(currentTargetDate ?? '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignedTo) return;
    await onSubmit({
      assigned_to: Number(assignedTo),
      target_date: nullableDate(targetDate),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Work Order</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="assign_user">Assignee</Label>
            <NativeSelect
              id="assign_user"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              required
            >
              <SelectOption value="">Select assignee</SelectOption>
              {options?.users.map((user) => (
                <SelectOption key={user.id} value={String(user.id)}>
                  {user.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign_target_date">Target Date</Label>
            <Input
              id="assign_target_date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !assignedTo}>
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderCompleteDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderCompleteDialogProps) {
  const [technicianRemarks, setTechnicianRemarks] = useState('');
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [downtimeReason, setDowntimeReason] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      technician_remarks: technicianRemarks.trim(),
      completion_remarks: completionRemarks.trim(),
      root_cause: rootCause.trim(),
      corrective_action: correctiveAction.trim(),
      preventive_action: preventiveAction.trim(),
      downtime_reason: downtimeReason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Work Order</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="complete_remarks">Completion Remarks</Label>
            <Textarea
              id="complete_remarks"
              value={completionRemarks}
              onChange={(event) => setCompletionRemarks(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technician_remarks">Technician Remarks</Label>
            <Textarea
              id="technician_remarks"
              value={technicianRemarks}
              onChange={(event) => setTechnicianRemarks(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="root_cause">Root Cause</Label>
              <Textarea
                id="root_cause"
                value={rootCause}
                onChange={(event) => setRootCause(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downtime_reason_complete">Downtime Reason</Label>
              <Textarea
                id="downtime_reason_complete"
                value={downtimeReason}
                onChange={(event) => setDowntimeReason(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="corrective_action">Corrective Action</Label>
              <Textarea
                id="corrective_action"
                value={correctiveAction}
                onChange={(event) => setCorrectiveAction(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preventive_action">Preventive Action</Label>
              <Textarea
                id="preventive_action"
                value={preventiveAction}
                onChange={(event) => setPreventiveAction(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !completionRemarks.trim()}>
              Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderApprovalDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderApprovalDialogProps) {
  const [closureRemarks, setClosureRemarks] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ closure_remarks: closureRemarks.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Closure</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="closure_remarks">Closure Remarks</Label>
            <Textarea
              id="closure_remarks"
              value={closureRemarks}
              onChange={(event) => setClosureRemarks(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Approve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderStatusDialog({
  open,
  currentStatus,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderStatusDialogProps) {
  const [status, setStatus] = useState<WorkOrderStatus>(() => waitingStatusFrom(currentStatus));
  const [remarks, setRemarks] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ status, remarks: remarks.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Work Status</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="work_status_update">Status</Label>
            <NativeSelect
              id="work_status_update"
              value={status}
              onChange={(event) => setStatus(event.target.value as WorkOrderStatus)}
            >
              {WAITING_STATUSES.map((item) => (
                <SelectOption key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_status_remarks">Remarks</Label>
            <Textarea
              id="work_status_remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrderPhotoUploadDialog({
  open,
  workOrderId,
  photoTypes,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderPhotoUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [photoType, setPhotoType] = useState<WorkOrderPhotoType>('BEFORE');
  const [caption, setCaption] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile && !caption) {
      setCaption(titleFromFile(selectedFile));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    await onSubmit({
      work_order: workOrderId,
      file,
      photo_type: photoType,
      caption,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Work Photo</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="work_photo_file">Photo</Label>
            <Input
              id="work_photo_file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_photo_type">Type</Label>
            <NativeSelect
              id="work_photo_type"
              value={photoType}
              onChange={(event) => setPhotoType(event.target.value as WorkOrderPhotoType)}
            >
              {photoTypes?.map((item) => (
                <SelectOption key={item.value} value={item.value}>
                  {item.label}
                </SelectOption>
              ))}
              {(photoTypes?.length ?? 0) === 0 && (
                <>
                  <SelectOption value="BEFORE">Before</SelectOption>
                  <SelectOption value="AFTER">After</SelectOption>
                  <SelectOption value="GENERAL">General</SelectOption>
                </>
              )}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_photo_caption">Caption</Label>
            <Input
              id="work_photo_caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
