/** Free-form chip / tag input for multi-value string fields (material types, hazmat classes). */
import { useState } from 'react';
import { X } from 'lucide-react';

import { Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  uppercase?: boolean;
  id?: string;
}

export function TagInput({
  values,
  onChange,
  placeholder = 'Type and press Enter',
  suggestions,
  uppercase = true,
  id,
}: TagInputProps) {
  const [text, setText] = useState('');
  const listId = suggestions ? `${id ?? 'tags'}-suggestions` : undefined;

  function add(raw: string) {
    const value = (uppercase ? raw.toUpperCase() : raw).trim();
    if (!value || values.includes(value)) {
      setText('');
      return;
    }
    onChange([...values, value]);
    setText('');
  }

  function remove(value: string) {
    onChange(values.filter((item) => item !== value));
  }

  return (
    <div className="space-y-1.5">
      <div className={cn('flex flex-wrap gap-1.5', values.length === 0 && 'hidden')}>
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
          >
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => remove(value)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        id={id}
        list={listId}
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(text);
          } else if (event.key === 'Backspace' && !text && values.length) {
            remove(values[values.length - 1]!);
          }
        }}
        onBlur={() => add(text)}
      />
      {suggestions ? (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
