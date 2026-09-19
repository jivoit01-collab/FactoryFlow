/** The Dispatch Sheet — the outward register, one row per invoice dispatched. */

/** Which of the workbook's two sheets a row belongs on. */
export type DispatchSheetStream = 'OIL' | 'WATER';

export interface DispatchSheetRow {
  plan_id: number;
  sap_invoice_doc_entry: number;
  company_code: string;
  company_name: string;
  stream: DispatchSheetStream;
  booking_status: string;

  dispatch_date: string | null;
  invoice_date: string | null;
  party: string;
  location: string;
  state: string;
  invoice_no: string;
  bilty_no: string;
  bilty_date: string | null;
  vehicle_no: string;
  transport_name: string;
  mobile_no: string;
  litres: number | null;
  total_boxes: number | null;
  priority: string;
  kanta_weight: number | null;
  invoice_weight: number | null;
  freight: number | null;
  total_freight: number | null;
  remarks: string;
  eway_bill: string;
}

export interface DispatchSheetMeta {
  total: number;
  date_from: string;
  date_to: string;
  stream: string;
  oil_count: number;
  water_count: number;
  companies: string[];
  /** False when a company's invoices could not be read: those cells are blank. */
  sap_available: boolean;
  sap_error: string;
  fetched_at: string;
}

export interface DispatchSheetResponse {
  data: DispatchSheetRow[];
  meta: DispatchSheetMeta;
}

export interface DispatchSheetParams {
  date_from: string;
  date_to: string;
  /** Left off for both sheets at once; the page asks for one at a time. */
  stream?: 'oil' | 'water' | 'all';
  booking_status?: string;
  search?: string;
  all_companies?: boolean;
}
