import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { NonMovingItem, NonMovingRow, NonMovingSortCol } from '../types';
import {
  PRODUCTION_AGE_HINT,
  rowAgeClasses,
  wasRestacked,
} from '../utils/movementStatus';
import { NonMovingItemDetailPanel } from './NonMovingItemDetailPanel';
import { NonMovingStatusBadge } from './NonMovingStatusBadge';

interface NonMovingTableProps {
  rows: NonMovingRow[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  sortCol: NonMovingSortCol;
  sortDir: 'asc' | 'desc';
  onSortChange: (col: NonMovingSortCol, dir: 'asc' | 'desc') => void;
  /** Warehouse rows behind a folded line, resolved on expand. */
  warehouseRowsFor: (row: NonMovingRow) => NonMovingItem[];
  onSearchSelect?: (term: string) => void;
}

const COLUMN_COUNT = 10;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

function SortIcon({
  col,
  sortCol,
  sortDir,
}: {
  col: NonMovingSortCol;
  sortCol: NonMovingSortCol;
  sortDir: 'asc' | 'desc';
}) {
  if (sortCol !== col)
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  return sortDir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

export function NonMovingTable({
  rows,
  isLoading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  sortCol,
  sortDir,
  onSortChange,
  warehouseRowsFor,
  onSearchSelect,
}: NonMovingTableProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  function toggleSort(col: NonMovingSortCol) {
    if (sortCol === col) {
      onSortChange(col, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(col, col === 'item_code' || col === 'item_name' ? 'asc' : 'desc');
    }
  }

  function toggleExpandedItem(key: string, canExpand: boolean) {
    if (!canExpand) return;
    setExpandedItem((current) => (current === key ? null : key));
  }

  function sortableHeader(col: NonMovingSortCol, label: string, align: 'left' | 'right' = 'left') {
    return (
      <th
        className={cn(
          'cursor-pointer whitespace-nowrap px-4 py-3 font-medium text-muted-foreground hover:text-foreground',
          align === 'right' ? 'text-right' : 'text-left',
        )}
        onClick={() => toggleSort(col)}
      >
        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </th>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No matching items found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {sortableHeader('item_code', 'Item Code')}
                {sortableHeader('item_name', 'Item Name')}
                {sortableHeader('warehouse', 'Warehouse')}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sub Group</th>
                {sortableHeader('quantity', 'Quantity', 'right')}
                {sortableHeader('value', 'Value', 'right')}
                {sortableHeader('days_since_last_movement', 'Days Idle', 'right')}
                <th
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                  title={PRODUCTION_AGE_HINT}
                >
                  Last Movement
                </th>
                {sortableHeader('consumption_ratio', 'Consumption', 'right')}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = `${row.branch}-${row.item_code}`;
                const canExpand = row.warehouse_count > 1;
                const isExpanded = canExpand && expandedItem === key;

                return (
                  <Fragment key={key}>
                    <tr
                      className={cn(
                        'border-b transition-colors',
                        rowAgeClasses(row.days_since_last_movement),
                        canExpand && 'cursor-pointer',
                      )}
                      onClick={() => toggleExpandedItem(key, canExpand)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleExpandedItem(key, canExpand);
                        }
                      }}
                      tabIndex={canExpand ? 0 : undefined}
                      aria-expanded={canExpand ? isExpanded : undefined}
                    >
                      <td
                        className="cursor-pointer px-4 py-3 font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSearchSelect?.(row.item_code);
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSearchSelect?.(row.item_code);
                          }
                        }}
                      >
                        {row.item_code}
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3 font-medium underline-offset-2 hover:text-primary hover:underline"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSearchSelect?.(firstSearchWord(row.item_name));
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSearchSelect?.(firstSearchWord(row.item_name));
                          }
                        }}
                      >
                        {row.item_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          {canExpand && (
                            <ChevronRight
                              className={cn(
                                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                                isExpanded && 'rotate-90',
                              )}
                            />
                          )}
                          {row.warehouse}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.sub_group}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQuantity(row.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(row.value)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.days_since_last_movement.toLocaleString('en-IN')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {row.last_movement_date ?? '-'}
                        {wasRestacked(row) && (
                          <span
                            className="block text-[11px] italic text-muted-foreground/80"
                            title={PRODUCTION_AGE_HINT}
                          >
                            godown move {row.days_since_warehouse_movement?.toLocaleString('en-IN')}
                            d ago
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.consumption_ratio.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        <NonMovingStatusBadge days={row.days_since_last_movement} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/20">
                        <td colSpan={COLUMN_COUNT} className="px-2 py-1">
                          <NonMovingItemDetailPanel items={warehouseRowsFor(row)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {totalItems.toLocaleString('en-IN')} items &mdash; page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
