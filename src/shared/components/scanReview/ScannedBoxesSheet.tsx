import { PackageCheck, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { ALL_SCAN_SHEET_FILTER, type ScanSheetFilter } from './scanSheetFilter';

export interface ScanSheetOption {
  value: string;
  label: string;
}

export interface ScanSheetStat {
  label: string;
  value: string;
}

export interface ScannedBoxSheetRow {
  key: string | number;
  barcode: ReactNode;
  item: ReactNode;
  batch?: string | null;
  quantity: ReactNode;
  pallet?: ReactNode;
  scannedAt: ReactNode;
  scannedBy?: ReactNode;
  /** Cell for the flow's extra column (e.g. BST's per-box receive verdict). */
  extra?: ReactNode;
}

/**
 * Right-side panel of a load's scanned boxes — one component for every flow
 * (dispatch docking, BST) so the sheets can't drift apart. Purely presentational:
 * the flow owns the filter state, scopes its scans (dropdowns + matchesScanSearch),
 * and maps them to rows/stats/badge; the sheet renders the shared chrome.
 */
export function ScannedBoxesSheet({
  open,
  onOpenChange,
  filter,
  onFilterChange,
  billOptions,
  itemOptions,
  badge,
  stats,
  rows,
  extraColumn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Owned by the caller so a row elsewhere can open the sheet pre-filtered. */
  filter: ScanSheetFilter;
  onFilterChange: (filter: ScanSheetFilter) => void;
  billOptions: ScanSheetOption[];
  itemOptions: ScanSheetOption[];
  /** Colour-coded progress pill under the title. */
  badge?: ReactNode;
  stats: ScanSheetStat[];
  /** Already scoped by the caller — the sheet renders exactly what it's given. */
  rows: ScannedBoxSheetRow[];
  /** Header of an optional flow-specific trailing column (rows supply `extra`). */
  extraColumn?: string;
}) {
  const hasActiveFilter =
    filter.document !== 'ALL' || filter.item !== 'ALL' || filter.query.trim() !== '';
  const showBillSelect = billOptions.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-4 overflow-hidden sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Scanned Boxes
          </SheetTitle>
          {badge ? (
            <SheetDescription asChild>
              <div>{badge}</div>
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="flex shrink-0 flex-col gap-2 rounded-md border bg-muted/20 p-3">
          <div
            className={cn(
              'grid gap-2',
              showBillSelect
                ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]'
                : 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]',
            )}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter.query}
                onChange={(e) => onFilterChange({ ...filter, query: e.target.value })}
                placeholder="Search barcode, pallet, item, batch, scanned by…"
                className="pl-9"
                aria-label="Search scanned boxes"
              />
            </div>
            {showBillSelect ? (
              <Select
                value={filter.document}
                onValueChange={(value) =>
                  onFilterChange({ ...filter, document: value, item: 'ALL' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All bills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All bills</SelectItem>
                  {billOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select
              value={filter.item}
              onValueChange={(value) => onFilterChange({ ...filter, item: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All items</SelectItem>
                {itemOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilter ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange(ALL_SCAN_SHEET_FILTER)}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 rounded-md border bg-muted/20 px-3 py-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          ))}
        </div>

        {rows.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Barcode
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Item
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                    Quantity
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Pallet
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Scanned At
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                    Scanned By
                  </th>
                  {extraColumn ? (
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium">
                      {extraColumn}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm font-semibold">
                      {row.barcode}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">
                      <span className="font-medium">{row.item}</span>
                      {row.batch ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Batch: {row.batch}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-sm tabular-nums">
                      {row.quantity}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">{row.pallet}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">{row.scannedAt}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-sm">{row.scannedBy}</td>
                    {extraColumn ? (
                      <td className="whitespace-nowrap px-3 py-1.5 text-sm">{row.extra}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {hasActiveFilter ? 'No boxes match the current filter.' : 'No boxes scanned yet'}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
