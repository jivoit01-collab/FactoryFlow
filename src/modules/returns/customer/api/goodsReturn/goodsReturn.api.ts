import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/**
 * An item this customer has actually been invoiced.
 *
 * The picker offers their purchase history rather than the item master: an item
 * they were never billed for has no tax code, and SAP refuses a return line
 * without one, so anything outside this list would fail at posting.
 */
export interface ReturnableItem {
  item_code: string;
  item_name: string;
  uom: string;
  tax_code: string;
  last_price: number;
  last_invoice_num: string;
  last_billed: string | null;
}

export type GoodsReturnBasis = 'INVOICE' | 'DEBIT_NOTE' | 'LETTER_PAD';
export type GoodsReturnStatus =
  | 'DRAFT'
  | 'AWAITING_ARRIVAL'
  | 'ARRIVED'
  // Goods in and the return closed, but no SAP document — only invoice-basis
  // returns post today.
  | 'RECEIVED'
  // One A/R Return is posted per source invoice, and SAP can take some and
  // refuse others. Receiving again retries only the refused ones.
  | 'PARTIALLY_POSTED'
  | 'POSTED'
  | 'CANCELLED';
export type GoodsReturnItemCondition = 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'OTHER';
export type GoodsReturnApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type GoodsReturnAttachmentType = 'INVOICE_COPY' | 'DEBIT_NOTE' | 'LETTER_PAD' | 'OTHER';

export interface GoodsReturnListItem {
  id: number;
  entry_no: string;
  basis: GoodsReturnBasis;
  status: GoodsReturnStatus;
  customer_code: string;
  customer_name: string;
  vehicle_no: string;
  driver_name: string;
  company_code: string;
  company_name: string;
  expected_arrival_at: string | null;
  gated_in_at: string | null;
  requires_approval: boolean;
  approval_status: GoodsReturnApprovalStatus;
  line_count: number;
  /** The bills this return is booked against — one A/R Return each. */
  invoice_doc_nums: string[];
  /** Null while the clerk is still filling the return in. */
  submitted_at: string | null;
  created_at: string;
}

/** A return the gate has already marked in, for the gate's own history tab. */
export interface GoodsReturnGateHistoryItem extends GoodsReturnListItem {
  gated_in_by_name: string;
}

/** Window for the gate history tab. Omitted dates fall back to the last week. */
export interface GoodsReturnGateHistoryParams {
  from_date?: string;
  to_date?: string;
  search?: string;
}

/** One source invoice, and the A/R Return posted for it — one per invoice. */
export interface GoodsReturnInvoiceRef {
  id: number;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  /** Null until this invoice's own return is in SAP. */
  sap_gr_doc_entry: number | null;
  sap_gr_doc_num: string;
  sap_return_warehouse: string;
  posted_at: string | null;
  /** Why SAP refused this invoice, when it did. Blank otherwise. */
  sap_post_error: string;
}

export interface GoodsReturnItem {
  id: number;
  invoice_ref: number | null;
  source_line_num: number | null;
  item_code: string;
  item_name: string;
  uom: string;
  invoice_quantity: string;
  return_quantity: string;
  reason: string;
  condition: GoodsReturnItemCondition;
  remarks: string;
}

export interface GoodsReturnAttachment {
  id: number;
  attachment_type: GoodsReturnAttachmentType;
  file_url: string;
  original_filename: string;
  notes: string;
  uploaded_at: string;
}

export interface GoodsReturnInvoicePreviewLine {
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
  rate: number;
}

export interface GoodsReturnInvoicePreview {
  invoice_ref_id: number;
  doc_entry: number;
  doc_num: string;
  card_code: string;
  card_name: string;
  items: GoodsReturnInvoicePreviewLine[];
}

export interface GoodsReturnDetail {
  id: number;
  entry_no: string;
  basis: GoodsReturnBasis;
  status: GoodsReturnStatus;
  customer_code: string;
  customer_name: string;
  vehicle: number | null;
  vehicle_no: string;
  driver: number | null;
  driver_name: string;
  company_code: string;
  company_name: string;
  expected_arrival_at: string | null;
  gated_in_at: string | null;
  received_at: string | null;
  requires_approval: boolean;
  approval_status: GoodsReturnApprovalStatus;
  approval_remarks: string;
  approved_at: string | null;
  /** The first of the return's documents — see `sap_gr_doc_nums` for all. */
  sap_gr_doc_num: string;
  /** Every A/R Return this return posted, one per invoice. */
  sap_gr_doc_nums: string[];
  sap_return_warehouse: string;
  remarks: string;
  submitted_at: string | null;
  created_at: string;
  invoice_refs: GoodsReturnInvoiceRef[];
  lines: GoodsReturnItem[];
  attachments: GoodsReturnAttachment[];
  invoice_preview?: GoodsReturnInvoicePreview[];
}

