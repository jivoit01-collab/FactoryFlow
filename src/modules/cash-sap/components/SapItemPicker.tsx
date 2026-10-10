import { Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';

import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { useSapItems } from '../api';

interface SapItemPickerProps {
  /** The SAP company the item lives in. Nothing is searched without one. */
  sapCompanyCode: string;
  /** The chosen item code ('' for none). */
  value: string;
  /** Shown beside the code when known. */
  valueName?: string;
  onChange: (itemCode: string, itemName: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

/**
 * Type-ahead over SAP's item master (`GET cash-sap/items/`). The server wants
 * two characters before it searches, and so does this; the list is the
 * first twenty matches by code.
 */
export function SapItemPicker({
  sapCompanyCode,
  value,
  valueName,
  onChange,
  disabled,
  id,
  placeholder = 'Search SAP items by code or name',
}: SapItemPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const term = useDebounce(search, 300);
  const { data: items = [], isFetching } = useSapItems(sapCompanyCode, term, open);

  return (
    <div className="space-y-1">
      {value ? (
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
          <span className="font-mono">{value}</span>
          {valueName && <span className="truncate text-muted-foreground">{valueName}</span>}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2"
              onClick={() => onChange('', '')}
              aria-label="Clear the item"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ) : null}
      {!disabled && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id={id}
            className="pl-8"
            value={search}
            placeholder={sapCompanyCode ? placeholder : 'Choose the SAP company first'}
            disabled={!sapCompanyCode}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
          />
          {isFetching && (
            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
      {open && !disabled && term.trim().length >= 2 && (
        <ul className="max-h-48 overflow-y-auto rounded-md border text-sm">
          {items.length === 0 && !isFetching ? (
            <li className="px-3 py-2 text-muted-foreground">No SAP item matches “{term}”.</li>
          ) : (
            items.map((item) => (
              <li key={item.item_code}>
                <button
                  type="button"
                  className="flex w-full gap-2 px-3 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    onChange(item.item_code, item.item_name);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <span className="font-mono">{item.item_code}</span>
                  <span className="truncate text-muted-foreground">{item.item_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{item.uom}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
