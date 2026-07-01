// Fire department store types.
//
// The fire store is a copy of the spare store — it manages its own stock and
// requests through dedicated `/maintenance/fire/...` endpoints. The item, its
// payload/filters and the category share the exact shape of their spare
// counterparts, so those are aliased. The request/movement shapes embed the
// stocked item under a `fire_item` prefix (where the spare store uses `spare`),
// so they are declared explicitly.
import type {
  MaintenanceDecimal,
  MaintenanceSpare,
  MaintenanceSpareFilters,
  MaintenanceSparePayload,
  SpareCategory,
  SpareCategoryPayload,
  SpareIssuePayload,
  SpareMovementType,
  SpareRequestActionPayload,
  SpareRequestStatus,
  SpareStockAdjustPayload,
} from './maintenance.types';

export type FireCategory = SpareCategory;
export type FireCategoryPayload = SpareCategoryPayload;

export type FireItem = MaintenanceSpare;
export type FireItemPayload = MaintenanceSparePayload;
export type FireItemFilters = MaintenanceSpareFilters;
export type FireStockAdjustPayload = SpareStockAdjustPayload;

export type FireRequestStatus = SpareRequestStatus;
export type FireRequestActionPayload = SpareRequestActionPayload;
export type FireIssuePayload = SpareIssuePayload;
export type FireMovementType = SpareMovementType;

export interface FireRequest {
  id: number;
  company: number;
  work_order: number;
  work_order_no: string;
  work_order_title: string;
  asset: number;
  asset_code: string;
  asset_name: string;
  fire_item: number;
  fire_item_name: string;
  fire_item_part_number: string;
  fire_item_sap_item_code: string;
  fire_item_uom: string;
  status: FireRequestStatus;
  requested_qty: MaintenanceDecimal;
  issued_qty: MaintenanceDecimal;
  consumed_qty: MaintenanceDecimal;
  returned_qty: MaintenanceDecimal;
  pending_issue_qty: MaintenanceDecimal;
  available_to_consume_qty: MaintenanceDecimal;
  total_cost: MaintenanceDecimal;
  requested_by: number | null;
  requested_by_name: string;
  required_by: string | null;
  purpose: string;
  store_remarks: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FireRequestPayload {
  work_order: number;
  fire_item: number;
  requested_qty: MaintenanceDecimal;
  required_by?: string | null;
  purpose?: string;
}

export interface FireRequestFilters {
  search?: string;
  work_order?: number | 'ALL';
  asset?: number | 'ALL';
  fire_item?: number | 'ALL';
  status?: FireRequestStatus | 'ALL';
  is_active?: boolean;
}

export interface FireMovement {
  id: number;
  company: number;
  fire_request: number;
  work_order: number;
  work_order_no: string;
  asset_code: string;
  fire_item: number;
  fire_item_name: string;
  fire_item_part_number: string;
  fire_item_uom: string;
  movement_type: FireMovementType;
  quantity: MaintenanceDecimal;
  unit_cost: MaintenanceDecimal;
  line_total: MaintenanceDecimal;
  remarks: string;
  performed_by: number | null;
  performed_by_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FireMovementFilters {
  work_order?: number | 'ALL';
  fire_request?: number | 'ALL';
  fire_item?: number | 'ALL';
  movement_type?: FireMovementType | 'ALL';
}
