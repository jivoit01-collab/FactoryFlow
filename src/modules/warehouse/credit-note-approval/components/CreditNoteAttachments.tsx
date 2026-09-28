/**
 * The scans an approver checks before deciding: the credit note's own
 * attachments and those of the invoice (or return, or GRPO) it was copied
 * from — SAP Portal's Attachments tab.
 *
 * Read only when asked for, because it is a SAP read per document. Files are
 * fetched through the queue's own endpoint, which serves only this credit
 * note's entries, so the queue's view right is enough.
 */
import { FileText, Paperclip } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui';

import { useCreditNoteAttachments, useOpenCreditNoteAttachment } from '../api/creditNoteApproval.queries';

export function CreditNoteAttachments({ wddCode }: { wddCode: number }) {
  const [asked, setAsked] = useState(false);
  const query = useCreditNoteAttachments(wddCode, asked);
  const open = useOpenCreditNoteAttachment(wddCode);

  if (!asked) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAsked(true)}>
        <Paperclip className="mr-1.5 h-3.5 w-3.5" />
        Show attachments
      </Button>
    );
  }
  if (query.isLoading) {
    return <p className="text-xs text-muted-foreground">Reading attachments from SAP…</p>;
  }
  if (query.isError) {
    return <p className="text-xs text-red-700 dark:text-red-400">SAP could not list this credit note&apos;s attachments.</p>;
  }
  const sources = (query.data ?? []).filter((source) => source.lines.length > 0);
  if (sources.length === 0) {
    return <p className="text-xs text-muted-foreground">No attachments on this credit note or the documents it was copied from.</p>;
  }
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium">
        <Paperclip className="h-3.5 w-3.5" />
        Attachments
      </p>
      {sources.map((source) => (
        <div key={source.abs_entry} className="space-y-1">
          <p className="text-muted-foreground">{source.label}</p>
          <ul className="flex flex-wrap gap-2">
            {source.lines.map((file) => (
              <li key={file.line}>
                <button
                  type="button"
                  disabled={open.isPending}
                  onClick={() => open.mutate({ absEntry: source.abs_entry, line: file.line, fileName: file.file_name })}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted disabled:opacity-60"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {file.file_name || `File ${file.line}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
