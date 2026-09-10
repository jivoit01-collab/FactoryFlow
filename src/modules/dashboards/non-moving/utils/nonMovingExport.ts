import * as XLSX from 'xlsx';

import type { NonMovingItem, NonMovingRow } from '../types';
import { getMovementStatus, type MovementStatus } from './movementStatus';

const STATUS_LABELS: Record<MovementStatus, string> = {
  recent: 'Recently Moved',
  'slow-moving': 'Slow Moving',
  'non-moving': 'Non Moving',
};

/** The folded, every-warehouse view — the table as it is on screen. */
export const SUMMARY_SHEET_NAME = 'All Warehouses';

/** Excel rejects these in a sheet name, and caps the name at 31 characters. */
const ILLEGAL_SHEET_CHARS = /[\\/?*[\]:]/g;
const MAX_SHEET_NAME = 31;

type ExportRow = Record<string, string | number>;

function statusOf(days: number): string {
  return STATUS_LABELS[getMovementStatus(days)];
}

function summaryRow(row: NonMovingRow): ExportRow {
  return {
    'Item Code': row.item_code,
    'Item Name': row.item_name,
    Branch: row.branch,
    Warehouse: row.warehouses.join(', ') || row.warehouse,
    'Sub Group': row.sub_group,
    Quantity: row.quantity,
    Value: row.value,
    'Days Idle': row.days_since_last_movement,
    'Last Movement': row.last_movement_date ?? '',
    'Consumption %': row.consumption_ratio,
    Status: statusOf(row.days_since_last_movement),
  };
}

function warehouseRow(item: NonMovingItem): ExportRow {
  return {
    'Item Code': item.item_code,
    'Item Name': item.item_name,
    'Sub Group': item.sub_group,
    Quantity: item.quantity,
    Value: item.value,
    'Days Idle': item.days_since_last_movement,
    'Last Movement': item.last_movement_date ?? '',
    'Consumption %': item.consumption_ratio,
    Status: statusOf(item.days_since_last_movement),
  };
}

function sheetFrom(rows: ExportRow[]): XLSX.WorkSheet {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({
      wch:
        Math.max(key.length, ...rows.map((row) => String(row[key] ?? '').length)) + 2,
    }));
  }
  return worksheet;
}

/**
 * A warehouse code Excel will accept, kept unique against the names already
 * used — two codes that only differ past the 31-character cap would otherwise
 * collide and the second sheet would be refused.
 */
export function sheetNameFor(warehouse: string, used: Set<string>): string {
  const base = (warehouse.replace(ILLEGAL_SHEET_CHARS, '-').trim() || 'Warehouse').slice(
    0,
    MAX_SHEET_NAME,
  );

  let name = base;
  let suffix = 2;
  while (used.has(name.toLowerCase())) {
    const tail = ` (${suffix})`;
    name = `${base.slice(0, MAX_SHEET_NAME - tail.length)}${tail}`;
    suffix += 1;
  }

  used.add(name.toLowerCase());
  return name;
}

/** The warehouse rows behind the exported lines, per warehouse, worst idle first. */
export function warehouseSheetRows(
  items: NonMovingItem[],
  rows: NonMovingRow[],
): Map<string, NonMovingItem[]> {
  const exported = new Set(rows.map((row) => `${row.branch}::${row.item_code}`));
  const byWarehouse = new Map<string, NonMovingItem[]>();

  for (const item of items) {
    if (!item.warehouse) continue;
    if (!exported.has(`${item.branch}::${item.item_code}`)) continue;
    const bucket = byWarehouse.get(item.warehouse);
    if (bucket) bucket.push(item);
    else byWarehouse.set(item.warehouse, [item]);
  }

  for (const bucket of byWarehouse.values()) {
    bucket.sort(
      (a, b) =>
        b.days_since_last_movement - a.days_since_last_movement ||
        a.item_code.localeCompare(b.item_code),
    );
  }

  return byWarehouse;
}

interface NonMovingWorkbookInput {
  /** The folded lines, filtered and sorted exactly as the table shows them. */
  rows: NonMovingRow[];
  /** Every (item, warehouse) row behind them. */
  items: NonMovingItem[];
  /** Warehouses the user selected; empty means every warehouse in view. */
  selectedWarehouses?: string[];
}

/**
 * One workbook: the folded table first, then the stock held in each warehouse
 * on its own sheet. A selected warehouse holding none of the exported items
 * gets no sheet rather than an empty one.
 */
export function buildNonMovingWorkbook({
  rows,
  items,
  selectedWarehouses = [],
}: NonMovingWorkbookInput): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFrom(rows.map(summaryRow)), SUMMARY_SHEET_NAME);

  const byWarehouse = warehouseSheetRows(items, rows);
  const order = selectedWarehouses.length
    ? selectedWarehouses.filter((warehouse) => byWarehouse.has(warehouse))
    : [...byWarehouse.keys()].sort();

  const used = new Set([SUMMARY_SHEET_NAME.toLowerCase()]);
  for (const warehouse of order) {
    const warehouseItems = byWarehouse.get(warehouse) ?? [];
    if (warehouseItems.length === 0) continue;
    XLSX.utils.book_append_sheet(
      workbook,
      sheetFrom(warehouseItems.map(warehouseRow)),
      sheetNameFor(warehouse, used),
    );
  }

  return workbook;
}
