/**
 * Leave API — applications, decisions, and the masters behind them.
 *
 * Every request row the server returns carries its own **decision context**:
 * `can_decide`, `my_authority`, `can_cancel`, `can_withdraw`. Those are the
 * fields the UI gates its buttons on. The permission constants decide whether
 * a *page* exists; only these decide whether an *action* is offered on a given
 * row, because authorisation here depends on the reporting tree and the client
 * has no business re-deriving that.
 */
import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

// ===== Types =====

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED';

export type LeaveDayStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type DayPortion = 'FULL' | 'FIRST_HALF' | 'SECOND_HALF';

/** How the viewer is entitled to decide. Empty string means they are not. */
export type LeaveAuthority = '' | 'manager' | 'skip_level' | 'hr';

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  description: string;
  is_paid: boolean;
  allow_half_day: boolean;
  requires_document: boolean;
  annual_quota: number;
  max_consecutive_days: number;
  status: 'ACTIVE' | 'INACTIVE';
  sort_order: number;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  is_optional: boolean;
}

export interface LeaveRequestDay {
  id: number;
  date: string;
  portion: DayPortion;
  status: LeaveDayStatus;
  /** Whether the attendance sheet has been told about this day yet. */
  is_projected: boolean;
  projected_at: string | null;
}

export interface LeaveRequest {
  id: number;
  employee: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  leave_type: number;
  leave_type_code: string;
  leave_type_name: string;
  from_date: string;
  to_date: string;
  portion: DayPortion;
  total_days: string;
  reason: string;
  contact_number: string;
  document: string | null;
  status: LeaveRequestStatus;
  applied_by: number | null;
  applied_by_name: string;
  applied_at: string;
  decided_by: number | null;
  decided_by_name: string;
  decided_at: string | null;
  decision_note: string;
  days: LeaveRequestDay[];
  /** Who the tree says ought to decide it — shown so the applicant knows who they wait on. */
  responsible_manager_name: string;
  my_authority: LeaveAuthority;
  can_decide: boolean;
  can_cancel: boolean;
  can_withdraw: boolean;
}

export interface LeaveTrailEntry {
  id: number;
  action:
    | 'APPLIED'
    | 'APPROVED'
    | 'REJECTED'
    | 'WITHDRAWN'
    | 'CANCELLED'
    | 'PROJECTED'
    | 'UNPROJECTED';
  from_status: string;
  to_status: string;
  comment: string;
  authority: string;
  performed_by: number | null;
  performed_by_name: string;
  performed_at: string;
}

export interface LeaveBalanceRow {
  leave_type: number;
  leave_type_code: string;
  leave_type_name: string;
  is_paid: boolean;
  /** False for types with no quota worth storing, e.g. unpaid leave. */
  tracked: boolean;
  quota: string | null;
  used: string;
  pending: string;
  available: string | null;
}

export interface LeaveBalance {
  employee: number;
  employee_code: string;
  employee_name: string;
  year: number;
  balances: LeaveBalanceRow[];
}

export interface PickerEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  department_name: string;
  /** Whether they can sign in — if not, only the time office can act for them. */
  has_login: boolean;
}

export interface ApplyLeavePayload {
  /** Left out means "me" — the common case, and it saves resolving your own id. */
  employee?: number;
  leave_type: number;
  from_date: string;
  to_date: string;
  portion?: DayPortion;
  reason: string;
  contact_number?: string;
  /** Sent as multipart when present; the endpoint accepts both. */
  document?: File | null;
}

export interface DecisionPayload {
  comment?: string;
  /** Approve only these dates and reject the rest. Omit to approve them all. */
  only_dates?: string[];
}

export interface LeaveFilters {
  status?: LeaveRequestStatus;
  employee?: number;
  from?: string;
  to?: string;
  mine?: boolean;
}

/** A cancel returns how much of the attendance projection it could undo. */
export interface CancelResult extends LeaveRequest {
  attendance_reverted: number;
  attendance_left_alone: number;
}

// ===== Client =====

