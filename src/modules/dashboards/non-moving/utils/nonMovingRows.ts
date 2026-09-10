import type { NonMovingFilters, NonMovingItem, NonMovingRow, NonMovingSortCol } from '../types';
import { getMovementStatus, type MovementStatus } from './movementStatus';

/** Filters applied on the client — everything the report call does not carry. */
export interface NonMovingRowFilters {
  age?: number;
  warehouse?: string[];
  sub_group?: string[];
  status?: MovementStatus[];
  search?: string;
}

export interface NonMovingTotals {
  item_count: number;
  total_quantity: number;
  total_value: number;
}

export type NonMovingStatusTotals = Record<MovementStatus, NonMovingTotals>;

function matchesSearch(item: NonMovingItem, term: string): boolean {
  return (
    item.item_code.toLowerCase().includes(term) ||
    item.item_name.toLowerCase().includes(term) ||
    item.warehouse.toLowerCase().includes(term) ||
    item.branch.toLowerCase().includes(term)
  );
}

/**
 * Narrows the report rows to what the filter bar asks for.
 *
 * `status` is deliberately excluded here and applied to the *folded* lines
 * instead: a status read off a single warehouse row would disagree with the
 * status shown on the line the user is looking at.
 */
export function filterNonMovingItems(
  items: NonMovingItem[],
  filters: NonMovingRowFilters,
): NonMovingItem[] {
  const term = filters.search?.trim().toLowerCase();
  const warehouses = filters.warehouse?.length ? new Set(filters.warehouse) : null;
  const subGroups = filters.sub_group?.length ? new Set(filters.sub_group) : null;
  const age = filters.age ?? 0;

  return items.filter((item) => {
    if (age > 0 && item.days_since_last_movement <= age) return false;
    if (warehouses && !warehouses.has(item.warehouse)) return false;
    if (subGroups && !subGroups.has(item.sub_group)) return false;
    if (term && !matchesSearch(item, term)) return false;
    return true;
  });
}

export function filterRowsByStatus(rows: NonMovingRow[], status?: MovementStatus[]): NonMovingRow[] {
  if (!status?.length) return rows;
  const wanted = new Set(status);
  return rows.filter((row) => wanted.has(getMovementStatus(row.days_since_last_movement)));
}

export function sortNonMovingRows(
  rows: NonMovingRow[],
  col: NonMovingSortCol,
  dir: 'asc' | 'desc',
): NonMovingRow[] {
  const sign = dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const aValue = a[col];
    const bValue = b[col];
    const comparison =
      typeof aValue === 'string' || typeof bValue === 'string'
        ? String(aValue ?? '').localeCompare(String(bValue ?? ''))
        : Number(aValue ?? 0) - Number(bValue ?? 0);

    // Ties fall back to item code so paging stays stable between renders.
    return comparison !== 0 ? comparison * sign : a.item_code.localeCompare(b.item_code);
  });
}

export function totalsFor(rows: NonMovingRow[]): NonMovingTotals {
  return {
    item_count: rows.length,
    total_quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
    total_value: rows.reduce((sum, row) => sum + row.value, 0),
  };
}

/** One bucket per movement status, for the meta cards. */
export function statusTotals(rows: NonMovingRow[]): NonMovingStatusTotals {
  const buckets: NonMovingStatusTotals = {
    recent: { item_count: 0, total_quantity: 0, total_value: 0 },
    'slow-moving': { item_count: 0, total_quantity: 0, total_value: 0 },
    'non-moving': { item_count: 0, total_quantity: 0, total_value: 0 },
  };

  for (const row of rows) {
    const bucket = buckets[getMovementStatus(row.days_since_last_movement)];
    bucket.item_count += 1;
    bucket.total_quantity += row.quantity;
    bucket.total_value += row.value;
  }

  return buckets;
}

/** The warehouse codes present in the report, for the warehouse filter. */
export function warehouseOptions(items: NonMovingItem[]): string[] {
  return [...new Set(items.map((item) => item.warehouse).filter(Boolean))].sort();
}

export function subGroupOptions(items: NonMovingItem[]): string[] {
  return [...new Set(items.map((item) => item.sub_group).filter(Boolean))].sort();
}

/** Every warehouse row behind one folded line, worst-idle first. */
export function warehouseRowsForItem(items: NonMovingItem[], row: NonMovingRow): NonMovingItem[] {
  return items
    .filter((item) => item.item_code === row.item_code && item.branch === row.branch)
    .sort((a, b) => b.days_since_last_movement - a.days_since_last_movement);
}

/** Client-side paging — the report endpoint answers in one unpaginated shot. */
export function pageOf<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function totalPagesOf(rowCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(rowCount / pageSize));
}

/** Filters carried by the filter bar, as the row filters expect them. */
export function rowFiltersFrom(filters: NonMovingFilters): NonMovingRowFilters {
  return {
    age: filters.age,
    warehouse: filters.warehouse,
    sub_group: filters.sub_group,
    status: filters.status,
    search: filters.search,
  };
}
