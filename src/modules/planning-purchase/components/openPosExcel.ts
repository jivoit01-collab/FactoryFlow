/**
 * The open PO lines the filters leave, in the order on screen, as a
 * spreadsheet. Plain: this app ships the unstyled spreadsheet library.
 */
import * as XLSX from 'xlsx';

import type { OpenPoLine } from '../types';

/** `2026-09-24` reads `24-09-2026`, as the rest of the app writes a day. */
function day(iso: string | null): string {
  return iso ? iso.slice(0, 10).split('-').reverse().join('-') : '';
}

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${date}`;
}

function rowOf(line: OpenPoLine) {
  return {
    'PO number': line.po_number,
    'PO date': day(line.po_date),
    'Delivery date': day(line.ship_date ?? line.due_date),
    'Vendor code': line.vendor_code,
    Vendor: line.vendor_name,
    'Vendor ref': line.vendor_ref,
    'Item code': line.item_code,
    Item: line.item_name,
    'Item group': line.item_group,
    Warehouse: line.warehouse,
    Unit: line.unit,
    Ordered: line.ordered,
    Received: line.received,
    Open: line.open_qty,
    Price: line.price,
    Currency: line.currency,
    'Open value (₹)': line.open_value,
    'Days open': line.days_open ?? '',
    'Days overdue': line.overdue_days || '',
    'Raised by': line.raised_by,
  };
}

export function exportOpenPos(lines: OpenPoLine[], companyCode?: string) {
  const data: Record<string, unknown>[] = lines.length
    ? lines.map(rowOf)
    : [{ Message: 'No open PO line matches' }];
  const sheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      40,
      Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Open POs');
  const company = companyCode ? `${companyCode.toLowerCase()}-` : '';
  XLSX.writeFile(book, `open-pos-${company}${today()}.xlsx`);
}
