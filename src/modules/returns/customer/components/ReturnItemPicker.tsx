import { useState } from 'react';

import { SearchableSelect } from '@/shared/components/SearchableSelect';

import { type ReturnableItem, useReturnableItems } from '../api/goodsReturn';

/**
 * Picks an item from the company's finished goods.
 *
 * The whole FG range, not this customer's purchase history: goods come back for
 * reasons that have nothing to do with who was billed for them — a replacement
 * sent on a letter pad, stock moved between distributors, a debit note against a
 * shipment invoiced to somebody else. The tax code the posted return needs is
 * resolved at posting, falling back to this customer's most recent code, so an
 * item they were never billed for still posts.
 *
 * Rows this customer *has* been billed for come first and say when — context,
 * not a filter. Selecting a row carries back the unit of measure.
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
      placeholder="Search a finished good by code or name…"
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
          {/* Only for items this customer was actually billed for — the rest
              are perfectly returnable, they just have no history to show. */}
          {item.last_billed && (
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              last billed {item.last_billed}
              {item.last_invoice_num && <> on invoice {item.last_invoice_num}</>}
            </div>
          )}
        </div>
      )}
      loadingText="Searching finished goods…"
      emptyText="No finished goods found in SAP"
      notFoundText="No finished good matches that"
      errorText="Could not load finished goods from SAP"
      onItemSelect={onSelect}
      onClear={() => onSelect(null)}
    />
  );
}
