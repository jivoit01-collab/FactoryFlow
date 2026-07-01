import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ImagePlus,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';
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
  useCreateFireReport,
  useDeleteFireReport,
  useDeleteFireReportAttachment,
  useDeleteFireReportItem,
  useDeleteFireReportPhoto,
  useFireReport,
  useFireReports,
  useMaintenanceAssets,
  useReviewFireReport,
  useUploadFireReportAttachment,
  useUploadFireReportPhoto,
} from '../api';
import type {
  FireEquipmentStatus,
  FireEquipmentType,
  FireReportStatus,
  FireShiftReport,
  FireShiftReportFilters,
  FireShiftType,
} from '../types';

const SHIFT_OPTIONS: Array<{ value: FireShiftType; label: string }> = [
  { value: 'DAY', label: 'Day Shift' },
  { value: 'NIGHT', label: 'Night Shift' },
];

const EQUIPMENT_TYPE_OPTIONS: Array<{ value: FireEquipmentType; label: string }> = [
  { value: 'PUMP', label: 'Pump' },
  { value: 'HYDRANT', label: 'Hydrant' },
  { value: 'EXTINGUISHER', label: 'Extinguisher' },
  { value: 'SPRINKLER', label: 'Sprinkler' },
  { value: 'ALARM_PANEL', label: 'Alarm / Panel' },
  { value: 'HOSE', label: 'Hose / Reel' },
  { value: 'OTHER', label: 'Other' },
];

const EQUIPMENT_STATUS_OPTIONS: Array<{ value: FireEquipmentStatus; label: string }> = [
  { value: 'OK', label: 'OK' },
  { value: 'NOT_OK', label: 'Not Okay' },
  { value: 'NEEDS_ATTENTION', label: 'Needs Attention' },
];

const EQUIPMENT_STATUS_CLASSES: Record<FireEquipmentStatus, string> = {
  OK: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  NOT_OK: 'border-red-200 bg-red-50 text-red-700',
  NEEDS_ATTENTION: 'border-amber-200 bg-amber-50 text-amber-700',
};

