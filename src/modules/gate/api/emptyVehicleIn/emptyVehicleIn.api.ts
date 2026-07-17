import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import type { PipelineStatus } from '@/modules/dashboards/dispatch-pipeline/types';

export type EmptyVehicleGateInReasonValue =
  | 'BST'
  | 'DISPATCH'
  | 'REPAIR_MOVEMENT'
  | 'JOB_WORK'
  | 'OTHER';

export interface EmptyVehicleGateInReason {
  value: EmptyVehicleGateInReasonValue;
  label: string;
}

export interface EmptyVehicleGateInItem {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  sap_quantity: string;
  actual_quantity: string;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
}

export interface EmptyVehicleGateInItemRequest {
  line_num: number;
  actual_quantity: number;
}

export interface ArrivalBillDocument {
  sap_doc_entry: number;
  sap_doc_num: string;
}

export interface ArrivalBillGroup {
  gate_in_id: number;
  entry_no: string;
  company_id: number;
  company_code: string;
  company_name: string;
  documents: ArrivalBillDocument[];
}

export interface EmptyVehicleGateInEntry {
  id: number;
  entry_no: string;
  company_code?: string;
  company_name?: string;
  /** Cross-company arrival (physical truck trip) — the vehicle-grouping key. */
  arrival?: number | null;
  /** Arrival number (ARV-…) shown on the grouped Empty Vehicle Entries row. */
  arrival_no?: string | null;
  /**
   * Every company's bills on this physical truck trip (detail view only), so the
   * normal detail page can show the whole cross-company load in place. Empty for a
   * single-company gate-in.
   */
  arrival_bills?: ArrivalBillGroup[];
  vehicle_entry: number;
  vehicle_entry_no: string;
  vehicle_entry_status: string;
  vehicle_entry_time: string;
  vehicle: number;
  vehicle_number: string;
  vehicle_type?: string | null;
  transporter_name?: string | null;
  driver: number;
  driver_name: string;
  driver_mobile: string;
  reason: EmptyVehicleGateInReasonValue;
  reason_display: string;
  gate_in_date: string;
  in_time: string;
  sap_doc_entry?: number | null;
  sap_doc_num?: string;
  sap_doc_date?: string | null;
  sap_from_warehouse?: string;
  sap_to_warehouse?: string;
  sap_reference?: string;
  sap_comments?: string;
  sap_line_count?: number;
  sap_total_quantity?: number | string;
  document_reference?: string;
  document_notes?: string;
  pipeline_status?: PipelineStatus | null;
  items: EmptyVehicleGateInItem[];
  bst_gate_out_id?: number | null;
  bst_gate_out_entry_no?: string;
  bst_gate_out_status?: string;
  is_bst_document_locked?: boolean;
  security_name?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface EmptyVehicleGateInParams {
  from_date?: string;
  to_date?: string;
  reason?: EmptyVehicleGateInReasonValue | string;
  inside_only?: boolean;
  /** 1 = aggregate across every company the user belongs to (cross-company view). */
  all_companies?: number;
}

export interface EmptyVehicleGateInCreateRequest {
  vehicle_id: number;
  driver_id: number;
  reason: EmptyVehicleGateInReasonValue;
  gate_in_date: string;
  in_time: string;
  sap_doc_entry?: number | null;
  items?: EmptyVehicleGateInItemRequest[];
  document_reference?: string;
  document_notes?: string;
  security_name?: string;
  remarks?: string;
}

export interface EmptyVehicleGateInUpdateRequest {
  sap_doc_entry?: number | null;
  items?: EmptyVehicleGateInItemRequest[];
  document_reference?: string;
  document_notes?: string;
  security_name?: string;
  remarks?: string;
}

export interface AddBillToInsideVehicleRequest {
  /** VehicleEntry id of the inside dispatch gate-in to add the bill to. */
  vehicle_entry_id: number;
  /** SAP doc_entry of the dispatch bill to add. */
  sap_doc_entry: number;
}

export interface AddBillToInsideVehicleResponse {
  detail: string;
  vehicle_entry_id: number;
  sap_doc_entry: number;
}

export interface AddBillToTruckRequest {
  /** Physical truck (vehicle id) to add the bill to. */
  vehicle_id: number;
  /** The bill's own company — its gate-in chain is created on the truck if absent. */
  company_code: string;
  /** SAP doc_entry of the dispatch bill to add. */
  sap_doc_entry: number;
}

export interface InsideVehicleBill {
  sap_doc_entry: number;
  sap_doc_num: string;
  dispatch_plan_id: number | null;
  booking_status: string | null;
  /** False when the bill's load is committed (scanned / photo-locked / dispatched). */
  removable: boolean;
  not_removable_reason: string | null;
  /** entry_nos of OTHER gate-ins also carrying this bill (stale duplicate covers). */
  duplicate_on: string[];
}

export interface InsideDispatchVehicle {
  gate_in_id: number;
  entry_no: string;
  gate_in_date: string | null;
  in_time: string | null;
  vehicle_entry_id: number;
  vehicle_id: number;
  vehicle_number: string;
  company_id: number;
  company_code: string;
  company_name: string;
  arrival: number | null;
  arrival_no: string | null;
  driver_name: string;
  driver_mobile: string;
  bills: InsideVehicleBill[];
}

export interface RemoveBillFromInsideVehicleRequest {
  vehicle_entry_id: number;
  sap_doc_entry: number;
}

export interface MoveBillBetweenVehiclesRequest {
  from_vehicle_entry_id: number;
  /** Destination physical truck (any inside truck — trucks are not company-scoped). */
  to_vehicle_id: number;
  sap_doc_entry: number;
}

export interface UnlinkAllBillsRequest {
  vehicle_entry_id: number;
}

function buildQuery(params?: EmptyVehicleGateInParams) {
  const queryParams = new URLSearchParams();

  if (params?.from_date) queryParams.append('from_date', params.from_date);
  if (params?.to_date) queryParams.append('to_date', params.to_date);
  if (params?.reason) queryParams.append('reason', params.reason);
  if (params?.inside_only) queryParams.append('inside_only', 'true');
  if (params?.all_companies) queryParams.append('all_companies', '1');

  return queryParams.toString();
}

export const emptyVehicleInApi = {
  async reasons(): Promise<EmptyVehicleGateInReason[]> {
    const response = await apiClient.get<EmptyVehicleGateInReason[]>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_REASONS,
    );
    return response.data;
  },

