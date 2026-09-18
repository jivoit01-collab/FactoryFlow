/**
 * Attendance API — the daily sheet and its corrections.
 *
 * Every row carries BOTH statuses, always: `machine_status` is what the
 * punching machine recorded and `effective_status` is what stands. The
 * dashboard's "punch machine only" default hides a column; it does not ask the
 * server for less. Two clients must never be able to disagree about what a day
 * says.
 */
import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

// ===== Types =====

/**
 * The first five are what the machine can produce on its own. The rest arrive
 * only by human override — no arrangement of punches distinguishes approved
 * leave from simply not coming in.
 */
export type AttendanceStatusValue =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'MISSING_PUNCH'
  | 'WEEKLY_OFF'
  | 'ON_LEAVE'
  | 'ON_DUTY'
  | 'HOLIDAY';

export type OverrideReasonCode =
  | 'FORGOT_PUNCH'
  | 'MACHINE_FAILURE'
  | 'FINGERPRINT_FAILED'
  | 'ON_DUTY_OUTSIDE'
  | 'APPROVED_LEAVE'
  | 'HALF_DAY_APPROVED'
  | 'SHIFT_ADJUSTMENT'
  | 'NOT_ENROLLED'
  | 'DATA_ERROR'
  | 'OTHER';

export interface AttendanceEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  department: number | null;
  department_name?: string | null;
  designation_name?: string | null;
  sap_segment?: string;
  employment_status: string;
}

export interface DailyAttendanceRow {
  id: number;
  date: string;
  employee: number;
  employee_code: string;
  employee_name: string;
  department_name: string | null;
  employee_detail?: AttendanceEmployee;

  // What the machine recorded. Never written through this API.
  machine_status: AttendanceStatusValue;
  machine_status_display: string;
  machine_first_punch: string | null;
  machine_last_punch: string | null;
  machine_punch_count: number;
  machine_worked_minutes: number;
  devices: string;

  // What stands.
  effective_status: AttendanceStatusValue;
  effective_status_display: string;
  is_overridden: boolean;
  override_reason_code: OverrideReasonCode | '';
  override_reason_code_display: string;
  override_reason: string;
  overridden_by: number | null;
  overridden_by_name: string | null;
  overridden_at: string | null;

  synced_at: string | null;
}

export interface OverrideLogEntry {
  id: number;
  action: 'OVERRIDE' | 'AMEND' | 'REVERT';
  action_display: string;
  from_status: AttendanceStatusValue;
  to_status: AttendanceStatusValue;
  machine_status: AttendanceStatusValue;
  reason_code: OverrideReasonCode | '';
  reason_code_display: string;
  reason: string;
  performed_by: number | null;
  performed_by_name: string | null;
  performed_at: string;
}

export interface AttendanceSummary {
  total: number;
  overridden: number;
  machine: Partial<Record<AttendanceStatusValue, number>>;
  effective: Partial<Record<AttendanceStatusValue, number>>;
}

export interface SourceStatus {
  /**
   * Whether the punch data is current -- NOT whether a machine answered.
   * The machines are not reachable from the server; an agent inside the plant
   * copies punches across, and this is true when it last ran recently and
   * succeeded. See `sync/README.md`.
   */
  reachable: boolean;
  detail?: string;
  table?: string;
  punches?: number;
  latest_punch?: string | null;
  /** When the roll-up last wrote the sheet. */
  last_sync?: string | null;
  /** When the agent in the plant last attempted a copy. */
  last_agent_run?: string | null;
  /** The agent has not reported inside the expected window. */
  stale?: boolean;
}

export interface AttendanceVocabulary {
  statuses: { value: AttendanceStatusValue; label: string }[];
  reason_codes: { value: OverrideReasonCode; label: string }[];
}

export interface DailyFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  employee?: number;
  department?: number;
  sap_segment?: string;
  /** Filters the EFFECTIVE status — what stands. */
  status?: AttendanceStatusValue;
  /** Filters the machine's own reading: "who did the machine miss?" */
  machine_status?: AttendanceStatusValue;
  is_overridden?: boolean;
  search?: string;
}

export interface OverrideRequest {
  status: AttendanceStatusValue;
  reason_code: OverrideReasonCode;
  reason: string;
}

// ===== Service =====

/**
 * One month as a register.
 *
 * A cell is deliberately tiny: a month is ~7,600 of them, and the grid only
 * needs an id to click and a letter to draw. `e` is present ONLY when the day
 * was corrected — its presence IS the override flag, which is why there is no
 * separate boolean. Everything the correction dialog needs (punch times,
 * reason, who) is fetched per row on click, not carried 7,600 times.
 */
export interface MusterCell {
  /** The DailyAttendance row id — what the override dialog is opened against. */
  id: number;
  /** What the machine recorded. */
  m: AttendanceStatusValue;
  /** What stands, present only when the day was corrected. */
  e?: AttendanceStatusValue;
}

