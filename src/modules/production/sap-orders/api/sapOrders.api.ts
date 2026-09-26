import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

// Shapes as `factory_app/production_execution/views_sap_orders.py` and
// `sap_client/hana/production_order_reader.py` send them.

export type SapOrderStatus = 'P' | 'R' | 'L' | 'C';

export interface SapOrderSummary {
  doc_entry: number;
  doc_num: number | null;
  item_code: string;
  item_name: string;
  planned_quantity: number;
  completed_quantity: number;
  rejected_quantity: number;
  issued_quantity: number;
  received_quantity: number;
  status: SapOrderStatus;
  status_label: string;
  start_date: string | null;
  due_date: string | null;
  warehouse: string;
  uom: string;
}

export interface SapOrderLine {
  line_num: number;
  item_code: string;
  item_name: string;
  is_resource: boolean;
  planned_quantity: number;
  issued_quantity: number;
  warehouse: string;
  uom: string;
  batch_managed: boolean;
}

export interface SapOrderMovement {
  doc_entry: number;
  doc_num: number | null;
  date: string | null;
  quantity: number;
  comments: string;
}

export interface SapOrderAction {
  id: number;
  action: 'CREATE' | 'RELEASE' | 'CLOSE' | 'ISSUE' | 'RECEIPT';
  action_label: string;
  order_doc_entry: number | null;
  item_code: string;
  quantity: string | null;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  pending_approval_draft: number | null;
  taken_by: string;
  created_at: string;
}

export interface SapOrderDetail extends SapOrderSummary {
  branch_id: number | null;
  lines: SapOrderLine[];
  issues: SapOrderMovement[];
  receipts: SapOrderMovement[];
  actions: SapOrderAction[];
}

export interface SapOrderList {
  count: number;
  results: SapOrderSummary[];
}

export interface SapOrderFilters {
  status?: SapOrderStatus | '';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSapOrderPayload {
  item_code: string;
  planned_quantity: string;
  due_date: string;
  start_date?: string;
  warehouse?: string;
  remarks?: string;
  release?: boolean;
  confirm_repeat?: boolean;
}

export interface IssuePayload {
  lines: { line_num: number; quantity: string; warehouse?: string; batches?: { batch_number: string; quantity: string }[] }[];
  posting_date?: string;
  remarks?: string;
  confirm_repeat?: boolean;
}

export interface ReceiptPayload {
  quantity: string;
  warehouse?: string;
  batch_number?: string;
  posting_date?: string;
  remarks?: string;
  confirm_repeat?: boolean;
}

/** What SAP created: a document, or the draft an approval procedure holds. */
export type SapPostResult =
  | { pending_approval: false; doc_entry: number | null; doc_num: number | string | null }
  | { pending_approval: true; draft_entry: number | null };

export interface BatchOption {
  batch_number: string;
  quantity: number;
  expiry_date?: string | null;
}

function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Partial<T>;
}

const E = API_ENDPOINTS.PRODUCTION_EXECUTION;

/**
 * Writes pass `suppressErrorToast`: a 409 "you just posted this" is answered by
 * a confirmation, not a toast, and `postToSap` shows every other error itself.
 */
const WRITE = { suppressErrorToast: true } as const;

export const sapOrdersApi = {
  list: async (filters: SapOrderFilters): Promise<SapOrderList> => {
    const { data } = await apiClient.get<SapOrderList>(E.SAP_PRODUCTION_ORDERS, { params: compact(filters) });
    return data;
  },

  detail: async (docEntry: number): Promise<SapOrderDetail> => {
    const { data } = await apiClient.get<SapOrderDetail>(E.SAP_PRODUCTION_ORDER(docEntry));
    return data;
  },

  create: async (payload: CreateSapOrderPayload): Promise<{ doc_entry: number | null; doc_num: number | null }> => {
    const { data } = await apiClient.post(E.SAP_PRODUCTION_ORDERS, payload, WRITE);
    return data;
  },

  release: async (docEntry: number): Promise<void> => {
    await apiClient.post(E.SAP_PRODUCTION_ORDER_RELEASE(docEntry), {}, WRITE);
  },

  close: async (docEntry: number): Promise<void> => {
    await apiClient.post(E.SAP_PRODUCTION_ORDER_CLOSE(docEntry), {}, WRITE);
  },

  issue: async (docEntry: number, payload: IssuePayload): Promise<SapPostResult> => {
    const { data } = await apiClient.post<SapPostResult>(E.SAP_PRODUCTION_ORDER_ISSUE(docEntry), payload, WRITE);
    return data;
  },

  receipt: async (docEntry: number, payload: ReceiptPayload): Promise<SapPostResult> => {
    const { data } = await apiClient.post<SapPostResult>(E.SAP_PRODUCTION_ORDER_RECEIPT(docEntry), payload, WRITE);
    return data;
  },

  /** Batches of one component in one warehouse, from the shared SAP lookups. */
  batches: async (itemCode: string, warehouse: string): Promise<BatchOption[]> => {
    // sap_client.hana.batch_stock_reader.available_batches, oldest first.
    const { data } = await apiClient.get<{ batch_number: string; quantity: number | string; expiry_date: string | null }[]>(
      API_ENDPOINTS.SAP_LOOKUPS.BATCHES,
      { params: { item_code: itemCode, warehouse } },
    );
    return data.map((row) => ({
      batch_number: row.batch_number,
      quantity: Number(row.quantity),
      expiry_date: row.expiry_date,
    }));
  },
};
