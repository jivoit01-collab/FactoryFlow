/**
 * SAP's open purchase orders, line by line (`GET /planning-purchase/open-pos/`).
 *
 * A plain dict on the server, so every figure arrives as a NUMBER, not the
 * decimal strings the rest of this module's API sends. Dates are `YYYY-MM-DD`.
 */

export interface OpenPoLine {
  doc_entry: number;
  po_number: string;
  po_date: string | null;
  due_date: string | null;
  /** The line's own delivery date; overdue is reckoned from it, else the PO's due date. */
  ship_date: string | null;
  vendor_code: string;
  vendor_name: string;
  /** The vendor's reference on the PO (SAP's NumAtCard). */
  vendor_ref: string;
  /** The SAP user who raised the PO. */
  raised_by: string;
  line: number;
  item_code: string;
  item_name: string;
  item_group: string;
  unit: string;
  warehouse: string;
  ordered: number;
  received: number;
  open_qty: number;
  /** In the line's own currency. */
  price: number;
  currency: string;
  /** In rupees: what is still to come at the line's rupee rate. */
  open_value: number;
  days_open: number | null;
  /** Days past the ship (or due) date; 0 when not late. */
  overdue_days: number;
}

export interface OpenPoTotals {
  lines: number;
  orders: number;
  vendors: number;
  open_value: number;
  overdue_lines: number;
}

export interface OpenPoResponse {
  /** When SAP was read: the server keeps a read for two minutes. */
  read_at: string;
  rows: OpenPoLine[];
  totals: OpenPoTotals;
  /** The filter lists, from the rows. */
  raised_by: string[];
  item_groups: string[];
  warehouses: string[];
}