export const leaveApi = {
  getTypes: async (activeOnly = true): Promise<LeaveType[]> => {
    const { data } = await apiClient.get<LeaveType[]>(API_ENDPOINTS.LEAVE.TYPES, {
      params: { active_only: activeOnly },
    });
    return data;
  },

  getHolidays: async (year?: number): Promise<Holiday[]> => {
    const { data } = await apiClient.get<Holiday[]>(API_ENDPOINTS.LEAVE.HOLIDAYS, {
      params: year ? { year } : undefined,
    });
    return data;
  },

  getRequests: async (filters?: LeaveFilters): Promise<LeaveRequest[]> => {
    const { data } = await apiClient.get<LeaveRequest[]>(API_ENDPOINTS.LEAVE.REQUESTS, {
      params: filters,
    });
    return data;
  },

  getRequest: async (id: number): Promise<LeaveRequest> => {
    const { data } = await apiClient.get<LeaveRequest>(API_ENDPOINTS.LEAVE.REQUEST_DETAIL(id));
    return data;
  },

  getHistory: async (id: number): Promise<LeaveTrailEntry[]> => {
    const { data } = await apiClient.get<LeaveTrailEntry[]>(API_ENDPOINTS.LEAVE.HISTORY(id));
    return data;
  },

  getPending: async (): Promise<LeaveRequest[]> => {
    const { data } = await apiClient.get<LeaveRequest[]>(API_ENDPOINTS.LEAVE.PENDING);
    return data;
  },

  /**
   * Just the number. Polled from every page by every approver, so it must stay
   * a COUNT(*) — never `getPending().length`.
   */
  getPendingCount: async (): Promise<number> => {
    const { data } = await apiClient.get<{ count: number }>(
      API_ENDPOINTS.LEAVE.PENDING_COUNT,
      // A background badge poll must not raise a toast on every page.
      { suppressErrorToast: true },
    );
    return data.count;
  },

  getCalendar: async (from: string, to: string): Promise<LeaveRequest[]> => {
    const { data } = await apiClient.get<LeaveRequest[]>(API_ENDPOINTS.LEAVE.CALENDAR, {
      params: { from, to },
    });
    return data;
  },

  getBalance: async (employee?: number, year?: number): Promise<LeaveBalance> => {
    const { data } = await apiClient.get<LeaveBalance>(API_ENDPOINTS.LEAVE.BALANCE, {
      params: { employee, year },
    });
    return data;
  },

  getPickerEmployees: async (search?: string): Promise<PickerEmployee[]> => {
    const { data } = await apiClient.get<PickerEmployee[]>(API_ENDPOINTS.LEAVE.EMPLOYEES, {
      params: search ? { search } : undefined,
    });
    return data;
  },

  createType: async (payload: Partial<LeaveType>): Promise<LeaveType> => {
    const { data } = await apiClient.post<LeaveType>(API_ENDPOINTS.LEAVE.TYPES, payload);
    return data;
  },

  updateType: async (id: number, payload: Partial<LeaveType>): Promise<LeaveType> => {
    const { data } = await apiClient.patch<LeaveType>(API_ENDPOINTS.LEAVE.TYPE_DETAIL(id), payload);
    return data;
  },

  createHoliday: async (payload: Omit<Holiday, 'id'>): Promise<Holiday> => {
    const { data } = await apiClient.post<Holiday>(API_ENDPOINTS.LEAVE.HOLIDAYS, payload);
    return data;
  },

  deleteHoliday: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.LEAVE.HOLIDAY_DETAIL(id));
  },

  apply: async (payload: ApplyLeavePayload): Promise<LeaveRequest> => {
    // A certificate has to go up as multipart; everything else stays JSON so
    // the ordinary case is not dragged through FormData for no reason.
    if (payload.document) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        form.append(key, value instanceof File ? value : String(value));
      });
      const { data } = await apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.REQUESTS, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }

    // Drop the (absent) document key rather than sending `document: null`,
    // which DRF's FileField reads as "clear it" rather than "not supplied".
    const json = { ...payload };
    delete json.document;
    const { data } = await apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.REQUESTS, json);
    return data;
  },

  approve: async (id: number, payload: DecisionPayload = {}): Promise<LeaveRequest> => {
    const { data } = await apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.APPROVE(id), payload);
    return data;
  },

  reject: async (id: number, comment: string): Promise<LeaveRequest> => {
    const { data } = await apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.REJECT(id), {
      comment,
    });
    return data;
  },

  withdraw: async (id: number, comment = ''): Promise<LeaveRequest> => {
    const { data } = await apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.WITHDRAW(id), {
      comment,
    });
    return data;
  },

  cancel: async (id: number, comment: string): Promise<CancelResult> => {
    const { data } = await apiClient.post<CancelResult>(API_ENDPOINTS.LEAVE.CANCEL(id), {
      comment,
    });
    return data;
  },
};
