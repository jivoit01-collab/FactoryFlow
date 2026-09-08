import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface POItem {
  po_item_code: string;
  item_name: string;
  ordered_qty: string;
  received_qty: string;
  remaining_qty: string;
  uom: string;
  rate: string;
  line_num: number;
}

export interface PurchaseOrder {
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  doc_entry: number;
  branch_id?: number | null;
  vendor_ref?: string;
  doc_date?: string | null;
  items: POItem[];
  /**
   * Whether the gate must hold receipts to 110% of a line's open quantity. SAP only
   * enforces its over-receipt check in some companies, so the server decides rather
   * than the client hard-coding the list. Absent/false means do not cap.
   */
  over_receipt_enforced?: boolean;
}

export interface POReceiptItem {
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number;
  uom: string;
  line_num: number;
}

export interface CreatePOReceiptRequest {
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  items: POReceiptItem[];
}

export interface Vendor {
  vendor_code: string;
  vendor_name: string;
}

export const poApi = {
  async getOpenPOs(supplierCode?: string): Promise<PurchaseOrder[]> {
    const response = await apiClient.get<PurchaseOrder[]>(API_ENDPOINTS.PO.OPEN_POS(supplierCode));
    return response.data;
  },

  async getOpenPOByNumber(poNumber: string): Promise<PurchaseOrder> {
    const response = await apiClient.get<PurchaseOrder>(
      API_ENDPOINTS.PO.OPEN_PO_BY_NUMBER(poNumber),
    );
    return response.data;
  },

  async getVendors(): Promise<Vendor[]> {
    const response = await apiClient.get<Vendor[]>(API_ENDPOINTS.PO.VENDORS);
    return response.data;
  },
};
