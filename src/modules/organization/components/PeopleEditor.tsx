import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import { Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface PeopleEditorProps {
  /** Names currently at this level. */
  value: string[];
  onChange: (names: string[]) => void;
  /** Chip colours for the level being edited. */
  chipClassName: string;
  /**
   * Which cell this is, e.g. "Ownership for Dispatch – Docking". Every row on
   * the page carries three of these fields, so the label is what tells them
   * apart to a screen reader.
   */
  fieldLabel: string;
}

/**
 * Chip editor for one level's people.
 *
 * A name is committed on Enter, on a comma, or when the field loses focus —
 * typing a name and pressing Save straight away must not silently drop it.
 * Backspace on an empty field takes back the last chip, which is how everyone
 * expects a chip field to behave.
 *
 * Trimming and case-insensitive de-duplication happen here as well as on the
 * server: the server is the guarantee, this is so the editor shows what will
 * actually be saved.
 */
export function PeopleEditor({ value, onChange, chipClassName, fieldLabel }: PeopleEditorProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const name = raw.replace(/\s+/g, ' ').trim();
    setDraft('');
    if (!name) return;
    if (value.some((existing) => existing.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, name]);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, position) => position !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === 'Backspace' && draft === '' && value.length) {
      event.preventDefault();
      remove(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm font-medium',
            chipClassName,
          )}
        >
          {name}
          <button
            type="button"
            onClick={() => remove(index)}
            className="rounded-sm opacity-60 transition-opacity hover:opacity-100"
            aria-label={`Remove ${name} from ${fieldLabel}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        aria-label={`Add to ${fieldLabel}`}
        placeholder={value.length ? 'Add…' : 'Add a name…'}
        className="h-7 w-24 flex-1 min-w-[6rem] border-dashed px-2 text-sm"
      />
    </div>
  );
}
