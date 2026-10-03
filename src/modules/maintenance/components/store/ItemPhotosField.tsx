import { Camera, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { Button } from '@/shared/components/ui';
import { resolveFileUrl } from '@/shared/utils';

import type { MaintenanceSparePhoto } from '../../types';

function Thumb({
  src,
  label,
  disabled,
  onRemove,
}: {
  src: string;
  label: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative">
      <img src={src} alt={label} className="h-20 w-20 rounded-lg border object-cover" />
      <button
        type="button"
        aria-label={`Remove ${label}`}
        disabled={disabled}
        className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 shadow"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5 text-destructive" />
      </button>
    </div>
  );
}

/**
 * An item's photos in the Add / Edit form: the ones already saved, then the
 * ones picked now, then a tile to add more. `accept="image/*"` without
 * `capture`, so a phone offers both its camera and its gallery.
 */
export function ItemPhotosField({
  saved,
  onRemoveSaved,
  files,
  onFilesChange,
  disabled = false,
}: {
  saved: MaintenanceSparePhoto[];
  onRemoveSaved: (photoId: number) => void;
  files: File[];
  onFilesChange: (next: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = (picked: FileList | null) => {
    if (!picked?.length) return;
    onFilesChange([...files, ...Array.from(picked)]);
    // Let the same photo be picked again after removal.
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-wrap gap-3">
      {saved.map((photo, index) => (
        <Thumb
          key={`saved-${photo.id}`}
          src={resolveFileUrl(photo.photo)}
          label={`photo ${index + 1}`}
          disabled={disabled}
          onRemove={() => onRemoveSaved(photo.id)}
        />
      ))}
      {files.map((file, index) => (
        <Thumb
          key={`new-${file.name}-${index}`}
          src={previews[index]}
          label={file.name}
          disabled={disabled}
          onRemove={() => onFilesChange(files.filter((_, i) => i !== index))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-20 w-20 flex-col gap-1 border-dashed"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-5 w-5" />
        <span className="text-xs">{saved.length + files.length ? 'Add more' : 'Add photo'}</span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="item-photo-input"
        onChange={(event) => addFiles(event.target.files)}
      />
    </div>
  );
}
