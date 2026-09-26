import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

// ---------------------------------------------------------------------------
// Shapes, as `factory_app/bom_changes/views.py` and
// `sap_client/hana/bom_reader.py` send them.
// ---------------------------------------------------------------------------

export type BomKind = 'CREATE' | 'UPDATE';
export type BomStatus =
  | 'PENDING'
  | 'L1_APPROVED'
  | 'L2_APPROVED'
  | 'L3_APPROVED'
  | 'SAP_PUSHED'
  | 'REJECTED'
  | 'CANCELLED';
export type BomType = 'Production' | 'Sales' | 'Assembly' | 'Template';
export type LineType = 'item' | 'resource';
export type IssueMethod = 'Manual' | 'Backflush';

/** One line of a tree SAP holds. `text` lines are SAP's own comments in the tree. */
export interface SapBomLine {
  child_num: number | null;
  visual_order: number | null;
  item_type: LineType | 'text';
  item_code: string;
  item_name: string;
  quantity: number;
  warehouse: string;
  issue_method: IssueMethod;
  unit_cost: number;
  currency: string;
  comment: string;
  uom: string;
}

/** A tree in the search list. */
export interface SapBomSummary {
  tree_code: string;
  description: string;
  tree_type: string;
  bom_type: string;
  sap_tree_type: string;
  quantity: number;
  warehouse: string;
  item_count: number;
  resource_count: number;
  updated_at: string | null;
}

export interface SapBom extends SapBomSummary {
  distribution_rule: string;
  project: string;
  price_list: number | null;
  lines: SapBomLine[];
}

export interface WorkflowStep {
  level: number;
  status: BomStatus;
  right: string;
  label: string;
  writes_sap: boolean;
}

export interface Workflow {
  levels: number;
  steps: WorkflowStep[];
}

export interface RequestStep extends WorkflowStep {
  state: 'done' | 'current' | 'rejected' | 'skipped' | 'upcoming';
}

export interface ChangeLine {
  id: number;
  visual_order: number;
  item_type: LineType;
  item_code: string;
  item_name: string;
  quantity: string;
  issue_method: IssueMethod;
  warehouse: string;
  unit_cost: string;
  comment: string;
}

export interface ChangeApproval {
  id: number;
  level: number;
  from_status: BomStatus;
  action: 'APPROVE' | 'REJECT';
  action_label: string;
  decided_by: number | null;
  decided_by_name: string;
  remarks: string;
  decided_at: string;
  /** A direct push that skipped the approval levels. */
  direct: boolean;
}

/** What the caller may do to a request now — the buttons follow these. */
export interface RequestActions {
  can_approve: boolean;
  can_reject: boolean;
  can_cancel: boolean;
  /** Approving now writes the BOM to SAP. */
  can_push: boolean;
}

export interface ChangeRequest extends RequestActions {
  id: number;
  kind: BomKind;
  kind_label: string;
  item_code: string;
  item_name: string;
  quantity: string;
  bom_type: BomType;
  warehouse: string;
  distribution_rule: string;
  project: string;
  status: BomStatus;
  status_label: string;
  awaiting: string;
  submitted_at: string;
  submitted_by: string;
  is_mine: boolean;
  sap_result: { tree_code?: string; operation?: string } | null;
  sap_pushed_at: string | null;
  sap_pushed_by_name: string;
  push_error: string;
  push_failed_at: string | null;
  cancelled_at: string | null;
  cancelled_by_name: string;
  legacy_portal_id: number | null;
  line_count: number;
}

export interface ChangeRequestDetail extends ChangeRequest {
  lines: ChangeLine[];
  approvals: ChangeApproval[];
  steps: RequestStep[];
  /** UPDATE: the tree as SAP held it (a `SapBom`), or the portal's own note for imported rows. */
  original_data: Partial<SapBom> | null;
}

export interface ChangeRequestList {
  results: ChangeRequest[];
  count: number;
  /** Per status, plus `ACTIONABLE` — the caller's turn. */
  counts: Partial<Record<BomStatus | 'ACTIONABLE', number>>;
  levels: number;
}

export interface RequestFilters {
  /** One status or several, comma-separated. */
  status?: string;
  kind?: BomKind;
  mine?: boolean;
  actionable?: boolean;
  search?: string;
}

export interface ChangeLinePayload {
  item_type: LineType;
  item_code: string;
  item_name: string;
  quantity: string;
  issue_method: IssueMethod;
  warehouse: string;
  unit_cost: string;
  comment: string;
}

