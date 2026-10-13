import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/**
 * Cash sale out: a counter bill leaving with the buyer, on foot or in their own
 * vehicle. No docking, no transporter, no gatepass -- just which bills, who
 * took them, and on what.
 */
export type CashSaleOutStatus = 'OUT' | 'CANCELLED';

export interface CashSaleOutBill {
  id: number;
  sap_doc_entry: number;
  sap_doc_num: number | null;
  doc_date: string | null;
  customer_code: string;
  customer_name: string;
  /** OINV.NumAtCard -- often the actual buyer's name on a counter bill. */
  customer_ref: string;
  doc_total: string | null;
  item_summary: string;
  total_quantity: string | null;
}

export interface CashSaleOut {
  id: number;
  entry_no: string;
  company: number;
  company_code: string;
  company_name: string;
  taken_by_name: string;
  taken_by_mobile: string;
  vehicle_no: string;
  remarks: string;
  out_at: string;
  status: CashSaleOutStatus;
  marked_out_by_name: string;
  cancel_reason: string;
  cancelled_by_name: string;
  cancelled_at: string | null;
  bills: CashSaleOutBill[];
}

/** A cash-sale bill still inside the factory, as SAP holds it. */
export interface CashSalePendingBill {
  company_id: number;
  company_code: string;
  company_name: string;
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  customer_code: string;
  customer_name: string;
  customer_ref: string;
  comments: string;
  doc_total: number | null;
  branch_name: string;
  item_summary: string;
  total_quantity: number;
  line_count: number;
}

export interface CashSalePendingBills {
  date_from: string;
  date_to: string;
  bills: CashSalePendingBill[];
  /** One entry per company whose SAP could not be read; the others still list. */
  errors: { company_code: string; company_name: string; detail: string }[];
  truncated: boolean;
}

export interface CashSaleOutListParams {
  from_date?: string;
  to_date?: string;
}

export interface CashSaleOutCreateRequest {
  company_id: number;
  doc_entries: number[];
  taken_by_name: string;
  taken_by_mobile?: string;
  vehicle_no?: string;
  remarks?: string;
}

function withQuery(url: string, params?: object) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
  });
  const text = query.toString();
  return text ? `${url}?${text}` : url;
}

export const cashSaleOutApi = {
  async list(params?: CashSaleOutListParams): Promise<CashSaleOut[]> {
    const response = await apiClient.get<CashSaleOut[]>(
      withQuery(API_ENDPOINTS.GATE_CORE.CASH_SALE_OUTS, params),
    );
    return response.data;
  },

  async pendingBills(): Promise<CashSalePendingBills> {
    const response = await apiClient.get<CashSalePendingBills>(
      API_ENDPOINTS.GATE_CORE.CASH_SALE_OUT_PENDING_BILLS,
    );
    return response.data;
  },

  async create(data: CashSaleOutCreateRequest): Promise<CashSaleOut> {
    const response = await apiClient.post<CashSaleOut>(
      API_ENDPOINTS.GATE_CORE.CASH_SALE_OUTS,
      data,
    );
    return response.data;
  },

  async cancel(id: number, reason: string): Promise<CashSaleOut> {
    const response = await apiClient.post<CashSaleOut>(
      API_ENDPOINTS.GATE_CORE.CASH_SALE_OUT_CANCEL(id),
      { reason },
    );
    return response.data;
  },
};
