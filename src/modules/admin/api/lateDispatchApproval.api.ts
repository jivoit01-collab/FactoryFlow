import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type LateDispatchApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * A request to gate a dispatch truck in after the evening cutoff (5 PM by
 * default). Raised by dispatch from Dispatch > Vehicle Linking, decided from
 * Admin > Late Dispatch Gate-In Approvals, and spent by the gate-in it allows.
 */
export interface LateDispatchApproval {
  id: number;
  company: number;
  company_code: string;
  company_name: string;
  vehicle: number;
  vehicle_no: string;
  transporter_name: string;
  gate_in_date: string;
  /** Null until the gate spends the approval; then the hour the truck came in. */
  in_time: string | null;
  /** Comma-separated SAP invoice numbers the truck is booked to carry. */
  bill_doc_nums: string;
  customer_names: string;
  bill_count: number;
  reason: string;
  status: LateDispatchApprovalStatus;
  requested_by: number | null;
  requested_by_name: string;
  requested_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
  empty_vehicle_gate_in: number | null;
  gate_in_entry_no: string;
  consumed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Where one truck stands against the cutoff right now.
 *
 * Read by both sides. The gate asks the moment "Start Entry" is clicked and reads
 * `requires_approval` -- the whole decision, so the cutoff rule stays on the
 * server and is never re-implemented here. Vehicle Linking asks per expected truck
 * and reads `approval`, because dispatch asks in the afternoon while `is_late` is
 * still false.
 */
export interface LateDispatchVehicleStatus {
  vehicle: number;
  vehicle_no: string;
  gate_in_date: string;
  /** Server cutoff as HH:MM, for the wording of the warning. */
  cutoff: string;
  is_late: boolean;
  requires_approval: boolean;
  approval: LateDispatchApproval | null;
}

export type LateDispatchApprovalListParams = {
  status?: LateDispatchApprovalStatus;
  vehicle?: number;
  gate_in_date?: string;
  /** A request is filed under whichever company's bills the truck carries. */
  all_companies?: boolean;
};

export interface LateDispatchApprovalCreateRequest {
  vehicle_id: number;
  /** The day the truck is expected. Omitted, the server takes today. */
  gate_in_date?: string;
  reason: string;
}

export interface LateDispatchApprovalReviewRequest {
  notes?: string;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  const queryParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  return queryParams.toString();
}

export const lateDispatchApprovalApi = {
  async list(params?: LateDispatchApprovalListParams): Promise<LateDispatchApproval[]> {
    const query = buildQuery(params);
    const url = query
      ? `${API_ENDPOINTS.GATE_CORE.LATE_DISPATCH_APPROVALS}?${query}`
      : API_ENDPOINTS.GATE_CORE.LATE_DISPATCH_APPROVALS;
    const response = await apiClient.get<LateDispatchApproval[]>(url);
    return response.data;
  },

  async byVehicle(vehicleId: number, gateInDate?: string): Promise<LateDispatchVehicleStatus> {
    const query = buildQuery({ gate_in_date: gateInDate });
    const base = API_ENDPOINTS.GATE_CORE.LATE_DISPATCH_APPROVAL_BY_VEHICLE(vehicleId);
    const response = await apiClient.get<LateDispatchVehicleStatus>(
      query ? `${base}?${query}` : base,
    );
    return response.data;
  },

  async create(data: LateDispatchApprovalCreateRequest): Promise<LateDispatchApproval> {
    const response = await apiClient.post<LateDispatchApproval>(
      API_ENDPOINTS.GATE_CORE.LATE_DISPATCH_APPROVALS,
      data,
    );
    return response.data;
  },

  async approve(
    id: number,
    data: LateDispatchApprovalReviewRequest = {},
  ): Promise<LateDispatchApproval> {
    const response = await apiClient.post<LateDispatchApproval>(
      API_ENDPOINTS.GATE_CORE.LATE_DISPATCH_APPROVAL_APPROVE(id),
      data,
    );
    return response.data;
  },

  async reject(
    id: number,
    data: LateDispatchApprovalReviewRequest,
  ): Promise<LateDispatchApproval> {
    const response = await apiClient.post<LateDispatchApproval>(
      API_ENDPOINTS.GATE_CORE.LATE_DISPATCH_APPROVAL_REJECT(id),
      data,
    );
    return response.data;
  },
};
