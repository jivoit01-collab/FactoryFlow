import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/** Why a line did not go. Reported, not enforced — all of them end in one document. */
export type ShortDispatchReason = 'SHORT' | 'NOT_LOADED' | 'DAMAGED' | 'CUSTOMER_REFUSED' | 'OTHER';

/** One line of the invoice being corrected, as the form needs it. */
export interface ShortDispatchInvoiceLine {
  line_num: number;
  item_code: string;
  item_name: string;
  uom: string;
  /** What the bill charged for. */
  quantity: number;
  rate: number;
  tax_code: string;
  /** The floor this line was billed out of (INV1.WhsCode). */
  warehouse_code: string;
  /**
   * The batch SAP issued on this line. Shown because the pallet on the floor
   * still carries it — the posted return has to mint a different one.
   */
  original_batch_number: string;
  /** How much an earlier short dispatch against this bill already put back. */
  already_short: number;
  /** `quantity - already_short` — the cap on this line. */
  remaining_quantity: number;
}

/** An earlier short dispatch against the same bill. Context, not a block. */
export interface ShortDispatchInvoiceExistingEntry {
  id: number;
  entry_no: string;
  sap_return_doc_num: string;
  created_at: string;
}

export interface ShortDispatchInvoiceLookup {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  card_code: string;
  card_name: string;
  /** The floor most of the bill was picked from — what the form preselects. */
  default_warehouse_code: string;
  lines: ShortDispatchInvoiceLine[];
  existing_entries: ShortDispatchInvoiceExistingEntry[];
}

export interface ShortDispatchWarehouse {
  warehouse_code: string;
  warehouse_name: string;
}

export interface ShortDispatchListItem {
  id: number;
  entry_no: string;
  company_code: string;
  company_name: string;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  customer_code: string;
  customer_name: string;
  /** Where the stock went back in. */
  warehouse_code: string;
  sap_return_doc_entry: number | null;
  sap_return_doc_num: string;
  posted_at: string | null;
  posted_by_name: string;
  line_count: number;
  total_short_quantity: string;
  created_at: string;
}

export interface ShortDispatchLine {
  id: number;
  source_line_num: number | null;
  item_code: string;
  item_name: string;
  uom: string;
  invoice_quantity: string;
  short_quantity: string;
  unit_price: string;
  tax_code: string;
  source_warehouse_code: string;
  original_batch_number: string;
  reason: ShortDispatchReason;
  reason_display: string;
  remarks: string;
}

export interface ShortDispatchDetail extends ShortDispatchListItem {
  remarks: string;
  lines: ShortDispatchLine[];
}

/**
 * The single form.
 *
 * Only the line number, the quantity and the reason are sent: everything else
 * about a line is read off the invoice server-side, so a stale form cannot put an
 * item on a return that was never sold. A 201 means SAP already holds the
 * document — there is no draft, and a refusal leaves no record at all.
 */
export interface CreateShortDispatchPayload {
  invoice_number: string;
  warehouse_code: string;
  lines: Array<{
    source_line_num: number;
    short_quantity: number | string;
    reason?: ShortDispatchReason;
    remarks?: string;
  }>;
  remarks?: string;
}

/** One line of SAP's own Return layout. Amounts are strings — floats round money. */
export interface ShortDispatchPrintLine {
  line_no: number;
  item_code: string;
  description: string;
  uom: string;
  quantity: string;
  price: string;
  stock_quantity: string;
  total: string;
  warehouse_code: string;
}

/** The posted A/R Return as SAP holds it, for the printed Return Note. */
export interface ShortDispatchPrintPayload {
  short_dispatch_id: number;
  entry_no: string;
  invoice_doc_num: string;
  doc_entry: number;
  doc_num: string;
  doc_date: string;
  doc_time: string;
  due_date: string;
  customer_code: string;
  customer_name: string;
  address_lines: string[];
  vat_number: string;
  currency: string;
  doc_total: string;
  sales_employee: string;
  payment_terms: string;
  comments: string;
  cancelled: boolean;
  branch_name: string;
  lines: ShortDispatchPrintLine[];
}

export const shortDispatchApi = {
  async list(params?: {
    search?: string;
    from_date?: string;
    to_date?: string;
    all_companies?: boolean;
  }): Promise<ShortDispatchListItem[]> {
    const response = await apiClient.get<ShortDispatchListItem[]>(
      API_ENDPOINTS.SHORT_DISPATCH.LIST,
      { params },
    );
    return response.data;
  },

  async get(id: number): Promise<ShortDispatchDetail> {
    const response = await apiClient.get<ShortDispatchDetail>(
      API_ENDPOINTS.SHORT_DISPATCH.BY_ID(id),
    );
    return response.data;
  },

  /** The bill to correct, with its batches and what is left on each line. */
  async lookupInvoice(invoiceNumber: string): Promise<ShortDispatchInvoiceLookup> {
    const response = await apiClient.get<ShortDispatchInvoiceLookup>(
      API_ENDPOINTS.SHORT_DISPATCH.INVOICE,
      { params: { invoice_number: invoiceNumber } },
    );
    return response.data;
  },

  /** Every active warehouse — short stock goes back where it was billed from. */
  async listWarehouses(): Promise<ShortDispatchWarehouse[]> {
    const response = await apiClient.get<ShortDispatchWarehouse[]>(
      API_ENDPOINTS.SHORT_DISPATCH.WAREHOUSES,
    );
    return response.data;
  },

  /** Records the shortfall *and* posts the SAP Return, in one call. */
  async create(payload: CreateShortDispatchPayload): Promise<ShortDispatchDetail> {
    const response = await apiClient.post<ShortDispatchDetail>(
      API_ENDPOINTS.SHORT_DISPATCH.CREATE,
      payload,
    );
    return response.data;
  },

  async getPrint(id: number): Promise<ShortDispatchPrintPayload> {
    const response = await apiClient.get<ShortDispatchPrintPayload>(
      API_ENDPOINTS.SHORT_DISPATCH.PRINT(id),
    );
    return response.data;
  },
};
