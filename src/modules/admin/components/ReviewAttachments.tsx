import { Paperclip, X } from 'lucide-react';
import { useId, useRef } from 'react';

import {
  type DockingApprovalAttachment,
  REVIEW_ATTACHMENT_LIMITS,
} from '@/modules/admin/api';
import { Button, Label } from '@/shared/components/ui';
import { resolveFileUrl } from '@/shared/utils';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

interface ReviewAttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** Surfaced by the dialog next to its own validation message. */
  onError: (message: string) => void;
}

/**
 * The approver's evidence picker inside a review dialog.
 *
 * Approving here lets goods leave the gate without being scanned, so the mail or signed
 * slip authorising that belongs on the approval itself. Optional by design — a decision
 * with no paperwork is still a valid decision.
 *
 * The count and size limits mirror the backend's, so an over-limit pick is caught before
 * the upload rather than after it.
 */
export function ReviewAttachmentPicker({
  files,
  onChange,
  disabled,
  onError,
}: ReviewAttachmentPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const incoming = Array.from(picked);

    const tooBig = incoming.find((file) => file.size > REVIEW_ATTACHMENT_LIMITS.maxBytes);
    if (tooBig) {
      onError(
        `"${tooBig.name}" is larger than ${formatBytes(REVIEW_ATTACHMENT_LIMITS.maxBytes)}.`,
      );
      return;
    }

    // Re-picking the same file (a habit when the dialog stays open) must not double it up.
    const merged = [...files];
    incoming.forEach((file) => {
      const isDuplicate = merged.some(
        (existing) => existing.name === file.name && existing.size === file.size,
      );
      if (!isDuplicate) merged.push(file);
    });

    if (merged.length > REVIEW_ATTACHMENT_LIMITS.maxFiles) {
      onError(`Attach at most ${REVIEW_ATTACHMENT_LIMITS.maxFiles} files.`);
      return;
    }
    onError('');
    onChange(merged);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, position) => position !== index));
    onError('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Attachments (optional)</Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="hidden"
        accept={REVIEW_ATTACHMENT_LIMITS.accept}
        disabled={disabled}
        onChange={(event) => {
          addFiles(event.target.files);
          // Clear the input so picking the same file again still fires onChange.
          event.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={disabled || files.length >= REVIEW_ATTACHMENT_LIMITS.maxFiles}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
        Add files
      </Button>
      <p className="text-xs text-muted-foreground">
        Attach the mail, slip or photo authorising this decision. Up to{' '}
        {REVIEW_ATTACHMENT_LIMITS.maxFiles} files,{' '}
        {formatBytes(REVIEW_ATTACHMENT_LIMITS.maxBytes)} each.
      </p>

      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 p-0"
                disabled={disabled}
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** What the approver filed, as the queue (and the operator's scan page) reads it back. */
export function ApprovalAttachmentLinks({
  attachments,
  className,
}: {
  attachments: DockingApprovalAttachment[];
  className?: string;
}) {
  if (!attachments?.length) return null;

  return (
    <div className={className}>
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={resolveFileUrl(attachment.file)}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-1 mt-1 inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs hover:bg-muted/50"
          title={`${attachment.original_filename} · ${formatBytes(attachment.file_size)}`}
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{attachment.original_filename || 'Attachment'}</span>
        </a>
      ))}
    </div>
  );
}
