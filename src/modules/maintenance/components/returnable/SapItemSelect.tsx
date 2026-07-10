import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import { useSapItemSearch } from '../../api/returnableGatePass.queries';
import type { SapItem } from '../../types';

interface SapItemSelectProps {
  inputId: string;
  /** The currently chosen item name, so the field survives a re-render. */
  value?: string;
  /** Shown before the search results arrive, when editing a saved line. */
  defaultDisplayText?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  onSelect: (item: SapItem) => void;
  onClear: () => void;
}

/**
 * Omni-search over the SAP item master: type any part of the item code or the
 * item name. Search runs server-side against HANA (`OITM`), debounced by
 * `SearchableSelect`, and needs at least two characters.
 *
 * Selecting an item fills the line's code, name and UOM. Lines can still be
 * typed by hand — a returnable pass often carries an unlisted asset such as a
 * motor or a gauge, which has no SAP item code at all.
 */
export function SapItemSelect({
  inputId,
  value,
  defaultDisplayText,
  disabled = false,
  error,
  label,
  required = false,
  onSelect,
  onClear,
}: SapItemSelectProps) {
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading, isError } = useSapItemSearch(search);

  return (
    <SearchableSelect<SapItem>
      inputId={inputId}
      label={label}
      required={required}
      value={value}
      defaultDisplayText={defaultDisplayText}
      disabled={disabled}
      error={error}
      items={items}
      isLoading={isLoading}
      isError={isError}
      placeholder="Search SAP item by code or name"
      loadingText="Searching SAP…"
      emptyText="Type at least 2 characters to search SAP"
      notFoundText="No SAP item matches. You can type the item name in manually."
      errorText="SAP item search is unavailable. Enter the item manually."
      getItemKey={(item) => item.item_code}
      getItemLabel={(item) => item.item_name}
      // Results are already narrowed server-side; re-filtering client-side would
      // hide rows that matched on item_code but not item_name.
      filterFn={() => true}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.item_name}</span>
          <span className="text-xs text-muted-foreground">
            {item.item_code}
            {item.uom ? ` · ${item.uom}` : ''}
          </span>
        </div>
      )}
      onSearchChange={(next) => setSearch(next.trim())}
      onItemSelect={onSelect}
      onClear={onClear}
    />
  );
}
