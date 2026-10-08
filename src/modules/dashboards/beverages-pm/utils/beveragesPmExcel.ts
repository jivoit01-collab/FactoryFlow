/**
 * Beverages PM Stock as a spreadsheet: the items the page is showing, each
 * store, each family, and the items SAP gives no piece unit. Plain: this app
 * ships the unstyled spreadsheet library.
 */
import * as XLSX from 'xlsx';

import type { PiecesResponse } from '../types';
import type { PiecesRow } from './beveragesPm';

function sheetOf(data: Record<string, unknown>[]) {
  const rows = data.length ? data : [{ Message: 'Nothing to show' }];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const keys = Object.keys(rows[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      48,
      Math.max(key.length, ...rows.map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  return sheet;
}

const whole = (value: number) => Math.round(value);
const rupees = (value: number) => Math.round(value * 100) / 100;

export function exportBeveragesPmStock(stock: PiecesResponse, rows: PiecesRow[], stamp: string) {
  const stores = stock.warehouses.map((warehouse) => warehouse.code);

  const items = rows.map((row) => {
    const record: Record<string, unknown> = {
      'Item code': row.item.item_code,
      'Item name': row.item.item_name,
      Family: row.item.sub_group,
      Pieces: row.pcs === null ? '' : whole(row.pcs),
      'SAP qty': row.qty,
      'SAP unit': row.item.uom,
      'Pcs per unit': row.item.pieces_per_uom ?? '',
      Conversion:
        row.item.conversion === 'pieces'
          ? 'Stocked in pieces'
          : row.item.conversion === 'uom_group'
            ? 'SAP UoM group'
            : 'No piece unit',
      'Value (INR)': rupees(row.value),
    };
    for (const code of stores) {
      const line = row.lines.find((entry) => entry.code === code);
      record[`${code} pcs`] = line?.pcs_qty == null ? '' : whole(line.pcs_qty);
    }
    return record;
  });

  const storeSheet = stock.warehouses.map((warehouse) => ({
    Warehouse: warehouse.code,
    Name: warehouse.name,
    Inactive: warehouse.inactive ? 'Yes' : '',
    Pieces: whole(warehouse.pcs_qty),
    'Share (%)': warehouse.share_pct,
    Items: warehouse.item_count,
    'Items not in pieces': warehouse.unconverted_item_count || '',
    'Value (INR)': rupees(warehouse.stock_value),
  }));

  const familySheet = stock.sub_groups.map((family) => ({
    Family: family.sub_group,
    Pieces: whole(family.pcs_qty),
    'Share (%)': family.share_pct,
    Items: family.item_count,
    'Items not in pieces': family.unconverted_item_count || '',
    'Value (INR)': rupees(family.stock_value),
  }));

  const unconverted = stock.items
    .filter((item) => item.pcs_qty === null)
    .map((item) => ({
      'Item code': item.item_code,
      'Item name': item.item_name,
      Family: item.sub_group,
      'SAP qty': item.stock_qty,
      'SAP unit': item.uom,
      'Value (INR)': rupees(item.stock_value),
    }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheetOf(items), 'Items');
  XLSX.utils.book_append_sheet(book, sheetOf(storeSheet), 'Warehouses');
  XLSX.utils.book_append_sheet(book, sheetOf(familySheet), 'Families');
  XLSX.utils.book_append_sheet(book, sheetOf(unconverted), 'Not in pieces');
  XLSX.writeFile(book, `beverages-pm-stock-${stamp}.xlsx`);
}
