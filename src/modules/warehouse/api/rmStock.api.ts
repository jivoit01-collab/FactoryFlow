import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/** One item's stated quantity in one warehouse. */
export interface RawMaterialStockRow {
  id: number;
  company: number;
  company_code: string;
  warehouse_code: string;
  item_code: string;
  item_name: string;
  uom: string;
  /** Decimal as a string — raw material is weighed and a float would round it. */
  qty: string;
  as_of_date: string;
  remarks: string;
  is_active: boolean;
  set_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * The register, plus what the caller is allowed to change on it.
 *
 * The scope comes back with the rows rather than being fetched separately
 * because the screen needs both to decide which rows get a Set button, and
 * two requests would flash an editable table that then turns read-only.
 */
export interface RawMaterialStockList {
  /** The one warehouse the register covers, decided by the server. */
  register_warehouse: string;
  unrestricted: boolean;
  managed_warehouse_codes: string[];
  rows: RawMaterialStockRow[];
}

export type RawMaterialStockAction = 'CREATED' | 'UPDATED' | 'REMOVED' | 'RESTORED';

/** One change to a quantity. */
export interface RawMaterialStockEntry {
  id: number;
  warehouse_code: string;
  item_code: string;
  action: RawMaterialStockAction;
  /** Null on CREATED — there was no figure before, which is not the same as zero. */
  previous_qty: string | null;
  qty: string;
  qty_delta: string | null;
  as_of_date: string | null;
  remarks: string;
  changed_by_name: string;
  changed_at: string;
}

export interface RawMaterialStockDetail {
  row: RawMaterialStockRow;
  history: RawMaterialStockEntry[];
}

/** One item's total across every shift on the sheet. */
export interface RawMaterialSheetItem {
  item_code: string;
  item_name: string;
  /** Issued to production, summed over the item's rows. */
  qty: string;
  requirement: string;
  as_of_date: string | null;
  shifts: string[];
  row_count: number;
  rows: number[];
  /** The two issuer columns disagreed on at least one of this item's rows. */
  has_mismatch: boolean;
}

export interface RawMaterialSheetImport {
  /** False for a preview — nothing was written. */
  committed: boolean;
  header_row: number | null;
  issuer_columns: number;
  items: RawMaterialSheetItem[];
  skipped: { row: number; item_code: string; reason: string }[];
  mismatches: { row: number; item_code: string; values: string[]; using: string }[];
  /** Present only after a commit. */
  written?: { item_code: string; qty: string; as_of_date: string | null }[];
  failed?: { item_code: string; reason: string }[];
}

/** A raw-material item from SAP, for the picker. */
export interface RawMaterialItem {
  item_code: string;
  item_name: string;
  uom: string;
  /** SAP's own on-hand for the chosen warehouse; null when none was chosen. */
  sap_on_hand: number | null;
}

export interface RawMaterialStockListParams {
  warehouseCode?: string;
  search?: string;
  includeInactive?: boolean;
}

export interface SetRawMaterialStockPayload {
  warehouse_code: string;
  item_code: string;
  item_name?: string;
  uom?: string;
  qty: string;
  as_of_date?: string;
  remarks?: string;
}

export const rmStockApi = {
  async list(params?: RawMaterialStockListParams): Promise<RawMaterialStockList> {
    const { data } = await apiClient.get<RawMaterialStockList>(API_ENDPOINTS.WAREHOUSE.RM_STOCK, {
      params: {
        ...(params?.warehouseCode ? { warehouse_code: params.warehouseCode } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.includeInactive ? { include_inactive: 'true' } : {}),
      },
    });
    return data;
  },

  async detail(id: number): Promise<RawMaterialStockDetail> {
    const { data } = await apiClient.get<RawMaterialStockDetail>(
      API_ENDPOINTS.WAREHOUSE.RM_STOCK_DETAIL(id),
    );
    return data;
  },

  /** Raw-material items from SAP (item group 106), search-filtered and capped. */
  async items(params: {
    search?: string;
    warehouseCode?: string;
    limit?: number;
  }): Promise<RawMaterialItem[]> {
    const { data } = await apiClient.get<{ items: RawMaterialItem[] }>(
      API_ENDPOINTS.WAREHOUSE.RM_STOCK_ITEMS,
      {
        params: {
          ...(params.search ? { search: params.search } : {}),
          ...(params.warehouseCode ? { warehouse_code: params.warehouseCode } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        },
      },
    );
    return data.items;
  },

  /** Sets the quantity, creating the register row the first time. */
  async set(payload: SetRawMaterialStockPayload): Promise<RawMaterialStockRow> {
    const { data } = await apiClient.post<RawMaterialStockRow>(
      API_ENDPOINTS.WAREHOUSE.RM_STOCK,
      payload,
    );
    return data;
  },

  /** Removes by deactivating, so the quantity trail survives. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.WAREHOUSE.RM_STOCK_DETAIL(id));
  },

  /**
   * Read the warehouse's shift-wise issue sheet — an uploaded file, or rows
   * copied straight out of Excel (the clipboard hands them over as TSV).
   *
   * Called twice for one import: once to preview (nothing is written), then
   * with `commit` once the keeper has seen the totals. `acceptMismatches`
   * answers the 409 raised when the two issuer columns disagree.
   */
  async importSheet(
    source: { file?: File | null; text?: string },
    opts?: { commit?: boolean; acceptMismatches?: boolean },
  ): Promise<RawMaterialSheetImport> {
    const form = new FormData();
    if (source.file) form.append('file', source.file);
    else form.append('text', source.text ?? '');
    if (opts?.commit) form.append('commit', 'true');
    if (opts?.acceptMismatches) form.append('accept_mismatches', 'true');
    const { data } = await apiClient.post<RawMaterialSheetImport>(
      API_ENDPOINTS.WAREHOUSE.RM_STOCK_IMPORT,
      form,
    );
    return data;
  },
};
