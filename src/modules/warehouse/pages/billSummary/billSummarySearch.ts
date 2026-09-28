/**
 * What the bill summary list's search box matches.
 *
 * A sheet is chased with whatever the caller has in hand: the bill number off
 * the invoice, the sheet's own number, the party, the truck at the gate, the
 * transporter or the bilty. Searched in the browser over the rows already on
 * screen, which is both feeds — the app's sheets and the SAP-stamped
 * dispatches — so a number finds its row whichever flow produced it.
 *
 * Kept out of the page so fast refresh keeps working, and so the searchable
 * fields are one readable list.
 */

import type { BillSummary } from '../../api';

export function matchesBillSummary(row: BillSummary, needle: string): boolean {
  if (!needle) return true;
  return [
    row.entry_no,
    row.sap_invoice_doc_num,
    row.customer_code,
    row.customer_name,
    row.vehicle_no,
    row.transporter_name,
    row.bilty_no,
    row.driver_name,
    row.warehouse_codes,
  ].some((part) => part != null && String(part).toLowerCase().includes(needle));
}
