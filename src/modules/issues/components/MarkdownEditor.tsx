/**
 * The write box for an issue body or a comment: a Write / Preview pair, with
 * screenshots attachable by paste, drag-drop or a file button.
 *
 * Paste matters more than it looks. The single most useful thing in a bug
 * report is a picture of the broken screen, and the way people take one is
 * PrtSc followed by Ctrl-V. So a pasted image is uploaded immediately and its
 * markdown is inserted at the caret; the reporter never has to save a file
 * first. The uploaded rows come back unclaimed and their ids are handed to the
 * parent through `onAttachmentsChange`, which sends them with the submit.
 */
import { Eye, Image as ImageIcon, Loader2, Paperclip, Pencil } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button, Textarea } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useUploadAttachments } from '../api';
import type { IssueAttachment } from '../types';
import { formatBytes } from '../utils';
import { Markdown } from './Markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with every attachment id uploaded through this editor. */
  onAttachmentsChange?: (ids: number[]) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  /** Rendered on the right of the toolbar, e.g. the submit button. */
  toolbarExtra?: React.ReactNode;
}

export function MarkdownEditor({
  value,
  onChange,
  onAttachmentsChange,
  placeholder = 'Describe what happened, what you expected, and how to reproduce it…',
  rows = 8,
  disabled = false,
  className,
  toolbarExtra,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [uploaded, setUploaded] = useState<IssueAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachments();

  const insertAtCaret = useCallback(
    (snippet: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        onChange(`${value}${value && !value.endsWith('\n') ? '\n' : ''}${snippet}`);
        return;
      }
      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? value.length;
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      onChange(next);
      // Put the caret after the inserted markdown so typing continues naturally.
      requestAnimationFrame(() => {
        const caret = start + snippet.length;
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    },
    [onChange, value],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || disabled) return;
      try {
        const response = await upload.mutateAsync(files);
        response.errors.forEach((error) => toast.error(`${error.filename}: ${error.detail}`));
        if (!response.results.length) return;

        const next = [...uploaded, ...response.results];
        setUploaded(next);
        onAttachmentsChange?.(next.map((row) => row.id));

        // An image embeds so it shows inline; anything else becomes a link.
        const snippet = response.results
          .map((row) =>
            row.is_image
              ? `![${row.original_filename}](${row.url ?? ''})`
              : `[${row.original_filename}](${row.url ?? ''})`,
          )
          .join('\n');
        insertAtCaret(`${value && !value.endsWith('\n') ? '\n\n' : ''}${snippet}\n`);
      } catch (error) {
        toast.error(getErrorMessage(error, 'The file could not be uploaded.'));
      }
    },
    [disabled, insertAtCaret, onAttachmentsChange, upload, uploaded, value],
  );

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (!files.length) return;
    // The clipboard held a file, not text -- take it instead of pasting nothing.
    event.preventDefault();
    void handleFiles(files);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) void handleFiles(files);
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant={tab === 'write' ? 'secondary' : 'ghost'}
          onClick={() => setTab('write')}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Write
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'preview' ? 'secondary' : 'ghost'}
          onClick={() => setTab('preview')}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Preview
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {upload.isPending && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || upload.isPending}
            title="Attach a screenshot, log or spreadsheet"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          {toolbarExtra}
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn('relative', dragging && 'ring-2 ring-inset ring-primary')}
      >
        {tab === 'write' ? (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        ) : (
          <div className="min-h-[120px] p-3">
            <Markdown source={value} />
          </div>
        )}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 text-sm font-medium">
            <ImageIcon className="mr-2 h-4 w-4" />
            Drop to attach
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          Markdown supported. Paste or drop a screenshot to attach it. Type{' '}
          <code className="rounded bg-muted px-1">#41</code> to link another issue.
        </span>
        {uploaded.length > 0 && (
          <span className="ml-auto">
            {uploaded.length} attached (
            {formatBytes(uploaded.reduce((total, row) => total + row.size_bytes, 0))})
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void handleFiles(files);
        }}
      />
    </div>
  );
}
