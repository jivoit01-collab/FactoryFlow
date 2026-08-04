import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type GoodsReturnBasis = 'INVOICE' | 'DEBIT_NOTE' | 'LETTER_PAD';
export type GoodsReturnStatus =
  | 'DRAFT'
  | 'AWAITING_ARRIVAL'
  | 'ARRIVED'
  | 'POSTED'
  | 'CANCELLED';
export type GoodsReturnItemCondition = 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'OTHER';
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
  line_count: number;
  created_at: string;
}

export interface GoodsReturnInvoiceRef {
  id: number;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
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
  sap_gr_doc_num: string;
  sap_return_warehouse: string;
  remarks: string;
  submitted_at: string | null;
  created_at: string;
  invoice_refs: GoodsReturnInvoiceRef[];
  lines: GoodsReturnItem[];
  attachments: GoodsReturnAttachment[];
  invoice_preview?: GoodsReturnInvoicePreview[];
}

export interface ReturnWarehouse {
  warehouse_code: string;
  warehouse_name: string;
}

export interface CreateGoodsReturnPayload {
  basis: GoodsReturnBasis;
  invoice_numbers?: string[];
  customer_code?: string;
  customer_name?: string;
  remarks?: string;
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

export interface SetVehiclePayload {
  vehicle_id: number;
  driver_id: number;
  expected_arrival_at: string;
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

  async listReturnWarehouses(): Promise<ReturnWarehouse[]> {
    const response = await apiClient.get<ReturnWarehouse[]>(API_ENDPOINTS.GOODS_RETURN.WAREHOUSES);
    return response.data;
  },

  async receive(id: number, warehouseCode?: string): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(
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

  async markIn(id: number, remarks?: string): Promise<GoodsReturnDetail> {
    const response = await apiClient.post<GoodsReturnDetail>(
      API_ENDPOINTS.GOODS_RETURN.GATE_MARK_IN(id),
      { remarks: remarks ?? '' },
    );
    return response.data;
  },
};