  async list(params?: EmptyVehicleGateInParams): Promise<EmptyVehicleGateInEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_INS}?${query}`
      : API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_INS;
    const response = await apiClient.get<EmptyVehicleGateInEntry[]>(url);
    return response.data;
  },

  async eligible(params?: EmptyVehicleGateInParams): Promise<EmptyVehicleGateInEntry[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_ELIGIBLE}?${query}`
      : API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_ELIGIBLE;
    const response = await apiClient.get<EmptyVehicleGateInEntry[]>(url);
    return response.data;
  },

  async get(id: number): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.get<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_BY_ID(id),
    );
    return response.data;
  },

  async create(data: EmptyVehicleGateInCreateRequest): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.post<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_INS,
      data,
    );
    return response.data;
  },

  async update(id: number, data: EmptyVehicleGateInUpdateRequest): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.patch<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_BY_ID(id),
      data,
    );
    return response.data;
  },

  async complete(id: number): Promise<EmptyVehicleGateInEntry> {
    const response = await apiClient.post<EmptyVehicleGateInEntry>(
      API_ENDPOINTS.GATE_CORE.EMPTY_VEHICLE_IN_COMPLETE_BY_ID(id),
    );
    return response.data;
  },

  async addBillToInsideVehicle(
    data: AddBillToInsideVehicleRequest,
  ): Promise<AddBillToInsideVehicleResponse> {
    const response = await apiClient.post<AddBillToInsideVehicleResponse>(
      API_ENDPOINTS.GATE_CORE.INSIDE_VEHICLE_ADD_BILL,
      data,
    );
    return response.data;
  },

  async addBillToTruck(data: AddBillToTruckRequest): Promise<{ detail: string }> {
    const response = await apiClient.post<{ detail: string }>(
      API_ENDPOINTS.GATE_CORE.INSIDE_VEHICLE_ADD_BILL_TO_TRUCK,
      data,
    );
    return response.data;
  },

  async listInsideDispatchVehicles(): Promise<InsideDispatchVehicle[]> {
    const response = await apiClient.get<InsideDispatchVehicle[]>(
      API_ENDPOINTS.GATE_CORE.INSIDE_DISPATCH_VEHICLES,
    );
    return response.data;
  },

  async removeBillFromInsideVehicle(
    data: RemoveBillFromInsideVehicleRequest,
  ): Promise<{ detail: string }> {
    const response = await apiClient.post<{ detail: string }>(
      API_ENDPOINTS.GATE_CORE.INSIDE_VEHICLE_REMOVE_BILL,
      data,
    );
    return response.data;
  },

  async moveBillBetweenVehicles(
    data: MoveBillBetweenVehiclesRequest,
  ): Promise<{ detail: string }> {
    const response = await apiClient.post<{ detail: string }>(
      API_ENDPOINTS.GATE_CORE.INSIDE_VEHICLE_MOVE_BILL,
      data,
    );
    return response.data;
  },

  async unlinkAllBills(
    data: UnlinkAllBillsRequest,
  ): Promise<{ detail: string; removed: unknown[]; skipped: unknown[] }> {
    const response = await apiClient.post<{
      detail: string;
      removed: unknown[];
      skipped: unknown[];
    }>(API_ENDPOINTS.GATE_CORE.INSIDE_VEHICLE_UNLINK_ALL, data);
    return response.data;
  },
};
