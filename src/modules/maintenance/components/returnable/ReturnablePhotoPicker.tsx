import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { Button } from '@/shared/components/ui';
import { pickPhotos } from '@/shared/utils';

interface ReturnablePhotoPickerProps {
  value: File[];
  onChange: (next: File[]) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Photos only, previewed as they are picked. No `accept` and no `capture`, so a
 * phone offers both its camera and its files (see `pickPhotos`).
 */
export function ReturnablePhotoPicker({
  value,
  onChange,
  disabled = false,
  error,
}: ReturnablePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => value.map((file) => URL.createObjectURL(file)), [value]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = (input: HTMLInputElement) => {
    const photos = pickPhotos(input);
    // Let the same photo be picked again after removal.
    input.value = '';
    if (photos.length) onChange([...value, ...photos]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((file, index) => (
          <div key={`${file.name}-${index}`} className="relative">
            <img
              src={previews[index]}
              alt={file.name}
              className="h-24 w-24 rounded-lg border object-cover"
            />
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              disabled={disabled}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="h-24 w-24 flex-col gap-1 border-dashed"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs">{value.length ? 'Add more' : 'Add photo'}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          data-testid="returnable-photo-input"
          onChange={(event) => addFiles(event.target)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
