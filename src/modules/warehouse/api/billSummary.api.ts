import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type BillSummaryStatus = 'GENERATED' | 'PICKED' | 'CANCELLED';
export type BillSummarySapStatus = 'NOT_POSTED' | 'POSTED' | 'FAILED';

/** One line of the bill, as the lookup returns it before anything is saved. */
export interface BillLookupLine {
  sap_line_num: number;
  item_code: string;
  item_name: string;
  uom: string;
  warehouse_code: string;
  invoice_qty: string;
  pcs_per_box: string;
  boxes: string;
  litres: string;
}

/**
 * What the app could work out about a bill, and what it still needs.
 *
 * `missing` names the fields the user has to supply — in practice the bilty,
 * which is raised after the truck is loaded and so is not yet known when the
 * sheet is produced.
 */
export interface BillLookup {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  customer_code: string;
  customer_name: string;
  warehouse_codes: string[];
  has_plan: boolean;
  prefill: {
    dispatch_date: string | null;
    bilty_no: string;
    bilty_date: string | null;
    transporter_name: string;
    vehicle_no: string;
    driver_name: string;
    driver_mobile: string;
  };
  missing: string[];
  existing_summary: string;
  existing_summary_id: number | null;
  lines: BillLookupLine[];
}

export interface BillSummaryLine {
  id: number;
  sap_line_num: number;
  item_code: string;
  item_name: string;
  uom: string;
  warehouse_code: string;
  invoice_qty: string;
  pcs_per_box: string;
  /** FULL boxes, SAP's split — not quantity/pieces-per-box. */
  boxes: string;
  loose_qty: string;
  litres: string;
  gross_weight: string;
  dispatch_qty: string;
  is_short: boolean;
}

export interface BillSummaryTotals {
  lines: number;
  boxes: string;
  litres: string;
  invoice_qty: string;
  dispatch_qty: string;
  loose_qty: string;
  gross_weight: string;
}

export interface BillSummary {
  id: number;
  entry_no: string;
  company: number;
  company_code: string;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  customer_code: string;
  customer_name: string;
  delivery_address: string;
  invoice_date: string | null;
  bill_amount: string;
  branch_name: string;
  branch_gstin: string;
  warehouse_codes: string;
  dispatch_date: string;
  bilty_no: string;
  bilty_date: string | null;
  transporter_name: string;
  vehicle_no: string;
  driver_name: string;
  driver_mobile: string;
  status: BillSummaryStatus;
  sap_status: BillSummarySapStatus;
  sap_error: string;
  sap_posted_at: string | null;
  issued_by_name: string;
  picked_by_name: string;
  issued_at: string;
  picked_at: string | null;
  remarks: string;
  cancel_reason: string;
  totals: BillSummaryTotals;
}

export interface BillSummaryDetail extends BillSummary {
  lines: BillSummaryLine[];
}

export interface BillSummaryListParams {
  status?: BillSummaryStatus;
  sap_status?: BillSummarySapStatus;
  sap_invoice_doc_num?: string;
  date_from?: string;
  date_to?: string;
}

export interface GenerateBillSummaryPayload {
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num?: string;
  dispatch_date: string;
  bilty_no: string;
  bilty_date?: string | null;
  transporter_name?: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_mobile?: string;
  remarks?: string;
  /** Only the lines going short; the rest default to the full billed quantity. */
  lines?: { sap_line_num: number; dispatch_qty: string }[];
}

export const billSummaryApi = {
  async lookup(billNumber: string): Promise<BillLookup> {
    const { data } = await apiClient.get<BillLookup>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARY_LOOKUP,
      { params: { bill_number: billNumber } },
    );
    return data;
  },

  async list(params?: BillSummaryListParams): Promise<BillSummary[]> {
    const { data } = await apiClient.get<BillSummary[]>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARIES,
      { params },
    );
    return data;
  },

  async detail(id: number): Promise<BillSummaryDetail> {
    const { data } = await apiClient.get<BillSummaryDetail>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARY_DETAIL(id),
    );
    return data;
  },

  async generate(payload: GenerateBillSummaryPayload): Promise<BillSummaryDetail> {
    const { data } = await apiClient.post<BillSummaryDetail>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARIES,
      payload,
    );
    return data;
  },

  async markPicked(id: number): Promise<BillSummaryDetail> {
    const { data } = await apiClient.post<BillSummaryDetail>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARY_PICK(id),
      {},
    );
    return data;
  },

  /** Retry the SAP posting for a sheet SAP refused. */
  async postToSap(id: number): Promise<BillSummaryDetail> {
    const { data } = await apiClient.post<BillSummaryDetail>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARY_STAMP_SAP(id),
      {},
    );
    return data;
  },

  async cancel(id: number, reason: string): Promise<BillSummaryDetail> {
    const { data } = await apiClient.post<BillSummaryDetail>(
      API_ENDPOINTS.DISPATCH.BILL_SUMMARY_CANCEL(id),
      { reason },
    );
    return data;
  },
};
