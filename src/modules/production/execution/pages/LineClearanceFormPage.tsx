import { ArrowLeft, Loader2, Paperclip, RotateCcw, Send, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch,
} from '@/shared/components/ui';

import {
  useCreateLineClearance, useDeleteLineClearanceAttachment,
useLineClearanceDetail, useLines,   useReopenLineClearance,
useRunDetail,
  useSubmitLineClearance, useUpdateLineClearance,
  useUploadLineClearanceAttachments, } from '../api';
import { ClearanceStatusBadge } from '../components/ClearanceStatusBadge';

const isImageFile = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url.split('?')[0]);
const fileNameFromUrl = (url: string, fallback?: string) =>
  fallback || decodeURIComponent(url.split('?')[0].split('/').pop() || 'attachment');

function LineClearanceFormPage() {
  const { clearanceId } = useParams<{ clearanceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !clearanceId;
  const numId = clearanceId ? Number(clearanceId) : null;
  const runIdParam = searchParams.get('run_id');
  const linkedRunId = runIdParam ? Number(runIdParam) : null;

  const { data: lines } = useLines(true);
  const { data: linkedRun } = useRunDetail(linkedRunId);
  const { data: clearance, isLoading } = useLineClearanceDetail(numId);
  const createClearance = useCreateLineClearance();
  const updateClearance = useUpdateLineClearance(numId || 0);
  const submitClearance = useSubmitLineClearance(numId || 0);
  const uploadAttachments = useUploadLineClearanceAttachments(numId || 0);
  const deleteAttachment = useDeleteLineClearanceAttachment(numId || 0);
  const reopenClearance = useReopenLineClearance(numId || 0);

  const [lineId, setLineId] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supervisorName, setSupervisorName] = useState('');
  const [isSavingSupervisor, setIsSavingSupervisor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveLineId = linkedRun ? linkedRun.line : lineId;
  const effectiveDate = linkedRun ? linkedRun.date : date;

  const isDraft = clearance?.status === 'DRAFT';
  const attachments = clearance?.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  useEffect(() => {
    if (!clearance || isSavingSupervisor) return;
    setSupervisorName(clearance.production_supervisor_sign || '');
  }, [clearance?.id, clearance?.production_supervisor_sign, isSavingSupervisor]);

  const handleCreate = async () => {
    try {
      const result = await createClearance.mutateAsync({
        production_run_id: linkedRunId || undefined,
        date: effectiveDate,
        line_id: effectiveLineId,
      });
      toast.success('Line clearance created');
      navigate(`/production/execution/line-clearance/${result.id}`, { replace: true });
    } catch { toast.error('Failed to create clearance'); }
  };

  const handleToggleChecks = async (checked: boolean) => {
    try {
      await updateClearance.mutateAsync({ all_checks_passed: checked });
      toast.success(checked ? 'All checks marked as passed' : 'Checks marked as not passed');
    } catch { toast.error('Failed to update'); }
  };

  const handleSupervisorChange = async (name: string) => {
    try {
      setIsSavingSupervisor(true);
      await updateClearance.mutateAsync({ production_supervisor_sign: name });
    } catch { toast.error('Failed to save supervisor name'); }
    finally { setIsSavingSupervisor(false); }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      await uploadAttachments.mutateAsync(Array.from(fileList));
      toast.success('Attachment uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload attachment');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachment.mutateAsync(attachmentId);
      toast.success('Attachment removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove attachment');
    }
  };

  const handleReopen = async () => {
    try {
      await reopenClearance.mutateAsync();
      toast.success('Clearance reopened — you can revise and resubmit');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reopen');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitClearance.mutateAsync();
      toast.success('Submitted for QA approval');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  if (!isNew && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {isNew ? (
        <>
          <DashboardHeader
            title="New Line Clearance"
            description={linkedRun ? `For Run #${linkedRun.run_number} — ${linkedRun.line_name} — ${linkedRun.product}` : 'Create a pre-production line clearance checklist'}
          />
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4 border-y py-4">
            {linkedRun ? (
              <>
                <div className="min-w-[8rem]">
                  <span className="text-sm text-muted-foreground">Production Run</span>
                  <p className="font-medium">Run #{linkedRun.run_number}</p>
                </div>
                <div className="min-w-[16rem] flex-1">
                  <span className="text-sm text-muted-foreground">Product</span>
                  <p className="font-medium">{linkedRun.product}</p>
                </div>
                <div className="min-w-[8rem]">
                  <span className="text-sm text-muted-foreground">Line</span>
                  <p className="font-medium">{linkedRun.line_name}</p>
                </div>
                <div className="min-w-[8rem]">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <p className="font-medium">{linkedRun.date}</p>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-[16rem]">
                  <Label>Production Line</Label>
                  <Select onValueChange={(v) => setLineId(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                    <SelectContent>{lines?.map((l) => (<SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="min-w-[12rem]">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </>
            )}
            <Button onClick={handleCreate} disabled={(!linkedRun && !lineId) || createClearance.isPending}>
              {createClearance.isPending ? 'Creating...' : 'Create Clearance'}
            </Button>
          </div>
        </>
      ) : clearance ? (
        <>
          <div className="flex items-center gap-3">
            <DashboardHeader
              title={`Line Clearance ${clearance.document_id || `#${clearance.id}`}`}
              description={clearance.run_number ? `Run #${clearance.run_number} · ${clearance.line_name} · ${clearance.date}` : `${clearance.line_name} · ${clearance.date}`}
            />
            <ClearanceStatusBadge status={clearance.status} />
          </div>

          {/* Checklist — read-only reference list */}
          <Card>
            <CardHeader><CardTitle>Checklist Items</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {clearance.items.map((item, idx) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[1.5rem]">{idx + 1}.</span>
                    <span>{item.checkpoint}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Single toggle + supervisor */}
          <Card>
            <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">All checks passed</p>
                  <p className="text-sm text-muted-foreground">Confirm that all the above checklist items have been verified</p>
                </div>
                {isDraft ? (
                  <Switch
                    checked={clearance.all_checks_passed}
                    onChange={handleToggleChecks}
                    disabled={updateClearance.isPending}
                  />
                ) : (
                  <span className={`text-sm font-medium ${clearance.all_checks_passed ? 'text-green-600' : 'text-red-600'}`}>
                    {clearance.all_checks_passed ? 'Yes' : 'No'}
                  </span>
                )}
              </div>

              <div className="max-w-sm">
                <div className="flex items-center justify-between gap-3">
                  <Label>Supervisor</Label>
                  {isSavingSupervisor && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </div>
                {isDraft ? (
                  <Input
                    value={supervisorName}
                    placeholder="Enter supervisor name"
                    disabled={isSavingSupervisor}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value !== clearance.production_supervisor_sign) {
                        handleSupervisorChange(e.target.value);
                      }
                    }}
                  />
                ) : (
                  <p className="font-medium mt-1">{clearance.production_supervisor_sign || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments — evidence of the cleared line */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Cleared Line Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDraft && (
                <p className="text-sm text-muted-foreground">
                  Attach at least one photo/document of the cleared line. Required before submitting for QA approval.
                </p>
              )}

              {attachments.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.map((att) => {
                    const name = fileNameFromUrl(att.file, att.original_name);
                    return (
                      <div key={att.id} className="group relative rounded-md border overflow-hidden">
                        <a href={att.file} target="_blank" rel="noopener noreferrer" className="block">
                          {isImageFile(att.file) ? (
                            <img src={att.file} alt={name} className="h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-28 w-full items-center justify-center bg-muted">
                              <Paperclip className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <p className="truncate px-2 py-1 text-xs" title={name}>{name}</p>
                        </a>
                        {isDraft && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            disabled={deleteAttachment.isPending}
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                            title="Remove attachment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !isDraft && <p className="text-sm text-muted-foreground">No attachments.</p>
              )}

              {isDraft && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadAttachments.isPending}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {uploadAttachments.isPending ? 'Uploading...' : 'Add Attachment'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QA remarks from the reviewer */}
          {clearance.qa_remarks && (clearance.status === 'NOT_CLEARED' || clearance.status === 'ON_HOLD') && (
            <Card>
              <CardHeader><CardTitle>QA Remarks</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{clearance.qa_remarks}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isDraft && (
              <Button
                onClick={handleSubmit}
                disabled={!clearance.all_checks_passed || !supervisorName || !hasAttachments || isSavingSupervisor || submitClearance.isPending}
                title={!clearance.all_checks_passed ? 'Mark all checks as passed first' : !supervisorName ? 'Enter supervisor name first' : !hasAttachments ? 'Add at least one attachment first' : isSavingSupervisor ? 'Wait for supervisor name to save' : undefined}
              >
                <Send className="h-4 w-4 mr-1" />
                {submitClearance.isPending ? 'Submitting...' : 'Submit for QA Approval'}
              </Button>
            )}
            {clearance.status === 'SUBMITTED' && (
              <p className="text-sm text-muted-foreground italic">Waiting for QA approval</p>
            )}
            {clearance.status === 'ON_HOLD' && (
              <p className="text-sm text-amber-600 font-medium">On hold by QA</p>
            )}
            {clearance.status === 'CLEARED' && (
              <p className="text-sm text-green-600 font-medium">Approved by QA</p>
            )}
            {clearance.status === 'NOT_CLEARED' && (
              <>
                <p className="text-sm text-red-600 font-medium self-center">Rejected by QA</p>
                <Button variant="outline" onClick={handleReopen} disabled={reopenClearance.isPending}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {reopenClearance.isPending ? 'Reopening...' : 'Reopen & Revise'}
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-muted-foreground">Clearance not found</div>
      )}
    </div>
  );
}

export default LineClearanceFormPage;
