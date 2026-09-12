import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/**
 * Disassembly — taking a finished good apart and getting its components back.
 *
 * NAMING: every user-facing label says "Disassembly", which is SAP's own word
 * for it. The backend app, its API paths (`/dismantle/…`) and the Django
 * permission codenames (`dismantle.can_*`) say "dismantle", and the types and
 * hooks here follow the API rather than the labels. Two words, one thing — do
 * not rename one side to match the other without renaming the permissions,
 * which needs a migration and a groups re-run.
 *
 * One dismantle is one SAP **disassembly production order** plus the two
 * documents that complete it, written in an order SAP enforces: the Receipt from
 * Production (the components come back) must be in before the Goods Issue (the
 * finished good is consumed). None of the three can be withdrawn from the app,
 * which is why the screens preview before they post and why a half-posted
 * dismantle is finished rather than restarted.
 */

export type DismantleSource = 'GOODS_RETURN' | 'STOCK';

export type DismantleStatus =
  | 'DRAFT'
  // SAP took some of the three documents and refused a later one. The stock has
  // partly moved; posting again resumes at the first document SAP does not have.
  | 'PARTIALLY_POSTED'
  | 'POSTED'
  | 'CANCELLED';

export interface DismantleComponent {
  id: number;
  item_code: string;
  item_name: string;
  uom: string;
  /** The recipe as SAP states it: ITT1."Quantity" / OITT."Qauntity". */
  qty_per_piece: string;
  /** What this dismantle actually receives back — the operator's to correct. */
  quantity: string;
  warehouse_code: string;
  is_batch_managed: boolean;
  /** Minted by the app; SAP refuses a receipt into a batch that already exists. */
  batch_number: string;
  /** Un-tick what did not survive the dismantling — a torn carton, broken glass. */
  recovered: boolean;
  sap_line_num: number | null;
}

export interface DismantleListItem {
  id: number;
  entry_no: string;
  company_code: string;
  status: DismantleStatus;
  status_display: string;
  source: DismantleSource;
  source_display: string;
  goods_return_entry_no: string;
  customer_name: string;
  warehouse_code: string;
  item_code: string;
  item_name: string;
  uom: string;
  batch_number: string;
  /** PIECES, never boxes — SAP quantifies a disassembly order in pieces. */
  quantity: string;
  sap_order_doc_num: string;
  sap_receipt_doc_num: string;
  sap_issue_doc_num: string;
  posting_date: string | null;
  created_at: string;
}

export interface DismantleDetail extends DismantleListItem {
  pieces_per_box: string;
  bom_batch_size: string | null;
  /**
   * The recipe's batch size disagrees with the item's box size, so every
   * component quantity is out by their ratio. SAP's own disassembly screen is
   * wrong in the same way — the fix belongs in the item master.
   */
  bom_inflated: boolean;
  variety_code: string;
  remarks: string;
  goods_return: number | null;
  goods_return_item: number | null;
  sap_order_doc_entry: number | null;
  sap_receipt_doc_entry: number | null;
  sap_issue_doc_entry: number | null;
  order_closed: boolean;
  sap_post_error: string;
  /** Present only when SAP stopped a posting run part-way through. */
  posting_error?: string;
  posted_at: string | null;
  components: DismantleComponent[];
}

/** A returned line still waiting to be dealt with — the primary source. */
export interface DismantleReturnedLine {
  goods_return_id: number;
  goods_return_item_id: number;
  entry_no: string;
  customer_code: string;
  customer_name: string;
  received_at: string | null;
  warehouse_code: string;
  item_code: string;
  item_name: string;
  uom: string;
  condition: string;
  returned_quantity: string;
  /** What is left after the dismantles already raised against this line. */
  remaining_quantity: string;
  /**
   * The batch the stock is actually sitting in, read back from SAP rather than
   * recomputed: the returns module's numbering formula changed, so an older
   * return's batch cannot be derived from its entry number.
   */
  batch_number: string;
  /**
   * What SAP holds in that batch right now. It can disagree with
   * `remaining_quantity`, which is the app's own arithmetic — somebody
   * disassembling in SAP directly moves one and not the other.
   */
  sap_quantity: string | null;
  /** What the customer's own carton said, kept as text by the returns module. */
  original_batch_number: string;
}

/** Stock in a warehouse that SAP could explode — the fallback source. */
export interface DismantlableStockRow {
  item_code: string;
  item_name: string;
  on_hand: number;
  uom: string;
  is_batch_managed: boolean;
  pieces_per_box: number;
  bom_batch_size: number | null;
}

export interface DismantleBatch {
  batch_number: string;
  quantity: string;
  status: string;
  in_date: string | null;
  expiry_date: string | null;
  production_date: string | null;
}

