import { useState } from 'react';

import { SearchableSelect } from '@/shared/components/SearchableSelect';

import { useWarehouseStock } from '../../api';
import type { WarehouseStockItem } from '../../types';
import { qty } from './transferFormat';

/**
 * Picks an item from what the source warehouse actually holds in SAP.
 *
 * Shows on hand — SAP's own Qty in Whse — next to **free to move**, which is on
 * hand minus what this app's own open requests already hold. Only our own
 * requests are netted off: SAP's `IsCommited` counts every open document in the
 * company, including transfer requests keyed by hand years ago and never
 * closed, and none of it stops a warehouse-to-warehouse move. That figure is
 * still shown, as context, so nobody has to wonder why SAP's screens differ.
 *
 * Free to move can be negative if the app has over-promised, and that is shown
 * plainly rather than clamped, since hiding it is how stock gets promised
 * twice.
 *
 * Search is split. `SearchableSelect` debounces `onSearchChange` at only 100ms,
 * which is too eager for a HANA query, so a single character filters the
 * already-cached top-of-warehouse list on the client and only two or more go to
 * the server. `filterFn` matches the same fields the backend does (code and
 * name), so the client pass can never hide a row the server matched.
 */
export function ItemPicker({
  warehouse,
  value,
  onSelect,
  disabled,
  inputId,
  ariaLabel,
}: {
  warehouse: string;
  value: string;
  onSelect: (item: WarehouseStockItem | null) => void;
  disabled?: boolean;
  inputId: string;
  ariaLabel: string;
}) {
  const [search, setSearch] = useState('');
  // Below two characters the warehouse's cached list is enough; searching SAP
  // per keystroke is not.
  const serverTerm = search.trim().length >= 2 ? search.trim() : '';
  const { data: items = [], isLoading, isError } = useWarehouseStock(warehouse, serverTerm);

  return (
    <SearchableSelect<WarehouseStockItem>
      items={items}
      isLoading={isLoading}
      isError={isError}
      disabled={disabled || !warehouse}
      inputId={inputId}
      value={value}
      defaultDisplayText={value}
      placeholder={warehouse ? ariaLabel : 'Choose the source warehouse first'}
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
      renderItem={(item) => {
        const overPromised = item.free_to_move < 0;
        return (
          <div className="w-full">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{item.item_code}</span>
              <span
                className={`shrink-0 text-xs tabular-nums ${
                  overPromised ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                {qty(item.free_to_move)} {item.uom} free to move
              </span>
            </div>
            <div className="truncate text-xs text-muted-foreground">{item.item_name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {qty(item.on_hand)} in whse
              {item.app_reserved > 0 && (
                <> · {qty(item.app_reserved)} held by your open requests</>
              )}
              {item.committed > 0 && (
                <> · {qty(item.committed)} committed in SAP</>
              )}
              {overPromised && <span className="text-red-600"> · over-promised</span>}
            </div>
          </div>
        );
      }}
      loadingText="Searching SAP…"
      emptyText={warehouse ? `Nothing in stock in ${warehouse}` : 'Pick a source warehouse'}
      notFoundText={`Nothing in ${warehouse} matches that`}
      errorText="Could not read stock from SAP"
      onItemSelect={onSelect}
      onClear={() => onSelect(null)}
    />
  );
}
