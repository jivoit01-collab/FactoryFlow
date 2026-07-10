import { Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import { ATTACHMENT_DOC_TYPE_OPTIONS } from '../../constants/returnable.constants';
import type { AttachmentDocType, StagedAttachment } from '../../types';

interface ReturnableAttachmentsFieldProps {
  value: StagedAttachment[];
  onChange: (next: StagedAttachment[]) => void;
  disabled?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Files staged while the pass is still being written. They cannot be uploaded
 * until the pass exists and has an id, so they are held in memory and pushed
 * immediately after the create/update call succeeds.
 */
export function ReturnableAttachmentsField({
  value,
  onChange,
  disabled = false,
}: ReturnableAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const staged: StagedAttachment[] = Array.from(files).map((file) => ({
      file,
      doc_type: 'CHALLAN',
      caption: '',
    }));
    onChange([...value, ...staged]);
    // Let the same file be picked again after removal.
    if (inputRef.current) inputRef.current.value = '';
  };

  const patch = (index: number, next: Partial<StagedAttachment>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...next } : item)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    // The heading lives in the parent section; this renders only the control.
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1 h-4 w-4" />
          Add Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No files attached yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((item, index) => (
            <li
              key={`${item.file.name}-${index}`}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(item.file.size)}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <NativeSelect
                  className="sm:w-44"
                  value={item.doc_type}
                  onChange={(event) =>
                    patch(index, { doc_type: event.target.value as AttachmentDocType })
                  }
                >
                  {ATTACHMENT_DOC_TYPE_OPTIONS.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex-1 space-y-1">
                <Label className="text-xs">Caption</Label>
                <Input
                  value={item.caption}
                  placeholder="Optional"
                  onChange={(event) => patch(index, { caption: event.target.value })}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                aria-label={`Remove ${item.file.name}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