/** The return as it stands after a receive, plus `detail` when SAP refused some
 *  of its invoices (HTTP 207) — the rest posted and are recorded here. */
export type GoodsReturnReceiveResult = GoodsReturnDetail & { detail?: string };

/** One line of SAP's own Return layout. Amounts arrive as strings — JSON floats
 *  would round money. */
export interface GoodsReturnPrintLine {
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
export interface GoodsReturnPrintPayload {
  goods_return_id: number;
  entry_no: string;
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
  lines: GoodsReturnPrintLine[];
}

export interface ReturnWarehouse {
  warehouse_code: string;
  warehouse_name: string;
}

export interface CreateGoodsReturnPayload {
  basis: GoodsReturnBasis;
  /** Required: saving this page puts the return in the gate's arrival queue, and
   *  the gate needs a truck to look for. */
  vehicle_id: number;
  driver_id: number;
  expected_arrival_at?: string | null;
  invoice_numbers?: string[];
  customer_code?: string;
  customer_name?: string;
  remarks?: string;
  requires_approval?: boolean;
}

export interface SaveItemsPayload {
  lines: Array<{
    invoice_ref_id?: number | null;
    source_line_num?: number | null;
    item_code: string;
    item_name?: string;
    uom?: string;
    invoice_quantity?: number | string;
    return_quantity: number | string;
    reason?: string;
    condition?: GoodsReturnItemCondition;
    remarks?: string;
  }>;
}

/** Corrects the truck on a return that is already in the gate's queue. The
 *  vehicle and driver cannot be cleared (the gate is waiting on them); an
 *  omitted key is left untouched, and `expected_arrival_at: null` clears the
 *  date. Refused once the vehicle is marked in. */
export interface SetVehiclePayload {
  vehicle_id?: number | null;
  driver_id?: number | null;
  expected_arrival_at?: string | null;
}

export interface MarkGoodsReturnInPayload {
  remarks?: string;
  /** Fallback for the returns booked before the vehicle moved to the first page:
   *  the gate supplies the truck it is actually looking at. */
  vehicle_id?: number | null;
  driver_id?: number | null;
}

export interface InvoiceSearchResult {
  doc_entry: number;
  doc_num: string;
  card_code: string;
  card_name: string;
  doc_total: number;
  line_count: number;
  total_quantity: number;
  items: GoodsReturnInvoicePreviewLine[];
}

export const goodsReturnApi = {
  /** Look up a dispatched SAP invoice by number (reuses the dispatch-plans lookup). */
  async searchInvoice(invoiceNumber: string): Promise<InvoiceSearchResult> {
    const response = await apiClient.get<InvoiceSearchResult>(
      API_ENDPOINTS.DISPATCH_PLANS.BILL_BY_NUMBER(invoiceNumber),
    );
    return response.data;
  },

  async list(params?: {
    status?: string;
    basis?: string;
    search?: string;
    approval?: GoodsReturnApprovalStatus;
    all_companies?: boolean;
  }): Promise<GoodsReturnListItem[]> {
    const response = await apiClient.get<GoodsReturnListItem[]>(API_ENDPOINTS.GOODS_RETURN.LIST, {
      params,
    });
    return response.data;
  },

  async get(id: number, withInvoicePreview = false): Promise<GoodsReturnDetail> {
    const response = await apiClient.get<GoodsReturnDetail>(API_ENDPOINTS.GOODS_RETURN.BY_ID(id), {
      params: withInvoicePreview ? { with_invoice_preview: 1 } : undefined,
    });
    return response.data;
  },

  async create(payload: CreateGoodsReturnPayload): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.CREATE,
      payload,
    );
    return response.data;
  },

  async updateHeader(
    id: number,
    payload: { customer_code?: string; customer_name?: string; remarks?: string },
  ): Promise<GoodsReturnDetail> {
    const response = await apiClient.patch<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.BY_ID(id),
      payload,
    );
    return response.data;
  },

  /** Soft delete: the entry is marked CANCELLED and kept for the audit trail.
   *  The backend refuses anything already received at the gate. */
  async cancel(id: number): Promise<GoodsReturnDetail> {
    const response = await apiClient.delete<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.BY_ID(id),
    );
    return response.data;
  },

  async addInvoiceRef(id: number, invoiceNumber: string): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.INVOICE_REFS(id),
      { invoice_number: invoiceNumber },
    );
    return response.data;
  },

  async removeInvoiceRef(id: number, refId: number): Promise<GoodsReturnDetail> {
    const response = await apiClient.delete<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.INVOICE_REF_BY_ID(id, refId),
    );
    return response.data;
  },

  /** Items this return's customer has been invoiced, for the item picker. */
  async returnableItems(
    id: number,
    params?: { search?: string; limit?: number },
  ): Promise<ReturnableItem[]> {
    const res = await apiClient.get<ReturnableItem[]>(
      API_ENDPOINTS.GOODS_RETURN.RETURNABLE_ITEMS(id),
      {
        params: {
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.limit ? { limit: params.limit } : {}),
        },
      },
    );
    return res.data;
  },

  async saveItems(id: number, payload: SaveItemsPayload): Promise<GoodsReturnDetail> {
    const response = await apiClient.put<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.ITEMS(id),
      payload,
    );
    return response.data;
  },

  async setVehicle(id: number, payload: SetVehiclePayload): Promise<GoodsReturnDetail> {
    const response = await apiClient.patch<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.VEHICLE(id),
      payload,
    );
    return response.data;
  },

  async listAttachments(id: number): Promise<GoodsReturnAttachment[]> {
    const response = await apiClient.get<GoodsReturnAttachment[]>(
      API_ENDPOINTS.GOODS_RETURN.ATTACHMENTS(id),
    );
    return response.data;
  },

  async uploadAttachment(
    id: number,
    file: File,
    attachmentType: GoodsReturnAttachmentType,
    notes?: string,
  ): Promise<GoodsReturnAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachment_type', attachmentType);
    if (notes) formData.append('notes', notes);
    const response = await apiClient.post<GoodsReturnAttachment>(
      API_ENDPOINTS.GOODS_RETURN.ATTACHMENTS(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async deleteAttachment(id: number, attachmentId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.GOODS_RETURN.ATTACHMENT_BY_ID(id, attachmentId));
  },

  async submit(id: number): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.SUBMIT(id),
      {},
    );
    return response.data;
  },

  /** SAP's Return Note for one of a return's posted documents.
   *
   *  A return booked against several invoices has a document per invoice, so
   *  `docEntry` says which to print; without it the first is printed, which is
   *  the whole set for a single-invoice return. 404s until the return has posted.
   */
  async getPrint(id: number, docEntry?: number | null): Promise<GoodsReturnPrintPayload> {
    const response = await apiClient.get<GoodsReturnPrintPayload>(
      API_ENDPOINTS.GOODS_RETURN.PRINT(id),
      { params: docEntry ? { doc_entry: docEntry } : undefined },
    );
    return response.data;
  },

  async listReturnWarehouses(): Promise<ReturnWarehouse[]> {
    const response = await apiClient.get<ReturnWarehouse[]>(API_ENDPOINTS.GOODS_RETURN.WAREHOUSES);
    return response.data;
  },

  /** Confirm receipt, posting one A/R Return per invoice.
   *
   *  A run SAP half-accepts comes back 207 with `detail` naming the invoices it
   *  refused — the documents it did accept cannot be withdrawn, so they stand and
   *  the record returned already carries them.
   */
  async receive(id: number, warehouseCode?: string): Promise<GoodsReturnReceiveResult> {
    const response = await apiClient.post<GoodsReturnReceiveResult>(
      API_ENDPOINTS.GOODS_RETURN.RECEIVE(id),
      { warehouse_code: warehouseCode ?? '' },
    );
    return response.data;
  },

  // Gate side
  async listExpected(): Promise<GoodsReturnListItem[]> {
    const response = await apiClient.get<GoodsReturnListItem[]>(
      API_ENDPOINTS.GOODS_RETURN.GATE_EXPECTED,
    );
    return response.data;
  },

  async listGateHistory(
    params: GoodsReturnGateHistoryParams = {},
  ): Promise<GoodsReturnGateHistoryItem[]> {
    const response = await apiClient.get<GoodsReturnGateHistoryItem[]>(
      API_ENDPOINTS.GOODS_RETURN.GATE_HISTORY,
      { params },
    );
    return response.data;
  },

  async markIn(id: number, payload: MarkGoodsReturnInPayload = {}): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.GATE_MARK_IN(id),
      {
        remarks: payload.remarks ?? '',
        ...(payload.vehicle_id ? { vehicle_id: payload.vehicle_id } : {}),
        ...(payload.driver_id ? { driver_id: payload.driver_id } : {}),
      },
    );
    return response.data;
  },

  // Admin approval
  async approve(id: number, remarks?: string): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(API_ENDPOINTS.GOODS_RETURN.APPROVE(id), {
      remarks: remarks ?? '',
    });
    return response.data;
  },

  async reject(id: number, remarks?: string): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(API_ENDPOINTS.GOODS_RETURN.REJECT(id), {
      remarks: remarks ?? '',
    });
    return response.data;
  },
};
