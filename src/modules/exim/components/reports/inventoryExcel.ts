/**
 * Warehouse Inventory as a spreadsheet: the selected warehouses' categories,
 * each warehouse's total, and the items of the warehouse that is open. Litres
 * throughout; a negative figure is SAP's own and is kept. Plain: this app ships
 * the unstyled spreadsheet library.
 */
import * as XLSX from 'xlsx';

import type { InventoryItem, InventoryWarehouse } from '../../types';
import { todayISO } from '../../utils';

function sheetOf(data: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      40,
      Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  return sheet;
}

const whole = (litres: number) => Math.round(litres);

export function exportWarehouseInventory(
  warehouses: InventoryWarehouse[],
  open?: { warehouse: string; items: InventoryItem[] },
) {
  const total = warehouses.reduce((sum, w) => sum + w.litres, 0);

  const categories: Record<string, unknown>[] = warehouses.length
    ? [
        ...warehouses.flatMap((w) =>
          w.categories.map((c) => ({
            Warehouse: w.warehouse,
            'Warehouse name': w.warehouse_name,
            Kind: c.kind,
            Category: c.category,
            Litres: whole(c.litres),
            Items: c.items,
            'Items below zero': c.negative_items || '',
          })),
        ),
        { Warehouse: 'Total', Litres: whole(total) },
      ]
    : [{ Message: 'No warehouse selected' }];

  const totals: Record<string, unknown>[] = warehouses.length
    ? [
        ...warehouses.map((w) => ({
          Warehouse: w.warehouse,
          'Warehouse name': w.warehouse_name,
          Holds: w.kinds.join(' and '),
          Litres: whole(w.litres),
          'Share (%)': total > 0 ? Math.round((w.litres / total) * 1000) / 10 : '',
          'Items below zero': w.negative_items || '',
        })),
        { Warehouse: 'Total', Litres: whole(total) },
      ]
    : [{ Message: 'No warehouse selected' }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheetOf(totals), 'Warehouses');
  XLSX.utils.book_append_sheet(book, sheetOf(categories), 'By category');
  if (open) {
    const items: Record<string, unknown>[] = open.items.length
      ? open.items.map((item) => ({
          'Item code': item.item_code,
          Item: item.item_name,
          Kind: item.kind,
          Category: item.category,
          'On hand': item.on_hand,
          Litres: item.litres,
          'Below zero': item.litres < 0 ? 'Yes' : '',
        }))
      : [{ Message: 'No items' }];
    XLSX.utils.book_append_sheet(book, sheetOf(items), `Items ${open.warehouse}`.slice(0, 31));
  }
  XLSX.writeFile(book, `warehouse-inventory-${todayISO()}.xlsx`);
}
