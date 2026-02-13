import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export interface POItem {
  po_item_code: string;
  item_name: string;
  ordered_qty: string;
  received_qty: string;
  remaining_qty: string;
  uom: string;
}

export interface PurchaseOrder {
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  items: POItem[];
}

export interface POReceiptItem {
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number;
  uom: string;
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

  async getVendors(): Promise<Vendor[]> {
    const response = await apiClient.get<Vendor[]>(API_ENDPOINTS.PO.VENDORS);
    return response.data;
  },
};
