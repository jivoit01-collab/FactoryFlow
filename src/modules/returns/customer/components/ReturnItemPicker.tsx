import { useState } from 'react';

import { SearchableSelect } from '@/shared/components/SearchableSelect';

import { type ReturnableItem, useReturnableItems } from '../api/goodsReturn';

/**
 * Picks an item from what this customer has actually been invoiced.
 *
 * Their purchase history rather than the item master, for a reason beyond
 * convenience: an item they were never billed for has no tax code, and SAP
 * refuses a return line without one (error 160009). Anything outside this list
 * would be accepted here and then rejected at posting, so the list is the
 * guard.
 *
 * Selecting a row also carries back the unit of measure and the tax code the
 * original sale used, which is what the posted return has to reverse.
 *
 * Search is split: `SearchableSelect` debounces at only 100ms, too eager for a
 * SAP query, so one character filters the cached list and two or more go to the
 * server. `filterFn` matches the same fields the backend does.
 */
export function ReturnItemPicker({
  returnId,
  value,
  onSelect,
  disabled,
  inputId,
}: {
  returnId: number;
  value: string;
  onSelect: (item: ReturnableItem | null) => void;
  disabled?: boolean;
  inputId: string;
}) {
  const [search, setSearch] = useState('');
  const serverTerm = search.trim().length >= 2 ? search.trim() : '';
  const { data: items = [], isLoading, isError } = useReturnableItems(returnId, serverTerm);

  return (
    <SearchableSelect<ReturnableItem>
      items={items}
      isLoading={isLoading}
      isError={isError}
      disabled={disabled}
      inputId={inputId}
      value={value}
      defaultDisplayText={value}
      placeholder="Search an item this customer bought…"
      getItemKey={(item) => item.item_code}
      getItemLabel={(item) => item.item_code}
      filterFn={(item, term) => {
        const needle = term.trim().toUpperCase();
        if (!needle) return true;
        return (
          item.item_code.toUpperCase().includes(needle) ||
          item.item_name.toUpperCase().includes(needle)
        );
      }}
      onSearchChange={setSearch}
      renderItem={(item) => (
        <div className="w-full">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium">{item.item_code}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{item.tax_code}</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{item.item_name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            last billed {item.last_billed ?? '—'}
            {item.last_invoice_num && <> on invoice {item.last_invoice_num}</>}
          </div>
        </div>
      )}
      loadingText="Searching this customer's items…"
      emptyText="This customer has no billed items in SAP"
      notFoundText="Nothing this customer bought matches that"
      errorText="Could not load the customer's items from SAP"
      onItemSelect={onSelect}
      onClear={() => onSelect(null)}
    />
  );
}
