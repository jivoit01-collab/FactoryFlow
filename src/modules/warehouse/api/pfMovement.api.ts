import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/** One item on a declared consignment, counted in boxes. */
export interface PFMovementLine {
  id: number;
  item_code: string;
  item_name: string;
  uom: string;
  boxes: number;
  /** OITM.SalFactor2 as it stood when the line was typed. Null when SAP had none. */
  pieces_per_box: number | null;
  /** boxes x pieces_per_box, or null without a pack size — never a misleading zero. */
  pieces: number | null;
  remarks: string;
}

/** What a keeper declared he is sending out of his floor, and to where. */
export interface PFMovement {
  id: number;
  entry_no: string;
  company: number;
  company_code: string;
  movement_date: string;
  from_warehouse: string;
  from_warehouse_name: string;
  to_warehouse: string;
  to_warehouse_name: string;
  to_company: number;
  to_company_code: string;
  to_company_name: string;
  /** The destination belongs to another company — the Gupta godown case. */
  is_cross_company: boolean;
  vehicle_no: string;
  remarks: string;
  lines: PFMovementLine[];
  line_count: number;
  total_boxes: number;
  is_active: boolean;
  cancelled_at: string | null;
  cancelled_by_name: string;
  cancellation_reason: string;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export type PFMovementAction = 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RESTORED';

/** One change to a document — the trail behind an editable declaration. */
export interface PFMovementEvent {
  id: number;
  action: PFMovementAction;
  movement_date: string | null;
  to_warehouse: string;
  line_count: number;
  total_boxes: number;
  note: string;
  changed_by_name: string;
  changed_at: string;
}

/**
 * The register, plus what the caller is allowed to do on it.
 *
 * The scope comes back with the rows rather than being fetched separately
 * because the screen needs both to decide whether to offer the New button, and
 * two requests would flash an editable page that then turns read-only.
 */
export interface PFMovementList {
  /** The floor the form opens on, decided by the server. */
  default_from_warehouse: string;
  unrestricted: boolean;
  managed_warehouse_codes: string[];
  summary: { movements: number; total_boxes: number };
  movements: PFMovement[];
}

export interface PFMovementDetail {
  movement: PFMovement;
  history: PFMovementEvent[];
}

/** A finished-goods item from SAP, for the item picker. */
export interface PFMovementItem {
  item_code: string;
  item_name: string;
  uom: string;
  /** OITM.SalFactor2 — the authoritative pack size, never a name parse. */
  pieces_per_box: number | null;
  /** SAP's own on-hand for the source floor. */
  sap_on_hand: number | null;
}

/** Destinations for one company. `warehouses` is empty when HANA did not answer. */
export interface PFMovementDestinationCompany {
  company_id: number;
  company_code: string;
  company_name: string;
  warehouses: { code: string; name: string }[];
  error: string;
}

export interface PFMovementListParams {
  fromWarehouse?: string;
  toWarehouse?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeCancelled?: boolean;
  /** Widen past the active company — what "everything that left today" means. */
  allCompanies?: boolean;
}

export interface PFMovementLineInput {
  item_code: string;
  item_name?: string;
  uom?: string;
  boxes: number;
  pieces_per_box?: number | null;
  remarks?: string;
}

export interface CreatePFMovementPayload {
  from_warehouse?: string;
  to_warehouse: string;
  to_company: number;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  movement_date?: string;
  vehicle_no?: string;
  remarks?: string;
  lines: PFMovementLineInput[];
}

/** Every field optional. Omitting `lines` leaves them alone; sending them replaces all. */
export type UpdatePFMovementPayload = Partial<
  Omit<CreatePFMovementPayload, 'from_warehouse' | 'lines'>
> & {
  lines?: PFMovementLineInput[];
  note?: string;
};

export const pfMovementApi = {
  async list(params?: PFMovementListParams): Promise<PFMovementList> {
    const { data } = await apiClient.get<PFMovementList>(API_ENDPOINTS.WAREHOUSE.PF_MOVEMENTS, {
      params: {
        ...(params?.fromWarehouse ? { from_warehouse: params.fromWarehouse } : {}),
        ...(params?.toWarehouse ? { to_warehouse: params.toWarehouse } : {}),
        ...(params?.dateFrom ? { date_from: params.dateFrom } : {}),
        ...(params?.dateTo ? { date_to: params.dateTo } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.includeCancelled ? { include_cancelled: 'true' } : {}),
        ...(params?.allCompanies ? { all_companies: 'true' } : {}),
      },
    });
    return data;
  },

  async detail(id: number): Promise<PFMovementDetail> {
    const { data } = await apiClient.get<PFMovementDetail>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_DETAIL(id),
    );
    return data;
  },

  /** Finished-goods items from SAP (item group 102), search-filtered and capped. */
  async items(params: {
    search?: string;
    warehouseCode?: string;
    limit?: number;
  }): Promise<PFMovementItem[]> {
    const { data } = await apiClient.get<{ items: PFMovementItem[] }>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_ITEMS,
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

  /** Warehouses to send to, across every company — the Gupta godown is Mart's. */
  async destinations(): Promise<PFMovementDestinationCompany[]> {
    const { data } = await apiClient.get<{ companies: PFMovementDestinationCompany[] }>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_DESTINATIONS,
    );
    return data.companies;
  },

  async create(payload: CreatePFMovementPayload): Promise<PFMovement> {
    const { data } = await apiClient.post<PFMovement>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENTS,
      payload,
    );
    return data;
  },

  async update(id: number, payload: UpdatePFMovementPayload): Promise<PFMovement> {
    const { data } = await apiClient.patch<PFMovement>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_DETAIL(id),
      payload,
    );
    return data;
  },

  /** Retracts by deactivating, so the declaration having been made survives. */
  async cancel(id: number, reason?: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_DETAIL(id), {
      data: { reason: reason ?? '' },
    });
  },

  async restore(id: number, note?: string): Promise<PFMovement> {
    const { data } = await apiClient.post<PFMovement>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_RESTORE(id),
      { note: note ?? '' },
    );
    return data;
  },
};
