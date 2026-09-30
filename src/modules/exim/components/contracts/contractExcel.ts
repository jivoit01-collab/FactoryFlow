/**
 * The domestic contract register as a spreadsheet: the contracts the filters
 * leave, in the order on screen, a row each. Plain: this app ships the
 * unstyled spreadsheet library.
 */
import * as XLSX from 'xlsx';

import type { OilContract } from '../../types';
import { todayISO } from '../../utils';
import { leavesOutFreight, STAGE_LABEL, TERMS_LABEL, unitLabel } from './contractFormat';

function rowOf(c: OilContract) {
  return {
    'PO number': c.po_number,
    'PO date': c.po_date ? c.po_date.slice(0, 10).split('-').reverse().join('-') : '',
    'Vendor code': c.vendor_code,
    Vendor: c.vendor_name,
    'Oil code': c.item_code,
    Oil: c.item_name,
    Unit: unitLabel(c.unit),
    Quantity: c.quantity,
    'Rate (₹)': c.rate,
    'Value (₹)': c.value,
    Received: c.received,
    'Trucks received': c.trucks_received,
    Loaded: c.loaded,
    'At the gate': c.at_gate,
    'Trucks at the gate': c.trucks_at_gate,
    'To come': c.to_come,
    Terms: TERMS_LABEL[c.terms.delivery_terms],
    'Freight (₹/MT)': c.terms.freight_per_mt ?? '',
    'Brokerage (₹/MT)': c.terms.brokerage_per_mt ?? '',
    'Shortage deduction (₹)': c.deduction_amount,
    'Landed (₹/MT)': c.landed_per_mt ?? '',
    'Landed (₹/L)': c.landed_per_litre ?? '',
    'Landed cost leaves out freight': leavesOutFreight(c) ? 'Yes' : '',
    Stage: STAGE_LABEL[c.stage],
  };
}

/** `scope` names the file: `2026-27` or `open`. */
export function exportContracts(rows: OilContract[], scope: string) {
  const data: Record<string, unknown>[] = rows.length
    ? rows.map(rowOf)
    : [{ Message: 'No contract matches' }];
  const sheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      40,
      Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Domestic contracts');
  XLSX.writeFile(book, `domestic-contracts-${scope}-${todayISO()}.xlsx`);
}