/**
 * `days` is keyed by day-of-month as a string. Three states, never conflated:
 *  - a cell        — the day was synced
 *  - `null`        — in service, but nobody has synced that day yet
 *  - key missing   — the day was not theirs (before joining, after leaving)
 */
export interface MusterRow {
  employee: number;
  employee_code: string;
  employee_name: string;
  department_name: string | null;
  sap_segment: string;
  days: Record<string, MusterCell | null>;
  totals: Partial<Record<AttendanceStatusValue | 'not_synced', number>>;
}

export interface MusterResponse {
  month: string;
  date_from: string;
  date_to: string;
  days_in_month: number;
  meta: AttendanceSummary & { employee_count: number };
  pagination: { page: number; page_size: number; total: number; total_pages: number };
  data: MusterRow[];
}

export interface MusterFilters {
  month?: string;
  department?: number;
  sap_segment?: string;
  employee?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

function toParams(filters?: DailyFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (!filters) return params;
  if (filters.date) params.date = filters.date;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.employee) params.employee = filters.employee;
  if (filters.department) params.department = filters.department;
  if (filters.sap_segment) params.sap_segment = filters.sap_segment;
  if (filters.status) params.status = filters.status;
  if (filters.machine_status) params.machine_status = filters.machine_status;
  if (filters.is_overridden !== undefined) params.is_overridden = String(filters.is_overridden);
  if (filters.search) params.search = filters.search;
  return params;
}

export const attendanceApi = {
  /** One month as a register. */
  getMuster: async (filters?: MusterFilters): Promise<MusterResponse> => {
    const response = await apiClient.get<MusterResponse>(API_ENDPOINTS.ATTENDANCE.MUSTER, {
      params: filters ?? {},
    });
    return response.data;
  },

  /**
   * One row in full.
   *
   * The register's cells are too small to open the correction dialog with, so a
   * click fetches the whole row first. This is the detail route the daily sheet
   * never needed, because there it already holds every row it shows.
   */
  getRow: async (id: number): Promise<DailyAttendanceRow> => {
    const response = await apiClient.get<DailyAttendanceRow>(
      API_ENDPOINTS.ATTENDANCE.DAILY_DETAIL(id),
    );
    return response.data;
  },

  getDaily: async (filters?: DailyFilters): Promise<DailyAttendanceRow[]> => {
    const response = await apiClient.get<DailyAttendanceRow[]>(API_ENDPOINTS.ATTENDANCE.DAILY, {
      params: toParams(filters),
    });
    return response.data;
  },

  getSummary: async (filters?: DailyFilters): Promise<AttendanceSummary> => {
    const response = await apiClient.get<AttendanceSummary>(API_ENDPOINTS.ATTENDANCE.SUMMARY, {
      params: toParams(filters),
    });
    return response.data;
  },

  getVocabulary: async (): Promise<AttendanceVocabulary> => {
    const response = await apiClient.get<AttendanceVocabulary>(API_ENDPOINTS.ATTENDANCE.REASONS);
    return response.data;
  },

  /**
   * Whether the punch database is reachable and when it was last read.
   * A sheet full of absences looks identical whether the factory was shut or
   * the sync has not run since Tuesday; this is how the page tells them apart.
   */
  getSourceStatus: async (): Promise<SourceStatus> => {
    const response = await apiClient.get<SourceStatus>(API_ENDPOINTS.ATTENDANCE.SOURCE_STATUS, {
      // Stale punch data is a normal state to report, not a request that failed.
      // That is information for the banner, not an error toast on every poll.
      suppressErrorToast: true,
    });
    return response.data;
  },

  override: async (id: number, payload: OverrideRequest): Promise<DailyAttendanceRow> => {
    const response = await apiClient.post<DailyAttendanceRow>(
      API_ENDPOINTS.ATTENDANCE.OVERRIDE(id),
      payload,
    );
    return response.data;
  },

  revert: async (id: number, reason: string): Promise<DailyAttendanceRow> => {
    const response = await apiClient.post<DailyAttendanceRow>(
      API_ENDPOINTS.ATTENDANCE.REVERT(id),
      { reason },
    );
    return response.data;
  },

  getHistory: async (id: number): Promise<OverrideLogEntry[]> => {
    const response = await apiClient.get<OverrideLogEntry[]>(API_ENDPOINTS.ATTENDANCE.HISTORY(id));
    return response.data;
  },

  sync: async (dateFrom?: string, dateTo?: string) => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.SYNC, {
      date_from: dateFrom,
      date_to: dateTo,
    });
    return response.data;
  },

  getEmployees: async (search?: string): Promise<AttendanceEmployee[]> => {
    const response = await apiClient.get<AttendanceEmployee[]>(
      API_ENDPOINTS.ATTENDANCE.EMPLOYEES,
      { params: search ? { search } : {} },
    );
    return response.data;
  },

  exportUrl: (filters?: DailyFilters): string => {
    const params = new URLSearchParams(
      Object.entries(toParams(filters)).map(([k, v]) => [k, String(v)]),
    );
    return `${API_ENDPOINTS.ATTENDANCE.EXPORT}?${params.toString()}`;
  },
};
