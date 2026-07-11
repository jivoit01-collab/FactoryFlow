import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
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

import {
  useApproveWorkPermit,
  useCancelWorkPermit,
  useCloseWorkPermit,
  useCompleteWorkPermit,
  useCreateWorkPermit,
  useDeleteWorkPermit,
  useDeleteWorkPermitAttachment,
  useRenewWorkPermit,
  useStartWorkPermit,
  useSubmitWorkPermit,
  useUploadWorkPermitAttachment,
  useWorkPermit,
  useWorkPermits,
} from '../api';
import { WorkPermitStatusBadge } from '../components';
import {
  getHazardLabel,
  getPermitTypeLabel,
  getPpeLabel,
  getPrecautionLabel,
  HAZARD_OPTIONS,
  PERMIT_TYPE_OPTIONS,
  PPE_OPTIONS,
  PRECAUTION_GROUPS,
} from '../constants/workPermit.constants';
import type {
  WorkPermit,
  WorkPermitFilters,
  WorkPermitStatus,
  WorkPermitType,
} from '../types';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Reusable checklist of coded options rendered as a checkbox grid.
function CheckboxGrid({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
        >
          <Checkbox
            checked={selected.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

interface WorkerDraft {
  name: string;
  role: string;
}

function NewWorkPermitDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createPermit = useCreateWorkPermit();
  const uploadAttachment = useUploadWorkPermitAttachment();

  const [permitTypes, setPermitTypes] = useState<WorkPermitType[]>(['GENERAL']);
  const [validDate, setValidDate] = useState(today());
  const [validTo, setValidTo] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [issuingDept, setIssuingDept] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuerPhone, setIssuerPhone] = useState('');
  const [issuedToName, setIssuedToName] = useState('');
  const [issuedToPhone, setIssuedToPhone] = useState('');
  const [crossRef, setCrossRef] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [hazards, setHazards] = useState<string[]>([]);
  const [controlMeasures, setControlMeasures] = useState('');
  const [electricalIso, setElectricalIso] = useState(false);
  const [electricalDetail, setElectricalDetail] = useState('');
  const [serviceIso, setServiceIso] = useState(false);
  const [serviceDetail, setServiceDetail] = useState('');
  const [processIso, setProcessIso] = useState(false);
  const [processDetail, setProcessDetail] = useState('');
  const [ppe, setPpe] = useState<string[]>([]);
  const [precautions, setPrecautions] = useState<string[]>([]);
  const [workers, setWorkers] = useState<WorkerDraft[]>([{ name: '', role: '' }]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const setWorker = (index: number, patch: Partial<WorkerDraft>) => {
    setWorkers((current) => current.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (permitTypes.length === 0) {
      toast.error('Select at least one permit type.');
      return;
    }
    if (!jobLocation.trim() || !jobDescription.trim()) {
      toast.error('Job location and description are required.');
      return;
    }
    if (validTo && validTo < validDate) {
      toast.error('Valid-to date cannot be before the valid-from date.');
      return;
    }
    setBusy(true);
    try {
      const permit = await createPermit.mutateAsync({
        permit_types: permitTypes,
        valid_date: validDate,
        valid_to: validTo || null,
        time_start: timeStart,
        time_end: timeEnd,
        issuing_dept: issuingDept.trim(),
        issuer_name: issuerName.trim(),
        issuer_phone: issuerPhone.trim(),
        issued_to_name: issuedToName.trim(),
        issued_to_phone: issuedToPhone.trim(),
        cross_ref: crossRef.trim(),
        job_location: jobLocation.trim(),
        job_description: jobDescription.trim(),
        hazards_identified: hazards,
        control_measures: controlMeasures.trim(),
        electrical_isolation_required: electricalIso,
        electrical_isolation_detail: electricalDetail.trim(),
        service_isolation_required: serviceIso,
        service_isolation_detail: serviceDetail.trim(),
        process_isolation_required: processIso,
        process_isolation_detail: processDetail.trim(),
        ppe,
        precautions,
        workers_input: workers
          .filter((w) => w.name.trim())
          .map((w) => ({ name: w.name.trim(), role: w.role.trim() })),
      });
      for (const file of attachments) {
        await uploadAttachment.mutateAsync({ permit: permit.id, file });
      }
      toast.success(`Work permit ${permit.serial_no || ''} created as draft`);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Work Permit</DialogTitle>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Permit type */}
          <section className="space-y-2">
            <Label>Permit type</Label>
            <CheckboxGrid
              options={PERMIT_TYPE_OPTIONS}
              selected={permitTypes}
              onToggle={(value) =>
                setPermitTypes((current) => toggle(current, value) as WorkPermitType[])
              }
            />
          </section>

          {/* Validity */}
          <section className="space-y-2">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="valid_date">Valid from</Label>
                <Input
                  id="valid_date"
                  type="date"
                  value={validDate}
                  onChange={(e) => setValidDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_to">Valid to</Label>
                <Input
                  id="valid_to"
                  type="date"
                  value={validTo}
                  min={validDate}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_start">Daily time start</Label>
                <Input
                  id="time_start"
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_end">Daily time end</Label>
                <Input
                  id="time_end"
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave “Valid to” empty for a single-day permit. For multi-day work, set the end
              date — the permit stays valid through that day and auto-expires at the end time.
            </p>
          </section>

          {/* Parties */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issuing_dept">Issuing department</Label>
              <Input
                id="issuing_dept"
                value={issuingDept}
                onChange={(e) => setIssuingDept(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cross_ref">Cross reference</Label>
              <Input id="cross_ref" value={crossRef} onChange={(e) => setCrossRef(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer_name">Issuer name</Label>
              <Input
                id="issuer_name"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer_phone">Issuer phone</Label>
              <Input
                id="issuer_phone"
                value={issuerPhone}
                onChange={(e) => setIssuerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued_to_name">Issued to (name)</Label>
              <Input
                id="issued_to_name"
                value={issuedToName}
                onChange={(e) => setIssuedToName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued_to_phone">Issued to (phone)</Label>
              <Input
                id="issued_to_phone"
                value={issuedToPhone}
                onChange={(e) => setIssuedToPhone(e.target.value)}
              />
            </div>
          </section>

          {/* Job */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job_location">Job location</Label>
              <Input
                id="job_location"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_description">Job description</Label>
              <Textarea
                id="job_description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>
          </section>

          {/* Hazards */}
          <section className="space-y-2">
            <Label>Hazards identified</Label>
            <CheckboxGrid
              options={HAZARD_OPTIONS}
              selected={hazards}
              onToggle={(value) => setHazards((current) => toggle(current, value))}
            />
          </section>

          <section className="space-y-2">
            <Label htmlFor="control_measures">Control measures / method statement</Label>
            <Textarea
              id="control_measures"
              value={controlMeasures}
              onChange={(e) => setControlMeasures(e.target.value)}
            />
          </section>

          {/* Isolations */}
          <section className="space-y-3">
            <Label>Isolations required</Label>
            {(
              [
                ['Electrical', electricalIso, setElectricalIso, electricalDetail, setElectricalDetail],
                ['Service', serviceIso, setServiceIso, serviceDetail, setServiceDetail],
                ['Process', processIso, setProcessIso, processDetail, setProcessDetail],
              ] as const
            ).map(([label, required, setRequired, detail, setDetail]) => (
              <div key={label} className="rounded-md border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox checked={required} onCheckedChange={(v) => setRequired(v)} />
                  {label} isolation required
                </label>
                {required && (
                  <Input
                    className="mt-2"
                    placeholder="How isolated / certified by"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                )}
              </div>
            ))}
          </section>

          {/* PPE */}
          <section className="space-y-2">
            <Label>PPE to be used</Label>
            <CheckboxGrid
              options={PPE_OPTIONS}
              selected={ppe}
              onToggle={(value) => setPpe((current) => toggle(current, value))}
            />
          </section>

          {/* Precautions */}
          <section className="space-y-3">
            <Label>Precautions checklist</Label>
            {PRECAUTION_GROUPS.map((group) => (
              <div key={group.group} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                <CheckboxGrid
                  options={group.options}
                  selected={precautions}
                  onToggle={(value) => setPrecautions((current) => toggle(current, value))}
                />
              </div>
            ))}
          </section>

          {/* Workers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Employees on the job</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWorkers((current) => [...current, { name: '', role: '' }])}
              >
                <Plus className="h-4 w-4" />
                Add worker
              </Button>
            </div>
            {workers.map((worker, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={worker.name}
                  placeholder="Name"
                  onChange={(e) => setWorker(index, { name: e.target.value })}
                />
                <Input
                  value={worker.role}
                  placeholder="Role (optional)"
                  onChange={(e) => setWorker(index, { role: e.target.value })}
                />
                {workers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setWorkers((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </section>

          {/* Attachments */}
          <section className="space-y-2">
            <Label>Attachments (method statement, drawings)</Label>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
              <Upload className="h-4 w-4" />
              Add files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  if (files.length) setAttachments((current) => [...current, ...files]);
                }}
              />
            </label>
            {attachments.length > 0 && (
              <ul className="space-y-1 text-sm">
                {attachments.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded border px-3 py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() =>
                        setAttachments((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <ClipboardCheck className="h-4 w-4" />
              {busy ? 'Saving…' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BadgeList({ codes, label }: { codes: string[]; label: (code: string) => string }) {
  if (codes.length === 0) return <span className="text-xs text-muted-foreground">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((code) => (
        <Badge key={code} variant="outline">
          {label(code)}
        </Badge>
      ))}
    </div>
  );
}

function WorkPermitDetailDialog({
  permitId,
  canManage,
  canSubmit,
  canApprove,
  canClose,
  onOpenChange,
  onRenewed,
}: {
  permitId: number;
  canManage: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canClose: boolean;
  onOpenChange: (open: boolean) => void;
  onRenewed: (newPermitId: number) => void;
}) {
  const permitQuery = useWorkPermit(permitId);
  const submitPermit = useSubmitWorkPermit();
  const approvePermit = useApproveWorkPermit();
  const startPermit = useStartWorkPermit();
  const renewPermit = useRenewWorkPermit();
  const completePermit = useCompleteWorkPermit();
  const closePermit = useCloseWorkPermit();
  const cancelPermit = useCancelWorkPermit();
  const uploadAttachment = useUploadWorkPermitAttachment();
  const deleteAttachment = useDeleteWorkPermitAttachment();

  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [attachmentTitle, setAttachmentTitle] = useState('');

  const permit = permitQuery.data;

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadAttachment.mutateAsync({ permit: permitId, file, title: attachmentTitle.trim() });
    setAttachmentTitle('');
    toast.success('Attachment added');
  };

  const activeStatuses: WorkPermitStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS'];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{permit ? `Work Permit ${permit.serial_no}` : 'Work Permit'}</DialogTitle>
        </DialogHeader>

        {permitQuery.isLoading || !permit ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading permit…</div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <WorkPermitStatusBadge status={permit.status} />
              <span className="text-muted-foreground">
                {permit.valid_date}
                {permit.valid_to && permit.valid_to !== permit.valid_date && ` → ${permit.valid_to}`}
                {permit.time_start && ` · ${permit.time_start}`}
                {permit.time_end && `–${permit.time_end}`}
              </span>
            </div>

            <BadgeList codes={permit.permit_types} label={getPermitTypeLabel} />

            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Issuing dept: </span>
                {permit.issuing_dept || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Cross ref: </span>
                {permit.cross_ref || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Issuer: </span>
                {permit.issuer_name || '-'} {permit.issuer_phone && `(${permit.issuer_phone})`}
              </div>
              <div>
                <span className="text-muted-foreground">Issued to: </span>
                {permit.issued_to_name || '-'}{' '}
                {permit.issued_to_phone && `(${permit.issued_to_phone})`}
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Location: </span>
                {permit.job_location}
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Description: </span>
                {permit.job_description}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-medium">Hazards</p>
              <BadgeList codes={permit.hazards_identified} label={getHazardLabel} />
            </div>

            {permit.control_measures && (
              <div className="rounded-md border bg-muted/30 p-3">
                <span className="font-medium">Control measures: </span>
                {permit.control_measures}
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-3">
              {(
                [
                  ['Electrical', permit.electrical_isolation_required, permit.electrical_isolation_detail],
                  ['Service', permit.service_isolation_required, permit.service_isolation_detail],
                  ['Process', permit.process_isolation_required, permit.process_isolation_detail],
                ] as const
              ).map(([label, required, detail]) => (
                <div key={label} className="rounded-md border p-2">
                  <p className="font-medium">{label} isolation</p>
                  <p className="text-xs text-muted-foreground">
                    {required ? detail || 'Required' : 'Not required'}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <p className="font-medium">PPE</p>
              <BadgeList codes={permit.ppe} label={getPpeLabel} />
            </div>

            <div className="space-y-1">
              <p className="font-medium">Precautions</p>
              <BadgeList codes={permit.precautions} label={getPrecautionLabel} />
            </div>

            {/* Workers */}
            <div className="space-y-1">
              <p className="font-medium">Employees on the job ({permit.total_workers})</p>
              {permit.workers.length === 0 ? (
                <span className="text-xs text-muted-foreground">None recorded.</span>
              ) : (
                <ul className="divide-y rounded-md border">
                  {permit.workers.map((worker) => (
                    <li key={worker.id} className="flex justify-between px-3 py-2">
                      <span>{worker.name}</span>
                      <span className="text-xs text-muted-foreground">{worker.role || '-'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Approvals */}
            <div className="space-y-1">
              <p className="font-medium">Authorization ({permit.approvals_count})</p>
              {permit.approvals.length === 0 ? (
                <span className="text-xs text-muted-foreground">No sign-offs yet.</span>
              ) : (
                <ul className="divide-y rounded-md border">
                  {permit.approvals.map((approval) => (
                    <li key={approval.id} className="flex justify-between px-3 py-2">
                      <span>
                        {approval.role_display} · {approval.approved_by_name || '-'}
                      </span>
                      <span className="text-xs text-muted-foreground">{approval.approved_at}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <p className="font-medium">Attachments</p>
              {permit.attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attachments.</p>
              ) : (
                <ul className="space-y-1">
                  {permit.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <a
                        href={attachment.file}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {attachment.title || attachment.file.split('/').pop()}
                      </a>
                      {canManage && (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAttachment.mutateAsync(attachment.id);
                            toast.success('Attachment removed');
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={attachmentTitle}
                    onChange={(e) => setAttachmentTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="max-w-xs"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/40">
                    <Upload className="h-4 w-4" />
                    Upload file
                    <input type="file" className="hidden" onChange={handleAttachmentUpload} />
                  </label>
                </div>
              )}
            </div>

            {permit.status === 'EXPIRED' && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                This permit expired
                {permit.expired_at ? ` on ${new Date(permit.expired_at).toLocaleString()}` : ''}
                {' '}before the work was completed. Renew it to continue the job.
              </div>
            )}

            {/* Workflow actions */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="font-medium">Actions</p>

              {/* 1. Maintenance submits the draft to the Fire Department Head */}
              {permit.status === 'DRAFT' && canSubmit && (
                <Button
                  type="button"
                  onClick={async () => {
                    await submitPermit.mutateAsync(permitId);
                    toast.success('Submitted to Fire Department for approval');
                  }}
                  disabled={submitPermit.isPending}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Submit for Approval
                </Button>
              )}

              {/* 2. Fire Department Head approves */}
              {permit.status === 'SUBMITTED' && canApprove && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Approval remarks (optional)</Label>
                    <Textarea
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      await approvePermit.mutateAsync({
                        permitId,
                        payload: { remarks: approvalRemarks.trim() },
                      });
                      setApprovalRemarks('');
                      toast.success('Permit approved');
                    }}
                    disabled={approvePermit.isPending}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Approve Permit
                  </Button>
                </div>
              )}

              {permit.status === 'SUBMITTED' && !canApprove && (
                <p className="text-sm text-muted-foreground">
                  Waiting for Fire Department Head approval.
                </p>
              )}

              {/* 3. Maintenance starts the work */}
              {permit.status === 'APPROVED' && canManage && (
                <Button
                  type="button"
                  onClick={async () => {
                    await startPermit.mutateAsync(permitId);
                    toast.success('Work started');
                  }}
                  disabled={startPermit.isPending}
                >
                  Start Work
                </Button>
              )}

              {/* 4. Maintenance completes the work */}
              {permit.status === 'IN_PROGRESS' && canManage && (
                <Button
                  type="button"
                  onClick={async () => {
                    await completePermit.mutateAsync({
                      permitId,
                      payload: { completion_type: 'VERIFIED' },
                    });
                    toast.success('Work marked completed');
                  }}
                  disabled={completePermit.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </Button>
              )}

              {/* 5. Close */}
              {permit.status === 'COMPLETED' && canClose && (
                <Button
                  type="button"
                  onClick={async () => {
                    await closePermit.mutateAsync(permitId);
                    toast.success('Permit closed');
                  }}
                  disabled={closePermit.isPending}
                >
                  Close Permit
                </Button>
              )}

              {/* Renew an expired/cancelled permit into a fresh draft */}
              {(permit.status === 'EXPIRED' || permit.status === 'CANCELLED') && canManage && (
                <Button
                  type="button"
                  onClick={async () => {
                    const created = await renewPermit.mutateAsync(permitId);
                    toast.success(`Renewed as ${created.serial_no}`);
                    onRenewed(created.id);
                  }}
                  disabled={renewPermit.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Renew Permit
                </Button>
              )}

              {activeStatuses.includes(permit.status) && canManage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await cancelPermit.mutateAsync({ permitId, payload: {} });
                    toast.success('Permit cancelled');
                  }}
                  disabled={cancelPermit.isPending}
                >
                  Cancel Permit
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceWorkPermitsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_WORK_PERMIT);
  const canSubmit = hasPermission(MAINTENANCE_PERMISSIONS.ISSUE_WORK_PERMIT);
  const canApprove = hasPermission(MAINTENANCE_PERMISSIONS.APPROVE_WORK_PERMIT);
  const canClose = hasPermission(MAINTENANCE_PERMISSIONS.CLOSE_WORK_PERMIT);

  const [filters, setFilters] = useState<WorkPermitFilters>({
    search: '',
    status: 'ALL',
    permit_type: 'ALL',
    is_active: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const permitsQuery = useWorkPermits(filters);
  const deletePermit = useDeleteWorkPermit();

  const permits = permitsQuery.data ?? [];
  const open = permits.filter((p) =>
    ['SUBMITTED', 'APPROVED', 'IN_PROGRESS'].includes(p.status),
  ).length;
  const drafts = permits.filter((p) => p.status === 'DRAFT').length;
  const closed = permits.filter((p) => p.status === 'CLOSED').length;

  const handleDelete = async (permit: WorkPermit) => {
    await deletePermit.mutateAsync(permit.id);
    toast.success('Permit deleted');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Work Permits"
        description="Permit-to-work clearance for hazardous maintenance jobs"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void permitsQuery.refetch()}
          disabled={permitsQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canManage}>
          <Plus className="h-4 w-4" />
          New Permit
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Permits" value={permits.length} icon={FileText} />
        <SummaryCard title="Drafts" value={drafts} icon={ClipboardCheck} />
        <SummaryCard title="Open" value={open} icon={ShieldCheck} />
        <SummaryCard title="Closed" value={closed} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search by job, filter by status, type and date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="permit_search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="permit_search"
                  value={filters.search ?? ''}
                  onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permit_filter_status">Status</Label>
              <NativeSelect
                id="permit_filter_status"
                value={filters.status ?? 'ALL'}
                onChange={(e) =>
                  setFilters((c) => ({ ...c, status: e.target.value as WorkPermitStatus | 'ALL' }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                <SelectOption value="DRAFT">Draft</SelectOption>
                <SelectOption value="SUBMITTED">Submitted</SelectOption>
                <SelectOption value="APPROVED">Approved</SelectOption>
                <SelectOption value="IN_PROGRESS">In Progress</SelectOption>
                <SelectOption value="COMPLETED">Completed</SelectOption>
                <SelectOption value="CLOSED">Closed</SelectOption>
                <SelectOption value="CANCELLED">Cancelled</SelectOption>
                <SelectOption value="EXPIRED">Expired</SelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permit_filter_type">Type</Label>
              <NativeSelect
                id="permit_filter_type"
                value={filters.permit_type ?? 'ALL'}
                onChange={(e) =>
                  setFilters((c) => ({
                    ...c,
                    permit_type: e.target.value as WorkPermitType | 'ALL',
                  }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                {PERMIT_TYPE_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Serial</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued To</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {permitsQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading permits…
                </td>
              </tr>
            ) : permits.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <CalendarDays className="mx-auto mb-2 h-5 w-5" />
                  No work permits found.
                </td>
              </tr>
            ) : (
              permits.map((permit) => (
                <tr key={permit.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{permit.serial_no || '-'}</td>
                  <td className="px-4 py-3">
                    {permit.valid_date}
                    {permit.valid_to && permit.valid_to !== permit.valid_date && (
                      <span className="block text-xs text-muted-foreground">
                        to {permit.valid_to}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {permit.permit_types.map((t) => getPermitTypeLabel(t)).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3">{permit.job_location}</td>
                  <td className="px-4 py-3">
                    <WorkPermitStatusBadge status={permit.status} />
                  </td>
                  <td className="px-4 py-3">{permit.issued_to_name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(permit.id)}>
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                      {canManage && permit.status === 'DRAFT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(permit)}
                          disabled={deletePermit.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && <NewWorkPermitDialog open={createOpen} onOpenChange={setCreateOpen} />}
      {detailId !== null && (
        <WorkPermitDetailDialog
          permitId={detailId}
          canManage={canManage}
          canSubmit={canSubmit}
          canApprove={canApprove}
          canClose={canClose}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
          onRenewed={(newPermitId) => setDetailId(newPermitId)}
        />
      )}
    </div>
  );
}
