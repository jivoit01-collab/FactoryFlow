/**
 * The papers behind a project: the quotation it was costed from, a drawing, the
 * sanction letter, the completion certificate.
 *
 * Works in two modes, because a project's papers usually exist before the
 * project record does:
 *
 * - **staged** (`projectId` null) — on the New Project form, where there is
 *   nothing to attach to yet. Files are held in memory *with the title typed
 *   for them* and the caller uploads both once the project has an id. A
 *   drawing that arrives on the approver's desk called
 *   `Screenshot From 2026-09-23 11-24-59.png` is no use to them, and the
 *   moment the sender knows what it is, is the moment they attach it.
 * - **live** (`projectId` set) — uploads immediately and lists what is there.
 */
import { FileText, Map, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useAddAttachment, useAttachments, useRemoveAttachment } from '../api';
import type { AttachmentKind, ProjectAttachment } from '../types';
import { formatShortDate } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * The largest file worth sending from a site.
 *
 * Nothing stopped a 200MB pick before: the upload simply ran until the server
 * or the connection gave up, with no message that named the file. A site on a
 * phone connection needs to be told before it waits.
 */
const MAX_BYTES = 20 * 1024 * 1024;

function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** A file picked before there is a project to hang it on. */
export interface StagedAttachment {
  file: File;
  title: string;
  kind: AttachmentKind;
}

export function AttachmentsPanel({
  projectId,
  staged,
  onStagedChange,
  canEdit = true,
}: {
  projectId: number | null;
  /** Files held before the project exists, each with what it is. */
  staged?: StagedAttachment[];
  onStagedChange?: (files: StagedAttachment[]) => void;
  canEdit?: boolean;
}) {
  const live = projectId !== null;
  const { data: attachments } = useAttachments(projectId ?? 0, live);
  const add = useAddAttachment(projectId ?? 0);
  const remove = useRemoveAttachment(projectId ?? 0);

  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  // What the next pick will be filed as. Chosen before the file, like the
  // title, because the picker closes straight into the upload.
  const [kind, setKind] = useState<AttachmentKind>('DOCUMENT');
  const [removing, setRemoving] = useState<{ id: number; label: string } | null>(null);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files);

    const tooBig = chosen.filter((file) => file.size > MAX_BYTES);
    if (tooBig.length > 0) {
      toast.error(
        `${tooBig.map((file) => file.name).join(', ')} — over ${sizeOf(MAX_BYTES)}. ` +
          'Send a smaller copy.',
      );
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    if (!live) {
      // Same rule as live: one title describes one file, a batch keeps its
      // own names.
      onStagedChange?.([
        ...(staged ?? []),
        ...chosen.map((file) => ({ file, title: chosen.length === 1 ? title : '', kind })),
      ]);
      setTitle('');
      setKind('DOCUMENT');
    } else {
      try {
        // One title only makes sense for a single file; a batch keeps its names.
        await Promise.all(
          chosen.map((file) =>
            add.mutateAsync({ file, title: chosen.length === 1 ? title : '', kind }),
          ),
        );
        setTitle('');
        setKind('DOCUMENT');
        toast.success(chosen.length === 1 ? 'File attached' : `${chosen.length} files attached`);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not attach the file.'));
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  }

  const maps = attachments?.filter((item) => item.kind === 'MAP') ?? [];
  const papers = attachments?.filter((item) => item.kind !== 'MAP') ?? [];

  /** One row, used by both lists so they cannot drift apart. */
  const row = (attachment: ProjectAttachment) => (
    <li key={attachment.id} className="flex items-center justify-between gap-3 p-2.5">
      <a
        href={attachment.file}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2 hover:underline"
      >
        {attachment.kind === 'MAP' ? (
          <Map className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {attachment.title || attachment.filename}
          </span>
          <span className="text-xs text-muted-foreground">
            {attachment.uploaded_by_name ?? '—'} · {formatShortDate(attachment.created_at)}
          </span>
        </span>
      </a>
      {canEdit && (
        <button
          type="button"
          aria-label="Remove attachment"
          className="shrink-0 text-muted-foreground hover:text-rose-600"
          onClick={() =>
            setRemoving({
              id: attachment.id,
              label: attachment.title || attachment.filename || 'this file',
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );

  return (
    <div className="space-y-3">
      {canEdit && (
        <>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg"
            onChange={(event) => void pick(event.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What is it? (optional)"
              className="min-w-40 flex-1"
            />
            <NativeSelect
              value={kind}
              onChange={(event) => setKind(event.target.value as AttachmentKind)}
              className="w-36"
              aria-label="What kind of file"
            >
              <SelectOption value="DOCUMENT">Document</SelectOption>
              <SelectOption value="MAP">Site map</SelectOption>
            </NativeSelect>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={add.isPending}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {add.isPending ? 'Uploading…' : 'Attach a file'}
            </Button>
          </div>
          {!live && (
            <p className="text-xs text-muted-foreground">
              Quotations, drawings, anything the approver should see. They upload when the project
              is created.
            </p>
          )}
        </>
      )}

      {/* staged, before the project exists -- same split, so what the form
          shows matches what the Files tab will show once it is saved. */}
      {!live && staged && staged.length > 0 && (
        <ul className="divide-y rounded-md border">
          {[...staged]
            .map((item, index) => ({ item, index }))
            .sort((a, b) => (a.item.kind === b.item.kind ? 0 : a.item.kind === 'MAP' ? -1 : 1))
            .map(({ item, index }) => (
              <li
                key={`${item.file.name}-${index}`}
                className="flex items-center justify-between gap-3 p-2.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item.kind === 'MAP' ? (
                    <Map className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.title || item.file.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.kind === 'MAP' ? 'Site map · ' : ''}
                      {item.title ? `${item.file.name} · ` : ''}
                      {sizeOf(item.file.size)}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.title || item.file.name}`}
                  className="shrink-0 text-muted-foreground hover:text-rose-600"
                  onClick={() => onStagedChange?.(staged.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
        </ul>
      )}

      {/* live */}
      {live && attachments && attachments.length === 0 && (
        <p className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          Nothing attached yet.
        </p>
      )}

      {/* The map first and on its own. It answers "where on the campus, and
          what shape", which is the question people open this tab to ask, and
          it should not have to be picked out of a list of sanction letters. */}
      {live && maps.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Map className="h-3.5 w-3.5" />
            {maps.length === 1 ? 'Site map' : 'Site maps'}
          </p>
          <ul className="divide-y rounded-md border">{maps.map(row)}</ul>
        </div>
      )}

      {live && papers.length > 0 && (
        <div className="space-y-1.5">
          {maps.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              Everything else
            </p>
          )}
          <ul className="divide-y rounded-md border">{papers.map(row)}</ul>
        </div>
      )}
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setRemoving(null)}
          title="Remove this file?"
          description={`${removing.label} will no longer be attached to this project.`}
          confirmLabel="Remove file"
          successMessage="File removed"
          errorMessage="Could not remove the file."
          onConfirm={() => remove.mutateAsync(removing.id)}
        />
      )}
    </div>
  );
}
