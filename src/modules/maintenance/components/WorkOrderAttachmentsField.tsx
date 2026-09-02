import { Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import type {
  MaintenanceChoice,
  StagedWorkOrderAttachment,
  WorkOrderAttachmentDocType,
} from '../types';

interface WorkOrderAttachmentsFieldProps {
  value: StagedWorkOrderAttachment[];
  onChange: (next: StagedWorkOrderAttachment[]) => void;
  attachmentTypes?: MaintenanceChoice<WorkOrderAttachmentDocType>[];
  disabled?: boolean;
}

/** Fallback list so the picker still works if the options call has not landed. */
const FALLBACK_TYPES: MaintenanceChoice<WorkOrderAttachmentDocType>[] = [
  { value: 'COMPLAINT', label: 'Complaint / Fault Note' },
  { value: 'QUOTATION', label: 'Quotation' },
  { value: 'SERVICE_REPORT', label: 'Service Report' },
  { value: 'INVOICE', label: 'Invoice / Bill' },
  { value: 'DRAWING', label: 'Drawing' },
  { value: 'OTHER', label: 'Other' },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, '');
}

/**
 * Files picked while the work order is still being written. They cannot be
 * uploaded until the order exists and has an id, so they are held in memory and
 * pushed right after the create/update call succeeds.
 */
export function WorkOrderAttachmentsField({
  value,
  onChange,
  attachmentTypes,
  disabled = false,
}: WorkOrderAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const types = attachmentTypes?.length ? attachmentTypes : FALLBACK_TYPES;

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const staged: StagedWorkOrderAttachment[] = Array.from(files).map((file) => ({
      file,
      // The raiser attaches the fault evidence far more often than anything
      // else, so that is the default rather than "Other".
      doc_type: 'COMPLAINT',
      title: titleFromFile(file),
    }));
    onChange([...value, ...staged]);
    // Let the same file be picked again after removal.
    if (inputRef.current) inputRef.current.value = '';
  };

  const patch = (index: number, next: Partial<StagedWorkOrderAttachment>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...next } : item)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Attachments
        </Label>
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
          No files attached yet — add a photo of the fault, a quote or a drawing.
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
                    patch(index, { doc_type: event.target.value as WorkOrderAttachmentDocType })
                  }
                >
                  {types.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex-1 space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  value={item.title}
                  onChange={(event) => patch(index, { title: event.target.value })}
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
