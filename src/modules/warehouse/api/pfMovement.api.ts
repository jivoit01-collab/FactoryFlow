import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/** One item on a declared consignment, counted in pieces. */
export interface PFMovementLine {
  id: number;
  item_code: string;
  item_name: string;
  uom: string;
  /** Pieces — SAP's inventory UoM, the unit the keeper types. */
  pieces: number;
  /** OITM.SalFactor2 as it stood when the line was typed. Null when SAP had none. */
  pieces_per_box: number | null;
  /** Whole boxes the pieces come to; null without a pack size. */
  full_boxes: number | null;
  /** Pieces left over after those boxes; null without a pack size. */
  loose_pieces: number | null;
  /**
   * OITM.SalPackUn as it stood when the line was typed — litres in one piece.
   * Null for an item SAP does not measure in litres (a carton, a preform).
   */
  litres_per_piece: string | null;
  /**
   * pieces x litres_per_piece, to 3 places. A string, not a number: the factor
   * has 6 decimal places and a float would round a 0.8242-litre pouch
   * differently per client. Null — never "0" — when the item is not a litre
   * item at all.
   */
  litres: string | null;
  remarks: string;
}

/**
 * Where a load is headed. Not every one goes to another godown — plenty leaves
 * the floor straight onto a customer's truck, and a dispatch carries no
 * destination warehouse at all rather than a placeholder code that would show
 * up as a real godown on every grouped report.
 */
export type PFMovementDestinationKind = 'GODOWN' | 'DISPATCH';

/** What a keeper declared he is sending out of his floor, and to where. */
export interface PFMovement {
  id: number;
  entry_no: string;
  company: number;
  company_code: string;
  movement_date: string;
  from_warehouse: string;
  from_warehouse_name: string;
  destination_kind: PFMovementDestinationKind;
  /** The destination in one string — the godown code, or "Dispatch". */
  destination_display: string;
  is_dispatch: boolean;
  /** Blank on a dispatch: there is no destination godown. */
  to_warehouse: string;
  to_warehouse_name: string;
  /** Null on a dispatch. */
  to_company: number | null;
  to_company_code: string;
  to_company_name: string;
  /** The destination belongs to another company — the Gupta godown case. Always
   * false for a dispatch, which has no destination company at all. */
  is_cross_company: boolean;
  vehicle_no: string;
  /** Invoice or bilty number, when the paperwork exists yet. */
  reference: string;
  remarks: string;
  lines: PFMovementLine[];
  line_count: number;
  total_pieces: number;
  /** Litres over the document, to 3 places, counting only the litre items. */
  total_litres: string;
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
  /** Snapshotted so the trail can say "was going to BH-BT, now a dispatch". */
  destination_kind: PFMovementDestinationKind | '';
  to_warehouse: string;
  line_count: number;
  total_pieces: number;
  total_litres: string;
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
  summary: {
    movements: number;
    total_pieces: number;
    /** Of the total, what left on a direct dispatch rather than to a godown. */
    dispatched_pieces: number;
    to_godown_pieces: number;
    /** Litres to 3 places, as strings for the same reason as on a line. */
    total_litres: string;
    dispatched_litres: string;
    to_godown_litres: string;
  };
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
  /**
   * OITM.SalPackUn gated on U_IsLitre — litres in one piece. Null for an item
   * SAP does not measure in litres; 315 of 405 finished-goods items carry one.
   */
  litres_per_piece: number | null;
  /** SAP's own on-hand for the source floor, in pieces — the unit typed here. */
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

/** Whether the numbers in a pasted block are pieces or boxes. */
export type PFMovementPasteUnit = 'PCS' | 'BOX';

/** One resolved row, ready to become a form line. */
export interface PFMovementPasteLine {
  item_code: string;
  item_name: string;
  uom: string;
  /** Already in pieces — a BOX paste is multiplied server-side by SalFactor2. */
  pieces: number;
  pieces_per_box: number | null;
  litres_per_piece: number | null;
  sap_on_hand: number | null;
  /** Which pasted row(s) this came from; more than one means they were summed. */
  source_lines: number[];
  /** The quantity as pasted, before any box-to-piece conversion. */
  pasted_qty: string;
  inactive_in_sap: boolean;
}

/** A row that could not be turned into a line, and why. */
export interface PFMovementPasteSkip {
  line: number;
  text: string;
  reason: string;
}

export interface PFMovementPasteUnresolved {
  item_code: string;
  qty: string;
  lines: number[];
  reason: string;
}

/**
 * What the server made of a pasted block. Nothing is written by this — the
 * lines become form rows the keeper reviews, and the ordinary save does the
 * writing.
 */
export interface PFMovementPasteResult {
  unit: PFMovementPasteUnit;
  warehouse_code: string;
  /** 1-based, or null when no header was recognisable and it read by position. */
  header_row: number | null;
  /** Column index -> the field it was read as, when a header was found. */
  columns_read: Record<string, string>;
  lines: PFMovementPasteLine[];
  skipped: PFMovementPasteSkip[];
  unresolved: PFMovementPasteUnresolved[];
  /** Codes that appeared on more than one row and were added together. */
  combined_codes: string[];
  total_pieces: number;
  /** Non-empty when SAP could not be reached to resolve the codes. */
  lookup_error: string;
}

export interface PFMovementPastePayload {
  text: string;
  unit: PFMovementPasteUnit;
  from_warehouse?: string;
}

export interface PFMovementListParams {
  fromWarehouse?: string;
  toWarehouse?: string;
  destinationKind?: PFMovementDestinationKind;
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
  pieces: number;
  /** Both from the SAP picker, never typed. */
  pieces_per_box?: number | null;
  litres_per_piece?: number | null;
  remarks?: string;
}

export interface CreatePFMovementPayload {
  from_warehouse?: string;
  destination_kind?: PFMovementDestinationKind;
  /** Both omitted on a dispatch; both required for a godown move. */
  to_warehouse?: string;
  to_company?: number | null;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  movement_date?: string;
  vehicle_no?: string;
  reference?: string;
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
        ...(params?.destinationKind ? { destination_kind: params.destinationKind } : {}),
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

  /**
   * Read a block pasted out of SAP or Excel into movement lines.
   *
   * A POST because the block goes in the body — it is far too big for a query
   * string — but it writes nothing and reserves nothing.
   */
  async paste(payload: PFMovementPastePayload): Promise<PFMovementPasteResult> {
    const { data } = await apiClient.post<PFMovementPasteResult>(
      API_ENDPOINTS.WAREHOUSE.PF_MOVEMENT_PASTE,
      payload,
    );
    return data;
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
