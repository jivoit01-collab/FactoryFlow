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
  MaintenanceWorkOrderSendBackPayload,
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
  /** Assignee as it stands, typed or resolved. */
  currentAssignee?: string;
  currentTargetDate?: string | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderAssignPayload) => Promise<void> | void;
}

interface WorkOrderSendBackDialogProps {
  open: boolean;
  workOrderNo?: string;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceWorkOrderSendBackPayload) => Promise<void> | void;
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
  /** Asset code/name — picked from the master list or typed in by hand. */
  asset_input: string;
  department: string;
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
  asset_input: '',
  department: '',
  target_date: '',
  title: '',
  problem_statement: '',
  impact: 'NO_IMPACT',
  impact_notes: '',
  downtime_reason: '',
};

const ASSET_OPTIONS_ID = 'work_order_asset_options';
const USER_OPTIONS_ID = 'work_order_user_options';

function assetLabel(asset: MaintenanceAsset) {
  return `${asset.asset_code} - ${asset.name}`;
}

function findAsset(assets: MaintenanceAsset[], value: string) {
  const needle = value.trim().toLowerCase();
  if (!needle) return undefined;
  return assets.find(
    (asset) =>
      assetLabel(asset).toLowerCase() === needle ||
      asset.asset_code.toLowerCase() === needle ||
      asset.name.toLowerCase() === needle,
  );
}

function assetInputFromWorkOrder(workOrder?: MaintenanceWorkOrder | null) {
  if (!workOrder) return '';
  if (workOrder.asset) return `${workOrder.asset_code} - ${workOrder.asset_name}`;
  return workOrder.asset_text;
}

const WAITING_STATUSES: WorkOrderStatus[] = ['WAITING_SPARE', 'WAITING_VENDOR', 'ON_HOLD', 'IN_PROGRESS'];

function formFromWorkOrder(workOrder?: MaintenanceWorkOrder | null): WorkOrderFormState {
  if (!workOrder) return EMPTY_WORK_ORDER_FORM;
  return {
    work_type: workOrder.work_type,
    priority: workOrder.priority,
    asset_input: assetInputFromWorkOrder(workOrder),
    department: String(workOrder.department),
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
    () => findAsset(assets, form.asset_input),
    [assets, form.asset_input],
  );
  const typedAsset = !selectedAsset && form.asset_input.trim().length > 0;

  const setField = <TKey extends keyof WorkOrderFormState>(
    key: TKey,
    value: WorkOrderFormState[TKey],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAssetChange = (value: string) => {
    const asset = findAsset(assets, value);
    setForm((current) => ({
      ...current,
      asset_input: value,
      department: asset ? String(asset.department) : current.department,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      work_type: form.work_type,
      priority: form.priority,
      asset: selectedAsset ? selectedAsset.id : null,
      asset_text: selectedAsset ? '' : form.asset_input.trim(),
      department: form.department ? Number(form.department) : undefined,
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
            <div className="space-y-2">
              <Label htmlFor="work_order_asset">Asset</Label>
              <Input
                id="work_order_asset"
                value={form.asset_input}
                list={ASSET_OPTIONS_ID}
                placeholder="Pick from list or type"
                autoComplete="off"
                onChange={(event) => handleAssetChange(event.target.value)}
              />
              <datalist id={ASSET_OPTIONS_ID}>
                {assets.map((asset) => (
                  <option key={asset.id} value={assetLabel(asset)} />
                ))}
              </datalist>
              {selectedAsset && (
                <div className="text-xs text-muted-foreground">
                  {selectedAsset.department_name} / {selectedAsset.line || selectedAsset.area || '-'}
                </div>
              )}
              {typedAsset && (
                <div className="text-xs text-muted-foreground">
                  Not in the asset master — saved as typed, so pick a department.
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
              disabled={isSubmitting || !form.title.trim() || (!selectedAsset && !form.department)}
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
  const [assignedTo, setAssignedTo] = useState(currentAssignee ?? '');
  const [targetDate, setTargetDate] = useState(currentTargetDate ?? '');

  const assignee = assignedTo.trim();
  const knownUser = useMemo(
    () => options?.users.find((user) => user.label.toLowerCase() === assignee.toLowerCase()),
    [assignee, options?.users],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignee) return;
    await onSubmit({
      assigned_to_text: assignee,
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
            <Input
              id="assign_user"
              value={assignedTo}
              list={USER_OPTIONS_ID}
              placeholder="Type a name, or pick from the list"
              autoComplete="off"
              onChange={(event) => setAssignedTo(event.target.value)}
              required
            />
            <datalist id={USER_OPTIONS_ID}>
              {options?.users.map((user) => (
                <option key={user.id} value={user.label} />
              ))}
            </datalist>
            <div className="text-xs text-muted-foreground">
              {knownUser
                ? `${knownUser.label} will be notified.`
                : 'Anyone can be named — a contractor or a helper without a login is fine.'}
            </div>
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
            <Button type="submit" disabled={isSubmitting || !assignee}>
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The raiser checked the job and it is not right yet. Remarks are what the
 * technician works from on the next round, so nothing goes back unexplained.
 */
export function WorkOrderSendBackDialog({
  open,
  workOrderNo,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: WorkOrderSendBackDialogProps) {
  const [remarks, setRemarks] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!remarks.trim()) return;
    await onSubmit({ remarks: remarks.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Back for Rework</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground">
            {workOrderNo ? `${workOrderNo} goes back to the assignee. ` : ''}
            Say what is still wrong.
          </p>
          <div className="space-y-2">
            <Label htmlFor="send_back_remarks">Remarks</Label>
            <Textarea
              id="send_back_remarks"
              value={remarks}
              placeholder="Still leaking after an hour of running."
              onChange={(event) => setRemarks(event.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || !remarks.trim()}>
              Send Back
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