export interface DismantleWarehouse {
  warehouse_code: string;
  warehouse_name: string;
  /**
   * A goods-return warehouse. Those sort first because returned stock is the
   * common case, but the list is every active warehouse: live SAP disassembles
   * out of the production floor and the finished-goods store too.
   */
  is_return_warehouse: boolean;
}

/** Everything the post would check, without posting. */
export interface DismantlePreview {
  entry_no: string;
  available_quantity: string | null;
  warnings: string[];
  errors: string[];
  can_post: boolean;
}

export interface CreateDismantlePayload {
  source: DismantleSource;
  /** Required for GOODS_RETURN. */
  goods_return_item_id?: number;
  /** Required for STOCK. */
  warehouse_code?: string;
  item_code?: string;
  batch_number?: string;
  quantity: string | number;
  remarks?: string;
}

export interface SaveComponentsPayload {
  components: {
    id: number;
    quantity?: string | number;
    recovered?: boolean;
    warehouse_code?: string;
  }[];
}

export const dismantleApi = {
  async list(params?: {
    status?: DismantleStatus;
    search?: string;
    all_companies?: boolean;
  }): Promise<DismantleListItem[]> {
    const response = await apiClient.get<DismantleListItem[]>(API_ENDPOINTS.DISMANTLE.LIST, {
      params,
    });
    return response.data;
  },

  async get(id: number): Promise<DismantleDetail> {
    const response = await apiClient.get<DismantleDetail>(API_ENDPOINTS.DISMANTLE.BY_ID(id));
    return response.data;
  },

  async create(payload: CreateDismantlePayload): Promise<DismantleDetail> {
    const response = await apiClient.post<DismantleDetail>(
      API_ENDPOINTS.DISMANTLE.CREATE,
      payload,
    );
    return response.data;
  },

  /**
   * A basket of items in one go — one record per item, all or nothing.
   *
   * SAP has no multi-item disassembly (an order names one parent), so picking
   * five items creates five records rather than one with five lines.
   */
  async createMany(items: CreateDismantlePayload[]): Promise<DismantleListItem[]> {
    const response = await apiClient.post<DismantleListItem[]>(
      API_ENDPOINTS.DISMANTLE.BULK_CREATE,
      { items },
    );
    return response.data;
  },

  /** Soft-delete a draft: it leaves every screen, the record stays on file. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.DISMANTLE.BY_ID(id));
  },

  async updateHeader(
    id: number,
    payload: { quantity?: string | number; batch_number?: string; remarks?: string },
  ): Promise<DismantleDetail> {
    const response = await apiClient.patch<DismantleDetail>(
      API_ENDPOINTS.DISMANTLE.BY_ID(id),
      payload,
    );
    return response.data;
  },

  async saveComponents(id: number, payload: SaveComponentsPayload): Promise<DismantleDetail> {
    const response = await apiClient.put<DismantleDetail>(
      API_ENDPOINTS.DISMANTLE.COMPONENTS(id),
      payload,
    );
    return response.data;
  },

  /** Re-explode the recipe — for when the BOM was corrected in SAP since. */
  async rebuildComponents(id: number): Promise<DismantleDetail> {
    const response = await apiClient.post<DismantleDetail>(
      API_ENDPOINTS.DISMANTLE.REBUILD_COMPONENTS(id),
      {},
    );
    return response.data;
  },

  async preview(id: number): Promise<DismantlePreview> {
    const response = await apiClient.get<DismantlePreview>(API_ENDPOINTS.DISMANTLE.PREVIEW(id));
    return response.data;
  },

  /**
   * Write the three SAP documents. Answers 207 when SAP stopped part-way — the
   * record then carries what did post plus `posting_error`, and posting again
   * finishes it.
   */
  async post(id: number): Promise<DismantleDetail> {
    const response = await apiClient.post<DismantleDetail>(API_ENDPOINTS.DISMANTLE.POST(id), {});
    return response.data;
  },

  async returnedLines(params?: { search?: string; limit?: number }): Promise<DismantleReturnedLine[]> {
    const response = await apiClient.get<DismantleReturnedLine[]>(
      API_ENDPOINTS.DISMANTLE.RETURNED_LINES,
      { params },
    );
    return response.data;
  },

  async stock(params: {
    warehouse_code: string;
    search?: string;
    limit?: number;
  }): Promise<DismantlableStockRow[]> {
    const response = await apiClient.get<DismantlableStockRow[]>(API_ENDPOINTS.DISMANTLE.STOCK, {
      params,
    });
    return response.data;
  },

  async batches(params: { item_code: string; warehouse_code: string }): Promise<DismantleBatch[]> {
    const response = await apiClient.get<DismantleBatch[]>(API_ENDPOINTS.DISMANTLE.BATCHES, {
      params,
    });
    return response.data;
  },

  async warehouses(): Promise<DismantleWarehouse[]> {
    const response = await apiClient.get<DismantleWarehouse[]>(
      API_ENDPOINTS.DISMANTLE.WAREHOUSES,
    );
    return response.data;
  },
};
