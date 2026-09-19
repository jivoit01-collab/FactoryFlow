/** The Dispatch Sheet — the outward register, one row per invoice dispatched. */


/**
 * Where the truck itself has got to, from booked through the gate and the
 * dock to gone. The same stages the dispatch pipeline board works in.
 */
export type VehicleStage =
  | 'BOOKED'
  | 'EMPTY_IN'
  | 'READY_TO_DOCK'
  | 'DOCKED'
  | 'PHOTO_ATTACHED'
  | 'READY_FOR_GATEPASS'
  | 'GATEPASS_PRINTED'
  | 'PRINT_COMMITTED'
  | 'DISPATCHED'
  | 'REJECTED';

export interface DispatchSheetRow {
  plan_id: number;
  sap_invoice_doc_entry: number;
  company_code: string;
  company_name: string;
  booking_status: string;
  vehicle_stage: VehicleStage;
  vehicle_stage_label: string;

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
  /** How many lines each company has, so a tab can be labelled unopened. */
  counts_by_company: Record<string, number>;
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
  booking_status?: string;
  search?: string;
  all_companies?: boolean;
}
