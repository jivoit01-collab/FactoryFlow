/**
 * Pick a finished good to make.
 *
 * Searches the SAP item master server-side rather than filtering a downloaded
 * list: this company has nearly a thousand items and only the ones with a
 * production recipe belong here, which is a decision the backend already makes.
 *
 * Only items SAP holds a real BOM for are offered. Letting somebody pick one
 * without a recipe would answer "no BOM" to every quantity they typed against
 * it, which reads as a broken screen rather than as missing master data.
 *
 * The item name carries the case configuration ("… 4 PCS") and the pieces-per-
 * case factor is shown beside it, because the quantity box next to this picker
 * is in PIECES and the floor speaks in cases. That mismatch is the single
 * easiest way to ask for a twentieth of the run you meant.
 */
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { useBomItems } from '../api';
import type { BomItem } from '../types';
import { toNumber } from './format';

export interface ProductPickerProps {
  value: string;
  itemName?: string;
  onSelect: (item: BomItem) => void;
  /** Codes already on the request, so the same product cannot be added twice. */
  taken?: string[];
  disabled?: boolean;
}

export function ProductPicker({
  value,
  itemName,
  onSelect,
  taken = [],
  disabled = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);
  const query = useBomItems(debounced.trim());

  const takenSet = useMemo(
    () => new Set(taken.filter((code) => code !== value)),
    [taken, value],
  );
  const rows = query.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {value ? (
              <>
                <span className="font-mono text-xs">{value}</span>
                {itemName ? (
                  <span className="ml-2 text-xs text-muted-foreground">{itemName}</span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">Pick a product…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(34rem,90vw)] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code or name"
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {query.isLoading ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Loading products…
            </p>
          ) : !rows.length ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {debounced.trim()
                ? 'No product with a bill of materials matches that.'
                : 'No products with a bill of materials.'}
            </p>
          ) : (
            rows.map((item) => {
              const isTaken = takenSet.has(item.item_code);
              const perCase = item.pieces_per_case > 1 ? item.pieces_per_case : null;
              const litres = toNumber(item.litres_per_unit);

              return (
                <button
                  key={item.item_code}
                  type="button"
                  disabled={isTaken}
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left text-sm',
                    isTaken
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-muted focus:bg-muted focus:outline-none',
                  )}
                  title={isTaken ? 'Already on the request' : undefined}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      item.item_code === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-xs">{item.item_code}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.item_name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {item.component_count} component
                      {item.component_count === 1 ? '' : 's'}
                      {perCase ? ` · ${perCase} ${item.uom || 'Pcs'} per case` : ''}
                      {litres > 0 ? ` · ${litres} L a piece` : ''}
                      {isTaken ? ' · already added' : ''}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