export interface ChangeRequestPayload {
  kind: BomKind;
  item_code: string;
  item_name: string;
  quantity: string;
  bom_type: BomType;
  warehouse: string;
  distribution_rule: string;
  project: string;
  lines: ChangeLinePayload[];
  remarks?: string;
}

/** Pickers, from the shared `/sap-lookups/` endpoints. */
export interface SapItemOption {
  item_code: string;
  item_name: string;
  uom: string;
  last_purchase_price: number;
}

export interface CodeName {
  code: string;
  name: string;
}

/**
 * A push can wait on SAP's own ProductTrees write (the writer allows 120 s)
 * after two HANA reads; the client's 30 s default would give up while SAP is
 * still saving, and the operator would press again.
 */
export const SAP_PUSH_TIMEOUT_MS = 180_000;

function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== '' && value !== false,
    ),
  ) as Partial<T>;
}

export const bomChangesApi = {
  workflow: async (): Promise<Workflow> => {
    const { data } = await apiClient.get<Workflow>(API_ENDPOINTS.BOM_CHANGES.WORKFLOW);
    return data;
  },

  sapBoms: async (search: string): Promise<SapBomSummary[]> => {
    const { data } = await apiClient.get<SapBomSummary[]>(API_ENDPOINTS.BOM_CHANGES.SAP_BOMS, {
      params: compact({ search, limit: 100 }),
    });
    return data;
  },

  sapBom: async (treeCode: string): Promise<SapBom> => {
    const { data } = await apiClient.get<SapBom>(
      API_ENDPOINTS.BOM_CHANGES.SAP_BOM_DETAIL(treeCode),
    );
    return data;
  },

  requests: async (filters: RequestFilters): Promise<ChangeRequestList> => {
    const { data } = await apiClient.get<ChangeRequestList>(API_ENDPOINTS.BOM_CHANGES.REQUESTS, {
      params: compact(filters),
    });
    return data;
  },

  request: async (id: number): Promise<ChangeRequestDetail> => {
    const { data } = await apiClient.get<ChangeRequestDetail>(
      API_ENDPOINTS.BOM_CHANGES.REQUEST_DETAIL(id),
    );
    return data;
  },

  create: async (payload: ChangeRequestPayload): Promise<ChangeRequestDetail> => {
    const { data } = await apiClient.post<ChangeRequestDetail>(
      API_ENDPOINTS.BOM_CHANGES.REQUESTS,
      payload,
    );
    return data;
  },

  directPush: async (payload: ChangeRequestPayload): Promise<ChangeRequestDetail> => {
    const { data } = await apiClient.post<ChangeRequestDetail>(
      API_ENDPOINTS.BOM_CHANGES.DIRECT_PUSH,
      payload,
      {
        timeout: SAP_PUSH_TIMEOUT_MS,
      },
    );
    return data;
  },

  approve: async (id: number, remarks: string): Promise<ChangeRequestDetail> => {
    const { data } = await apiClient.post<ChangeRequestDetail>(
      API_ENDPOINTS.BOM_CHANGES.APPROVE(id),
      { remarks },
      { timeout: SAP_PUSH_TIMEOUT_MS },
    );
    return data;
  },

  reject: async (id: number, remarks: string): Promise<ChangeRequestDetail> => {
    const { data } = await apiClient.post<ChangeRequestDetail>(
      API_ENDPOINTS.BOM_CHANGES.REJECT(id),
      { remarks },
    );
    return data;
  },

  cancel: async (id: number): Promise<ChangeRequestDetail> => {
    const { data } = await apiClient.post<ChangeRequestDetail>(
      API_ENDPOINTS.BOM_CHANGES.CANCEL(id),
    );
    return data;
  },

  items: async (search: string): Promise<SapItemOption[]> => {
    const { data } = await apiClient.get<SapItemOption[]>(API_ENDPOINTS.SAP_LOOKUPS.ITEMS, {
      params: { search, limit: 30 },
    });
    return data;
  },

  resources: async (search: string): Promise<CodeName[]> => {
    const { data } = await apiClient.get<CodeName[]>(API_ENDPOINTS.SAP_LOOKUPS.RESOURCES, {
      params: { search, limit: 30 },
    });
    return data;
  },

  warehouses: async (): Promise<CodeName[]> => {
    const { data } = await apiClient.get<CodeName[]>(API_ENDPOINTS.SAP_LOOKUPS.WAREHOUSES);
    return data;
  },
};