const REPORT_STATUS_CLASSES: Record<FireReportStatus, string> = {
  SUBMITTED: 'border-sky-200 bg-sky-50 text-sky-700',
  REVIEWED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface ItemDraft {
  equipment_name: string;
  equipment_type: FireEquipmentType;
  status: FireEquipmentStatus;
  reading: string;
  remarks: string;
  asset: string;
  photos: File[];
}

function emptyDraft(): ItemDraft {
  return {
    equipment_name: '',
    equipment_type: 'PUMP',
    status: 'OK',
    reading: '',
    remarks: '',
    asset: '',
    photos: [],
  };
}

function NewReportDialog({
  open,
  assets,
  onOpenChange,
}: {
  open: boolean;
  assets: Array<{ id: number; asset_code: string; name: string }>;
  onOpenChange: (open: boolean) => void;
}) {
  const createReport = useCreateFireReport();
  const uploadPhoto = useUploadFireReportPhoto();
  const uploadAttachment = useUploadFireReportAttachment();

  const [reportDate, setReportDate] = useState(today());
  const [shift, setShift] = useState<FireShiftType>('DAY');
  const [area, setArea] = useState('');
  const [summary, setSummary] = useState('');
  const [rows, setRows] = useState<ItemDraft[]>([emptyDraft()]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const setRow = (index: number, patch: Partial<ItemDraft>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const filled = rows.filter((row) => row.equipment_name.trim());
    if (filled.length === 0) {
      toast.error('Add at least one equipment line.');
      return;
    }
    setBusy(true);
    try {
      // 1. Create the report with its equipment lines.
      const report = await createReport.mutateAsync({
        report_date: reportDate,
        shift,
        area: area.trim(),
        summary_remarks: summary.trim(),
        items_input: filled.map((row) => ({
          equipment_name: row.equipment_name.trim(),
          equipment_type: row.equipment_type,
          status: row.status,
          reading: row.reading.trim(),
          remarks: row.remarks.trim(),
          asset: row.asset ? Number(row.asset) : null,
        })),
      });
      // 2. Upload each row's queued photos to its freshly created item
      //    (created items come back in the same order as items_input).
      for (let i = 0; i < filled.length; i += 1) {
        const created = report.items[i];
        if (!created) continue;
        for (const file of filled[i].photos) {
          await uploadPhoto.mutateAsync({ item: created.id, file });
        }
      }
      // 3. Upload report-level attachments.
      for (const file of attachments) {
        await uploadAttachment.mutateAsync({ report: report.id, file });
      }
      toast.success('Fire shift report submitted');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Fire Shift Report</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report_date">Date</Label>
              <Input
                id="report_date"
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_shift">Shift</Label>
              <NativeSelect
                id="report_shift"
                value={shift}
                onChange={(event) => setShift(event.target.value as FireShiftType)}
              >
                {SHIFT_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_area">Area / Station</Label>
              <Input
                id="report_area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="e.g. Plant 1 Fire Room"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Equipment checked</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((current) => [...current, emptyDraft()])}
              >
                <Plus className="h-4 w-4" />
                Add equipment
              </Button>
            </div>
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="rounded-md border p-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Equipment name</Label>
                      <Input
                        value={row.equipment_name}
                        onChange={(event) => setRow(index, { equipment_name: event.target.value })}
                        placeholder="e.g. Jockey Pump 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <NativeSelect
                        value={row.equipment_type}
                        onChange={(event) =>
                          setRow(index, { equipment_type: event.target.value as FireEquipmentType })
                        }
                      >
                        {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                          <SelectOption key={option.value} value={option.value}>
                            {option.label}
                          </SelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <NativeSelect
                        value={row.status}
                        onChange={(event) =>
                          setRow(index, { status: event.target.value as FireEquipmentStatus })
                        }
                      >
                        {EQUIPMENT_STATUS_OPTIONS.map((option) => (
                          <SelectOption key={option.value} value={option.value}>
                            {option.label}
                          </SelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reading</Label>
                      <Input
                        value={row.reading}
                        onChange={(event) => setRow(index, { reading: event.target.value })}
                        placeholder="e.g. 7.0 bar"
                      />
                    </div>
                    <div className="space-y-1 xl:col-span-2">
                      <Label className="text-xs">Link asset (optional)</Label>
                      <NativeSelect
                        value={row.asset}
                        onChange={(event) => setRow(index, { asset: event.target.value })}
                      >
                        <SelectOption value="">Not linked</SelectOption>
                        {assets.map((asset) => (
                          <SelectOption key={asset.id} value={String(asset.id)}>
                            {asset.asset_code} - {asset.name}
                          </SelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1 xl:col-span-2">
                      <Label className="text-xs">Remarks</Label>
                      <Input
                        value={row.remarks}
                        onChange={(event) => setRow(index, { remarks: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1 xl:col-span-4">
                      <Label className="text-xs">Photos</Label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                          <ImagePlus className="h-4 w-4" />
                          Add photos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              const files = Array.from(event.target.files ?? []);
                              event.target.value = '';
                              if (files.length) setRow(index, { photos: [...row.photos, ...files] });
                            }}
                          />
                        </label>
                        {row.photos.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {row.photos.length} photo{row.photos.length > 1 ? 's' : ''} selected
                            <button
                              type="button"
                              className="ml-2 text-red-600"
                              onClick={() => setRow(index, { photos: [] })}
                            >
                              clear
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {rows.length > 1 && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report_summary">Shift summary / remarks</Label>
            <Textarea
              id="report_summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments (optional)</Label>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
              <Upload className="h-4 w-4" />
              Add files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = '';
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <ClipboardCheck className="h-4 w-4" />
              {busy ? 'Submitting…' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportDetailDialog({
  reportId,
  canManage,
  canReview,
  onOpenChange,
}: {
  reportId: number;
  canManage: boolean;
  canReview: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reportQuery = useFireReport(reportId);
  const uploadPhoto = useUploadFireReportPhoto();
  const deletePhoto = useDeleteFireReportPhoto();
  const deleteItem = useDeleteFireReportItem();
  const uploadAttachment = useUploadFireReportAttachment();
  const deleteAttachment = useDeleteFireReportAttachment();
  const reviewReport = useReviewFireReport();
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [attachmentTitle, setAttachmentTitle] = useState('');

  const report = reportQuery.data;

  const handleUpload = async (itemId: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadPhoto.mutateAsync({ item: itemId, file });
    toast.success('Photo added');
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadAttachment.mutateAsync({ report: reportId, file, title: attachmentTitle.trim() });
    setAttachmentTitle('');
    toast.success('Attachment added');
  };

  const handleReview = async () => {
    await reviewReport.mutateAsync({ reportId, payload: { review_remarks: reviewRemarks.trim() } });
    toast.success('Report reviewed');
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {report
              ? `${report.report_date} · ${report.shift_display}${report.area ? ` · ${report.area}` : ''}`
              : 'Fire Shift Report'}
          </DialogTitle>
        </DialogHeader>

        {reportQuery.isLoading || !report ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading report…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline" className={REPORT_STATUS_CLASSES[report.status]}>
                {report.status_display}
              </Badge>
              <span className="text-muted-foreground">
                Submitted by {report.submitted_by_name || '-'}
              </span>
              {report.status === 'REVIEWED' && (
                <span className="text-muted-foreground">
                  · Reviewed by {report.reviewed_by_name || '-'}
                </span>
              )}
            </div>

            {report.summary_remarks && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">{report.summary_remarks}</div>
            )}

            <div className="space-y-3">
              {report.items.length === 0 ? (
                <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                  No equipment lines on this report.
                </div>
              ) : (
                report.items.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {item.equipment_name}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({item.equipment_type_display})
                          </span>
                        </div>
                        {item.asset_code && (
                          <div className="text-xs text-muted-foreground">
                            {item.asset_code} - {item.asset_name}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.reading && <span>Reading: {item.reading} · </span>}
                          {item.remarks}
                        </div>
                      </div>
                      <Badge variant="outline" className={EQUIPMENT_STATUS_CLASSES[item.status]}>
                        {item.status_display}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <a href={photo.photo} target="_blank" rel="noreferrer">
                            <img
                              src={photo.photo}
                              alt={photo.caption || item.equipment_name}
                              className="h-16 w-16 rounded border object-cover"
                            />
                          </a>
                          {canManage && (
                            <button
                              type="button"
                              className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 shadow"
                              onClick={async () => {
                                await deletePhoto.mutateAsync(photo.id);
                                toast.success('Photo removed');
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </button>
                          )}
                        </div>
                      ))}
                      {canManage && (
                        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-muted/40">
                          <ImagePlus className="h-5 w-5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => handleUpload(item.id, event)}
                          />
                        </label>
                      )}
                    </div>

                    {canManage && report.status !== 'REVIEWED' && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await deleteItem.mutateAsync(item.id);
                            toast.success('Equipment line removed');
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove line
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Paperclip className="h-4 w-4" /> Attachments
              </div>
              {report.attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attachments.</p>
              ) : (
                <ul className="space-y-1">
                  {report.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
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
                      <div className="flex items-center gap-2">
                        {attachment.uploaded_by_name && (
                          <span className="text-xs text-muted-foreground">
                            {attachment.uploaded_by_name}
                          </span>
                        )}
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
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={attachmentTitle}
                    onChange={(event) => setAttachmentTitle(event.target.value)}
                    placeholder="Title (optional)"
                    className="max-w-xs"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                    <Upload className="h-4 w-4" />
                    Upload file
                    <input type="file" className="hidden" onChange={handleAttachmentUpload} />
                  </label>
                </div>
              )}
            </div>

            {report.status === 'REVIEWED' && report.review_remarks && (
              <div className="rounded-md border bg-emerald-50/50 p-3 text-sm">
                <span className="font-medium">Review note: </span>
                {report.review_remarks}
              </div>
            )}

            {canReview && report.status === 'SUBMITTED' && (
              <div className="space-y-2 rounded-md border p-3">
                <Label htmlFor="review_remarks">Review note (optional)</Label>
                <Textarea
                  id="review_remarks"
                  value={reviewRemarks}
                  onChange={(event) => setReviewRemarks(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button type="button" onClick={handleReview} disabled={reviewReport.isPending}>
                    <ShieldCheck className="h-4 w-4" />
                    Mark Reviewed
                  </Button>
                </div>
              </div>
            )}
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

export default function MaintenanceFireReportsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_FIRE_REPORT);
  const canReview = hasPermission(MAINTENANCE_PERMISSIONS.REVIEW_FIRE_REPORT);

  const [filters, setFilters] = useState<FireShiftReportFilters>({
    search: '',
    shift: 'ALL',
    status: 'ALL',
    is_active: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const assetsQuery = useMaintenanceAssets({ is_active: true });
  const reportsQuery = useFireReports(filters);
  const deleteReport = useDeleteFireReport();

  const reports = reportsQuery.data ?? [];
  const submitted = reports.filter((report) => report.status === 'SUBMITTED').length;
  const reviewed = reports.filter((report) => report.status === 'REVIEWED').length;
  const flagged = reports.filter((report) => report.attention_items > 0).length;

  const assetOptions = useMemo(
    () => (assetsQuery.data ?? []).map((asset) => ({ id: asset.id, asset_code: asset.asset_code, name: asset.name })),
    [assetsQuery.data],
  );

  const handleDelete = async (report: FireShiftReport) => {
    await deleteReport.mutateAsync(report.id);
    toast.success('Report deleted');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Fire Shift Reports"
        description="Daily two-shift fire equipment inspection log with photos"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void reportsQuery.refetch()}
          disabled={reportsQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canManage}>
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Reports" value={reports.length} icon={FileText} />
        <SummaryCard title="Submitted" value={submitted} icon={ClipboardCheck} />
        <SummaryCard title="Reviewed" value={reviewed} icon={CheckCircle2} />
        <SummaryCard title="Needs Attention" value={flagged} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search by area or equipment, filter by shift, status and date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="report_search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="report_search"
                  value={filters.search ?? ''}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_filter_shift">Shift</Label>
              <NativeSelect
                id="report_filter_shift"
                value={filters.shift ?? 'ALL'}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    shift: event.target.value as FireShiftType | 'ALL',
                  }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                {SHIFT_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_filter_status">Status</Label>
              <NativeSelect
                id="report_filter_status"
                value={filters.status ?? 'ALL'}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as FireReportStatus | 'ALL',
                  }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                <SelectOption value="SUBMITTED">Submitted</SelectOption>
                <SelectOption value="REVIEWED">Reviewed</SelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_filter_date">On date</Label>
              <Input
                id="report_filter_date"
                type="date"
                value={filters.report_date ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, report_date: event.target.value || undefined }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shift</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Area</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Equipment</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted By</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportsQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading reports…
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <CalendarDays className="mx-auto mb-2 h-5 w-5" />
                  No fire shift reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3">{report.report_date}</td>
                  <td className="px-4 py-3">{report.shift_display}</td>
                  <td className="px-4 py-3">{report.area || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {report.total_items}
                    {report.attention_items > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-2 border-amber-200 bg-amber-50 text-amber-700"
                      >
                        {report.attention_items} flagged
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={REPORT_STATUS_CLASSES[report.status]}>
                      {report.status_display}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{report.submitted_by_name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(report.id)}>
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                      {canManage && report.status !== 'REVIEWED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(report)}
                          disabled={deleteReport.isPending}
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

      {createOpen && (
        <NewReportDialog open={createOpen} assets={assetOptions} onOpenChange={setCreateOpen} />
      )}
      {detailId !== null && (
        <ReportDetailDialog
          reportId={detailId}
          canManage={canManage}
          canReview={canReview}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        />
      )}
    </div>
  );
}
