import {
  AlertCircle,
  ExternalLink,
  FileText,
  History,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type GateAttachment,
  useEmptyVehicleGateIn,
  useGateAttachmentHistory,
  useGateAttachments,
  useRemoveAttachment,
  useUploadAttachment,
} from '@/modules/gate/api';
import { StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
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
import { formatDateTime, getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  EMPTY_VEHICLE_IN_ROUTES,
  EMPTY_VEHICLE_IN_TOTAL_STEPS,
  getGateInId,
} from './emptyVehicleInRoutes';

export default function EmptyVehicleInAttachmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gateInId = getGateInId(searchParams);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<GateAttachment | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
  } = useEmptyVehicleGateIn(gateInId);
  const vehicleEntryId = entry?.vehicle_entry || null;
  const { data: attachments = [], isLoading: isAttachmentsLoading } =
    useGateAttachments(vehicleEntryId);
  const { data: history = [] } = useGateAttachmentHistory(vehicleEntryId);
  const uploadAttachment = useUploadAttachment(vehicleEntryId || 0);
  const removeAttachment = useRemoveAttachment(vehicleEntryId || 0);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !vehicleEntryId) return;

    setError('');
    for (const file of Array.from(files)) {
      try {
        await uploadAttachment.mutateAsync(file);
        toast.success(`${file.name} uploaded`);
      } catch (uploadError) {
        setError(getErrorMessage(uploadError, `Failed to upload ${file.name}`));
        break;
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeRemoveDialog = () => {
    setRemoveTarget(null);
    setRemoveReason('');
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeAttachment.mutateAsync({
        attachmentId: removeTarget.id,
        reason: removeReason.trim() || undefined,
      });
      toast.success('Attachment removed');
      closeRemoveDialog();
    } catch (removeError) {
      toast.error(getErrorMessage(removeError, 'Failed to remove attachment'));
    }
  };

  if (isEntryLoading || isAttachmentsLoading) return <StepLoadingSpinner />;

  if (!gateInId || !entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={3}
          totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
          title="Empty Vehicle In"
          error={error || (entryError ? getErrorMessage(entryError, 'Entry not found') : null)}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Empty vehicle entry details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(EMPTY_VEHICLE_IN_ROUTES.details())}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={3}
        totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
        title="Empty Vehicle In"
        error={error || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <button
            type="button"
            disabled={uploadAttachment.isPending}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">
              {uploadAttachment.isPending ? 'Uploading...' : 'Upload files'}
            </span>
            <span className="text-xs text-muted-foreground">
              Weighment slip, vehicle photo, document scan, PDF, or other supporting file
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {attachments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => setRemoveTarget(attachment)}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No attachments uploaded yet. Uploaded a wrong slip? Remove it below and upload the
              correct one.
            </p>
          )}
        </CardContent>
      </Card>

      <AuditTrailCard history={history} />

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && closeRemoveDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove attachment</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `"${fileNameOf(removeTarget)}" will be removed from this entry. The file is kept and stays visible in the audit trail below — it is not permanently deleted.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="remove-reason">Reason (optional)</Label>
            <Textarea
              id="remove-reason"
              value={removeReason}
              onChange={(event) => setRemoveReason(event.target.value)}
              placeholder="e.g. Wrong weighment slip uploaded"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRemoveDialog} disabled={removeAttachment.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeAttachment.isPending}
            >
              {removeAttachment.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepFooter
        onPrevious={() => navigate(EMPTY_VEHICLE_IN_ROUTES.weighment(gateInId))}
        onCancel={() => navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard)}
        onNext={() => navigate(EMPTY_VEHICLE_IN_ROUTES.review(gateInId))}
        isSaving={uploadAttachment.isPending}
        nextLabel="Review"
      />
    </div>
  );
}

function fileNameOf(attachment: GateAttachment): string {
  return attachment.file_name || attachment.file.split('/').pop() || 'Attachment';
}

function AttachmentCard({
  attachment,
  onRemove,
}: {
  attachment: GateAttachment;
  onRemove: () => void;
}) {
  const url = resolveFileUrl(attachment.file);
  const fileName = fileNameOf(attachment);

  return (
    <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
      >
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={`Remove ${fileName}`}
        title="Remove attachment"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AuditTrailCard({ history }: { history: GateAttachment[] }) {
  // Build a flat, chronological event feed from the attachment lifecycle:
  // every file logs an "uploaded" event, and a removed one also logs a
  // "removed" event. Sorted oldest → newest.
  const events: AttachmentEvent[] = [];
  for (const item of history) {
    events.push({
      key: `up-${item.id}`,
      attachment: item,
      action: 'uploaded',
      at: item.uploaded_at || '',
      actor: item.uploaded_by_name || '',
    });
    if (!item.is_active && item.removed_at) {
      events.push({
        key: `rm-${item.id}`,
        attachment: item,
        action: 'removed',
        at: item.removed_at,
        actor: item.removed_by_name || '',
        reason: item.remove_reason || '',
      });
    }
  }
  events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Audit trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachment activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <AuditRow key={event.key} event={event} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

interface AttachmentEvent {
  key: string;
  attachment: GateAttachment;
  action: 'uploaded' | 'removed';
  at: string;
  actor: string;
  reason?: string;
}

function AuditRow({ event }: { event: AttachmentEvent }) {
  const url = resolveFileUrl(event.attachment.file);
  const fileName = fileNameOf(event.attachment);
  const isRemoved = event.action === 'removed';

  return (
    <li className="flex gap-3">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          isRemoved ? 'bg-destructive' : 'bg-emerald-500'
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{isRemoved ? 'Removed' : 'Uploaded'}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate text-primary hover:underline"
          >
            {fileName}
          </a>
          {event.actor && (
            <span className="text-sm text-muted-foreground">by {event.actor}</span>
          )}
          {event.at && (
            <span className="text-xs text-muted-foreground">
              · {formatDateTime(event.at)}
            </span>
          )}
        </div>
        {isRemoved && event.reason && (
          <p className="mt-0.5 text-sm text-muted-foreground">Reason: {event.reason}</p>
        )}
      </div>
    </li>
  );
}
