import { FileText, Paperclip, X } from 'lucide-react';

import { Button, Input } from '@/shared/components/ui';

import {
  ACCEPT_ATTRIBUTE,
  DOCUMENT_SLOTS,
  type DocumentSlot,
  type Family,
  REQUIRED_DOCUMENTS,
} from '../constants';
import type { DocumentFiles, FormErrors } from '../utils/registrationForm';
import { Field } from './Field';

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

/** The upload slots of one form: PDF, JPG or PNG, at most 15 MB each. */
export function DocumentSlots({
  family,
  hasMsme,
  files,
  errors,
  onChange,
}: {
  family: Family;
  hasMsme: boolean;
  files: DocumentFiles;
  errors: FormErrors;
  onChange: (next: DocumentFiles) => void;
}) {
  const required = new Set<DocumentSlot>([
    ...REQUIRED_DOCUMENTS[family],
    ...(hasMsme ? ['msme' as const] : []),
  ]);
  const slots = DOCUMENT_SLOTS[family].filter((slot) => slot.slot !== 'msme' || hasMsme);

  const add = (slot: DocumentSlot, multiple: boolean, chosen: FileList | null) => {
    if (!chosen?.length) return;
    const picked = Array.from(chosen);
    onChange({
      ...files,
      [slot]: multiple ? [...(files[slot] ?? []), ...picked] : picked.slice(0, 1),
    });
  };
  const remove = (slot: DocumentSlot, index: number) => {
    const next = (files[slot] ?? []).filter((_, i) => i !== index);
    onChange({ ...files, [slot]: next });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {slots.map(({ slot, label, multiple = false }) => (
        <Field
          key={slot}
          label={label}
          htmlFor={`document-${slot}`}
          required={required.has(slot)}
          error={errors[`documents.${slot}`]}
          hint="PDF, JPG or PNG — at most 15 MB"
        >
          <Input
            id={`document-${slot}`}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple={multiple}
            onChange={(e) => {
              add(slot, multiple, e.target.files);
              e.target.value = '';
            }}
          />
          {(files[slot] ?? []).map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
            >
              {file.type.startsWith('image/') ? (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{sizeLabel(file.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(slot, index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Field>
      ))}
    </div>
  );
}
