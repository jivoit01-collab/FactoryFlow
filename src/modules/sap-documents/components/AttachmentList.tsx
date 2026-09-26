/**
 * The files of one SAP attachment entry — the document's own, or one filed on a
 * document it was copied from (the scan of an invoice often sits on the GRPO or
 * delivery behind it). The download button shows only with the download right,
 * which the server checks again; the file comes through the API as a blob.
 */
import { Download, Paperclip } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { useAttachmentLines, useOpenAttachment } from '../api';
import { sapDate } from '../utils/format';

export function AttachmentList({
  absEntry,
  title,
  canDownload,
}: {
  absEntry: number;
  title: string;
  canDownload: boolean;
}) {
  const lines = useAttachmentLines(absEntry);
  const open = useOpenAttachment();
  const files = lines.data ?? [];

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        {title}
        {files.length > 0 && <span className="ml-1 font-normal text-muted-foreground">({files.length})</span>}
      </h3>
      {lines.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading the files…</p>
      ) : lines.isError ? (
        <p className="text-xs text-destructive">The attachment list could not be read from SAP.</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Attachment entry {absEntry} exists in SAP but holds no files.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((file) => {
            const busy = open.isPending && open.variables?.absEntry === absEntry && open.variables?.line === file.line;
            return (
              <li key={file.line} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={file.file_name}>
                    {file.file_name || `Line ${file.line}`}
                  </p>
                  {file.attached_on && (
                    <p className="text-xs text-muted-foreground">Attached {sapDate(file.attached_on)}</p>
                  )}
                </div>
                {canDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => open.mutate({ absEntry, line: file.line, fileName: file.file_name })}
                    aria-label={`Open ${file.file_name}`}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    {busy ? 'Opening…' : 'Open'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
