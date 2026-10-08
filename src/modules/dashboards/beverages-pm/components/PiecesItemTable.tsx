import { AlertTriangle, Search, X } from 'lucide-react';

import { Badge, Button, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { formatInr, formatInrCompact, formatQty } from '../../packing-material/utils';
import type { PiecesFilters, PiecesSortKey, PiecesUnitFilter } from '../types';
import { describeConversion, type PiecesRow, type PiecesRowTotals } from '../utils';

export interface PiecesItemTableProps {
  rows: PiecesRow[];
  totals: PiecesRowTotals;
  itemCount: number;
  filters: PiecesFilters;
  onFiltersChange: (patch: Partial<PiecesFilters>) => void;
  onClear: () => void;
}

const UNIT_OPTIONS: { value: PiecesUnitFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'converted', label: 'In pieces' },
  { value: 'unconverted', label: 'Not in pieces' },
];

const SORT_OPTIONS: { value: PiecesSortKey; label: string }[] = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'value', label: 'Value' },
  { value: 'name', label: 'Name' },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-md border p-0.5">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'secondary' : 'ghost'}
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * Every item the filters keep, one row each. The headline is pieces; the SAP
 * quantity and unit sit under it so the conversion can be checked. An item
 * with no piece unit shows a dash for pieces and its own quantity instead —
 * it is listed, never added in.
 */
export function PiecesItemTable({
  rows,
  totals,
  itemCount,
  filters,
  onFiltersChange,
  onClear,
}: PiecesItemTableProps) {
  const filtered =
    filters.search !== '' ||
    filters.warehouses.length > 0 ||
    filters.families.length > 0 ||
    filters.unit !== 'all';

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Item code, name, family or unit"
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
          />
        </div>
        <Segmented
          options={UNIT_OPTIONS}
          value={filters.unit}
          onChange={(unit) => onFiltersChange({ unit })}
        />
        <Segmented
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ sort })}
        />
        {filtered && (
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {(filters.warehouses.length > 0 || filters.families.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filters.warehouses.map((code) => (
            <Badge key={`w-${code}`} variant="secondary" className="text-xs">
              Store: {code}
            </Badge>
          ))}
          {filters.families.map((family) => (
            <Badge key={`f-${family}`} variant="secondary" className="text-xs">
              Family: {family}
            </Badge>
          ))}
        </div>
      )}

      {/* Footed with what the rows on screen add up to, so a filter can never
          leave ten rows above a figure for four hundred. */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-center sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-muted-foreground">Items</p>
          <p className="text-sm font-semibold tabular-nums">
            {totals.items}
            {totals.items !== itemCount && (
              <span className="text-muted-foreground"> / {itemCount}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Pieces</p>
          <p className="text-sm font-semibold tabular-nums">{formatQty(totals.pcs)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Value</p>
          <p className="text-sm font-semibold tabular-nums">{formatInrCompact(totals.value)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Not in pieces</p>
          <p className="text-sm font-semibold tabular-nums">
            {totals.unconverted}
            {totals.unconverted > 0 && (
              <span className="font-normal text-muted-foreground">
                {' '}
                · {formatInrCompact(totals.unconvertedValue)}
              </span>
            )}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing matches these filters.</p>
      ) : (
        <div className="mt-3 max-h-[70vh] min-h-0 flex-1 overflow-auto rounded-lg border xl:max-h-none">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/90 text-xs text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-left font-medium">Family</th>
                <th className="px-3 py-2 text-right font-medium">Pieces</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-left font-medium">Where</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr
                  key={row.item.item_code}
                  className={cn(
                    'align-top transition-colors hover:bg-muted/40',
                    row.pcs === null && 'bg-amber-50/50 dark:bg-amber-500/5',
                  )}
                >
                  <td className="max-w-[18rem] px-3 py-2">
                    <p className="truncate font-medium" title={row.item.item_name}>
                      {row.item.item_name || row.item.item_code}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{row.item.item_code}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.item.sub_group}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {row.pcs === null ? (
                      <span
                        className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"
                        title={describeConversion(row.item)}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />—
                      </span>
                    ) : (
                      <p className="font-semibold tabular-nums">{formatQty(row.pcs)}</p>
                    )}
                    {row.item.conversion !== 'pieces' && (
                      <p
                        className="text-xs tabular-nums text-muted-foreground"
                        title={describeConversion(row.item)}
                      >
                        {formatQty(row.qty, row.item.uom)}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatInr(row.value)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.lines.map((line) => (
                      <span key={line.code} className="mr-2 inline-block whitespace-nowrap">
                        <span className="font-medium text-foreground">{line.code}</span>{' '}
                        <span className="tabular-nums">
                          {line.pcs_qty === null
                            ? formatQty(line.stock_qty, row.item.uom)
                            : formatQty(line.pcs_qty)}
                        </span>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
