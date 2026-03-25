// ── Status Enums ──

export type ShipmentStatus =
  | 'RELEASED'
  | 'PICKING'
  | 'PACKED'
  | 'STAGED'
  | 'LOADING'
  | 'DISPATCHED'
  | 'CANCELLED';

export type PickStatus = 'PENDING' | 'PICKED' | 'SHORT';

export type PickTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SHORT';

export type TrailerCondition = 'CLEAN' | 'DAMAGED' | 'REJECTED';

export type GoodsIssueStatus = 'PENDING' | 'POSTED' | 'FAILED';

// ── Response Types ──

export interface ShipmentOrderItem {
  id: number;
  sap_line_num: number;
  item_code: string;
  item_name: string;
  ordered_qty: string;
  picked_qty: string;
  packed_qty: string;
  loaded_qty: string;
  uom: string;
  warehouse_code: string;
  batch_number: string;
  weight: string;
  pick_status: PickStatus;
}

export interface ShipmentOrder {
  id: number;
  sap_doc_entry: number;
  sap_doc_num: number;
  customer_code: string;
  customer_name: string;
  ship_to_address: string;
  carrier_code: string;
  carrier_name: string;
  scheduled_date: string;
  dock_bay: string;
  dock_slot_start: string | null;
  dock_slot_end: string | null;
  status: ShipmentStatus;
  vehicle_entry_no: number | null;
  bill_of_lading_no: string;
  seal_number: string;
  total_weight: string | null;
  notes: string;
  items: ShipmentOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface ShipmentOrderListItem {
  id: number;
  sap_doc_entry: number;
  sap_doc_num: number;
  customer_code: string;
  customer_name: string;
  carrier_name: string;
  scheduled_date: string;
  dock_bay: string;
  status: ShipmentStatus;
  bill_of_lading_no: string;
  seal_number: string;
  total_weight: string | null;
  item_count: number;
  vehicle_entry_no: number | null;
  created_at: string;
}

export interface PickTask {
  id: number;
  shipment_order: number;
  shipment_item: number;
  item_code: string;
  item_name: string;
  pick_location: string;
  pick_qty: string;
  actual_qty: string;
  status: PickTaskStatus;
  assigned_to: number | null;
  assigned_to_name: string;
  scanned_barcode: string;
  created_at: string;
  updated_at: string;
}

export interface OutboundLoadRecord {
  id: number;
  shipment_order: number;
  trailer_condition: TrailerCondition;
  trailer_temp_ok: boolean;
  trailer_temp_reading: string | null;
  inspected_by: number | null;
  inspected_by_name: string;
  inspected_at: string | null;
  loaded_by: number | null;
  loaded_by_name: string;
  loaded_at: string | null;
  supervisor_confirmed: boolean;
  supervisor: number | null;
  supervisor_name: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoodsIssuePosting {
  id: number;
  shipment_order: number;
  status: GoodsIssueStatus;
  sap_gi_doc_entry: number | null;
  sap_gi_doc_num: number | null;
  error_message: string;
  posted_at: string | null;
  posted_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  total_shipments: number;
  by_status: Record<ShipmentStatus, number>;
  today_dispatched: number;
  today_scheduled: number;
  zone_c_active_bays: number;
  zone_c_bay_utilisation_pct: number;
}

export interface SyncResult {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_from_sap: number;
  errors: string[];
}

export interface BOLData {
  bol_number: string;
  shipment_id: number;
  customer_name: string;
  ship_to_address: string;
  carrier_name: string;
  scheduled_date: string;
  total_weight: string;
  items: ShipmentOrderItem[];
}

// ── Request Types ──

export interface SyncFilters {
  customer_code?: string;
  from_date?: string;
  to_date?: string;
}

export interface AssignBayRequest {
  dock_bay: string;
  dock_slot_start: string;
  dock_slot_end: string;
}

export interface PickTaskUpdateRequest {
  assigned_to?: number;
  status?: PickTaskStatus;
  actual_qty?: string;
  scanned_barcode?: string;
}

export interface ScanRequest {
  barcode: string;
}

export interface LinkVehicleRequest {
  vehicle_entry_id: number;
}

export interface InspectTrailerRequest {
  trailer_condition: TrailerCondition;
  trailer_temp_ok: boolean;
  trailer_temp_reading?: string;
}

export interface LoadItemRequest {
  item_id: number;
  loaded_qty: string;
}

export interface LoadRequest {
  items: LoadItemRequest[];
}

export interface DispatchRequest {
  seal_number: string;
  branch_id: number;
}

export interface RetryGoodsIssueRequest {
  branch_id: number;
}

// ── Filter Types ──

export interface ShipmentFilters {
  status?: ShipmentStatus;
  scheduled_date?: string;
  customer_code?: string;
}
