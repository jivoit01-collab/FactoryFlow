import { Paperclip } from 'lucide-react';

import type { ExpenseAttachment } from '@/modules/accounts/api';
import { resolveFileUrl } from '@/shared/utils';

/** An expense's files as links, each opening in a new tab. Nothing when it has none. */
export function ExpenseAttachmentLinks({ attachments }: { attachments: ExpenseAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
      {attachments.map((file) => (
        <a
          key={file.id}
          href={resolveFileUrl(file.url)}
          target="_blank"
          rel="noreferrer"
          title={file.original_filename}
          className="inline-flex max-w-[200px] items-center gap-1 text-xs text-primary hover:underline"
          // The Entry page's rows open the expense on a click or Enter.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{file.original_filename}</span>
        </a>
      ))}
    </div>
  );
}
