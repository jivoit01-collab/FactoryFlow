/**
 * Searchable SAP item-code picker. Type ≥2 chars → a dropdown of matching SAP
 * items (code + name); pick one to fill the code. Still tolerant of free text
 * (and works as a plain input when SAP is unreachable).
 */
import { useEffect, useState } from 'react';

import { Input } from '@/shared/components/ui';

import { useSapItems } from '../api/marketplace.queries';

interface Props {
  value: string;
  onChange: (code: string, name?: string, uom?: string) => void;
  placeholder?: string;
}

export function SapItemInput({ value, onChange, placeholder }: Props) {
  const [term, setTerm] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(term);

  // Keep the input in sync when the edited record changes.
  useEffect(() => setTerm(value ?? ''), [value]);

  // Debounce the query term.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  const { data: items = [], isFetching } = useSapItems(debounced);

  return (
    <div className="relative">
      <Input
        value={term}
        placeholder={placeholder ?? 'Type ≥2 chars to search SAP items'}
        onChange={(e) => {
          setTerm(e.target.value);
          onChange(e.target.value); // free-text tolerant
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (isFetching || items.length > 0) && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {isFetching && items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : (
            items.map((it) => (
              <button
                key={it.item_code}
                type="button"
                className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault(); // fire before blur closes the list
                  setTerm(it.item_code);
                  onChange(it.item_code, it.item_name, it.uom);
                  setOpen(false);
                }}
              >
                <span className="font-mono text-sm">{it.item_code}</span>
                <span className="text-xs text-muted-foreground">{it.item_name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
