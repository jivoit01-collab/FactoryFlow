import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/**
 * The company vehicle register's API.
 *
 * Writes go out as `FormData` whenever a bill photo is attached and as JSON
 * otherwise, because the backend accepts both and multipart for a plain text
 * entry would only make the payload harder to read in a network log.
 */

export type VehicleCategory =
  | 'TRUCK'
  | 'TEMPO'
  | 'CAR'
  | 'VAN'
  | 'TWO_WHEELER'
  | 'TRACTOR'
  | 'FORKLIFT'
  | 'OTHER';

export type FuelTypeCode = 'DIESEL' | 'PETROL' | 'CNG' | 'PETROL_CNG' | 'ELECTRIC';
export type VehicleStatusCode = 'ACTIVE' | 'IN_WORKSHOP' | 'STANDBY' | 'SOLD';
export type ApprovalStatusCode = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentModeCode = 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
export type DocumentExpiryState = 'EXPIRED' | 'EXPIRING' | 'OK';

export interface Choice {
  value: string;
  label: string;
}

/** A fuel a vehicle may actually be filled with, with the unit it is sold in. */
export interface FillableFuel extends Choice {
  unit: string;
}

/** Everything the forms need to draw themselves, plus this user's rights. */
export interface FleetOptions {
  categories: Choice[];
  fuel_types: Choice[];
  fillable_fuels: FillableFuel[];
  vehicle_statuses: Choice[];
  payment_modes: Choice[];
  service_kinds: Choice[];
  document_kinds: Choice[];
  approval_statuses: Choice[];
  document_warning_days: number;
  service_due_warning_km: number;
  can_manage_vehicles: boolean;
  can_add_expense: boolean;
  can_approve_expense: boolean;
}

export interface FleetVehicle {
  id: number;
  vehicle_number: string;
  nickname: string;
  /** Number plus nickname, the way the server spells it. */
  display_name: string;
  category: VehicleCategory;
  category_label: string;
  fuel_type: FuelTypeCode;
  fuel_type_label: string;
  /** `L`, `Kg`, or `L/Kg` for a dual-fuel vehicle. */
  fuel_unit: string;
  /** What this vehicle's fuel form may offer. One entry means no choice. */
  fuels_allowed: FillableFuel[];
  make_model: string;
  status: VehicleStatusCode;
  status_label: string;
  purchase_date: string | null;
  purchase_value: string | null;
  assigned_to: string;
  department: string;
  opening_odometer: number | null;
  /** Highest reading on any entry — what the forms prefill and check against. */
  last_odometer: number | null;
  remarks: string;
  photo_url: string | null;
  document_alerts: { expired: number; expiring: number };
  next_service: { date: string | null; odometer: number | null; due: boolean } | null;
  last_mileage: {
    value: string;
    unit: string;
    fuel_type: FuelTypeCode;
    on: string;
  } | null;
  is_active: boolean;
  created_at: string;
}

export interface FuelEntry {
  id: number;
  vehicle: number;
  vehicle_number: string;
  vehicle_nickname: string;
  entry_date: string;
  fuel_type: FuelTypeCode;
  fuel_type_label: string;
  /** `L` or `Kg` — follows the fuel, never stored separately. */
  unit: string;
  odometer: number;
  quantity: string;
  rate: string | null;
  amount: string;
  is_tank_full: boolean;
  station_name: string;
  bill_number: string;
  bill_photo_url: string | null;
  payment_mode: PaymentModeCode;
  payment_mode_label: string;
  filled_by: string;
  remarks: string;
  odometer_note: string;
  /** Km since the previous filling of the same fuel. Null where unknown. */
  distance_km: number | null;
  /** Full tank to full tank only. Null on a part fill and on the first fill. */
  mileage: string | null;
  mileage_unit: string;
  entered_by_name: string | null;
  created_at: string;
}

export interface ServiceEntry {
  id: number;
  vehicle: number;
  vehicle_number: string;
  vehicle_nickname: string;
  entry_date: string;
  odometer: number | null;
  kind: string;
  kind_label: string;
  workshop_name: string;
  description: string;
  parts_amount: string;
  labour_amount: string;
  total_amount: string;
  bill_number: string;
  bill_photo_url: string | null;
  payment_mode: PaymentModeCode;
  payment_mode_label: string;
  next_service_date: string | null;
  next_service_odometer: number | null;
  down_days: number | null;
  remarks: string;
  approval_status: ApprovalStatusCode;
  approval_status_label: string;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string;
  entered_by_name: string | null;
  created_at: string;
}

export interface DailyReading {
  id: number;
  vehicle: number;
  vehicle_number: string;
  vehicle_nickname: string;
  reading_date: string;
  odometer: number;
  remarks: string;
  entered_by_name: string | null;
  created_at: string;
}

/** One day of one vehicle's life. Nulls mean "not known", never zero. */
export interface RunningLogDay {
  date: string;
  /** The day's closing meter, from a reading or from a filling. */
  odometer: number | null;
  distance_km: number | null;
  /**
   * How many days the distance covers. 1 is "since yesterday"; more means
   * nobody read the meter in between, so it is a stretch, not a day's running.
   */
  covers_days: number | null;
  fuel_quantity: string | null;
  fuel_cost: string | null;
  fuel_fills: number;
  fuel_unit: string;
  service_cost: string | null;
  remarks: string;
}

export interface RunningLogTotals {
  distance_km: number;
  fuel_quantity: string;
  fuel_cost: string;
  service_cost: string;
  total_cost: string;
  cost_per_km: string | null;
  days_in_range: number;
  days_with_reading: number;
  days_missing: number;
}

/** One vehicle's whole window, for the fleet-wide view. */
export interface RunningLogVehicleRow extends RunningLogTotals {
  vehicle_id: number;
  vehicle_number: string;
  nickname: string;
  category: VehicleCategory;
  fuel_unit: string;
  last_odometer: number | null;
}

export interface RunningLog {
  from: string;
  to: string;
  /** Set when one vehicle was asked for; null for the fleet-wide view. */
  vehicle: FleetVehicle | null;
  rows: RunningLogDay[] | RunningLogVehicleRow[];
  totals?: RunningLogTotals;
}

export interface VehicleDocument {
  id: number;
  vehicle: number;
  vehicle_number: string;
  doc_type: string;
  doc_type_label: string;
  document_number: string;
  issuing_authority: string;
  issue_date: string | null;
  expiry_date: string;
  amount: string | null;
  remarks: string;
  file_url: string | null;
  days_to_expiry: number;
  expiry_state: DocumentExpiryState;
  created_at: string;
}

export interface FleetSummary {
  month: string;
  vehicle_count: number;
  by_status: Record<string, number>;
  month_fuel_cost: string;
  month_fuel_quantity: string;
  month_service_cost: string;
  month_total_cost: string;
  /** Workshop bills only — a filling is never pending. */
  pending_approvals: { service: number; total: number };
  expiring_documents: number;
  expired_documents: number;
}

export interface VehicleSummary {
  vehicle: FleetVehicle;
  fuel_cost: string;
  fuel_quantity: string;
  fill_count: number;
  service_cost: string;
  service_count: number;
  total_cost: string;
  distance_km: number | null;
  cost_per_km: string | null;
  mileage_by_fuel: Record<string, string>;
  pending_service: number;
  monthly: { month: string; fuel: string; service: string; total: string }[];
}

export interface CostReportRow {
  vehicle_id: number;
  vehicle_number: string;
  nickname: string;
  category: VehicleCategory;
  fuel_type: FuelTypeCode;
  fuel_cost: string;
  fuel_quantity: string;
  service_cost: string;
  total_cost: string;
  distance_km: number | null;
  cost_per_km: string | null;
  mileage_by_fuel: Record<string, string>;
}

export interface CostReport {
  from: string | null;
  to: string | null;
  rows: CostReportRow[];
  totals: { fuel_cost: string; service_cost: string; total_cost: string };
}

export interface VehicleListParams {
  search?: string;
  category?: string;
  status?: string;
  fuel_type?: string;
  include_inactive?: boolean;
}

export interface EntryListParams {
  vehicle?: number;
  from?: string;
  to?: string;
  approval_status?: string;
  search?: string;
}

/** A form's values: anything the two entry forms send, files included. */
export type WritePayload = Record<string, string | number | boolean | File | null | undefined>;

/**
 * Multipart when there is a file, JSON otherwise.
 *
 * Empty strings are dropped rather than sent: Django rejects `''` for a date
 * or a number, and an untouched optional box is exactly that.
 */
function toRequest(payload: WritePayload): { data: FormData | WritePayload; headers?: object } {
  const hasFile = Object.values(payload).some((value) => value instanceof File);
  if (!hasFile) {
    const clean: WritePayload = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      clean[key] = value;
    });
    return { data: clean };
  }

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    form.append(key, value instanceof File ? value : String(value));
  });
  return { data: form, headers: { 'Content-Type': 'multipart/form-data' } };
}

// `object` rather than a Record: an interface without an index signature is
// not assignable to one, and every caller here passes a named params type.
function params(query: object) {
  const search = new URLSearchParams();
  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === false) return;
    search.append(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Which stored file an attachment URL refers to. */
export type AttachmentKind = 'fuel' | 'service' | 'document' | 'vehicle';

export const fleetApi = {
  /**
   * One stored file as a blob.
   *
   * Fetched through the API rather than linked to directly: the endpoint is
   * permission checked, so the request has to carry the auth header, and a
   * plain `<a href>` would not. The caller revokes the object URL it makes.
   */
  async attachment(kind: AttachmentKind, id: number): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(API_ENDPOINTS.FLEET.ATTACHMENT(kind, id), {
      responseType: 'blob',
    });
    return data;
  },

  async options(): Promise<FleetOptions> {
    const response = await apiClient.get<FleetOptions>(API_ENDPOINTS.FLEET.OPTIONS);
    return response.data;
  },

  async summary(): Promise<FleetSummary> {
    const response = await apiClient.get<FleetSummary>(API_ENDPOINTS.FLEET.SUMMARY);
    return response.data;
  },

  async costReport(range: { from?: string; to?: string } = {}): Promise<CostReport> {
    const response = await apiClient.get<CostReport>(
      `${API_ENDPOINTS.FLEET.COST_REPORT}${params(range)}`,
    );
    return response.data;
  },

  async vehicles(query: VehicleListParams = {}): Promise<FleetVehicle[]> {
    const response = await apiClient.get<FleetVehicle[]>(
      `${API_ENDPOINTS.FLEET.VEHICLES}${params(query)}`,
    );
    return response.data;
  },

  async vehicle(id: number): Promise<FleetVehicle> {
    const response = await apiClient.get<FleetVehicle>(API_ENDPOINTS.FLEET.VEHICLE_BY_ID(id));
    return response.data;
  },

  async vehicleSummary(id: number, range: { from?: string; to?: string } = {}) {
    const response = await apiClient.get<VehicleSummary>(
      `${API_ENDPOINTS.FLEET.VEHICLE_SUMMARY(id)}${params(range)}`,
    );
    return response.data;
  },

  async createVehicle(payload: WritePayload): Promise<FleetVehicle> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.post<FleetVehicle>(API_ENDPOINTS.FLEET.VEHICLES, data, {
      headers,
    });
    return response.data;
  },

  async updateVehicle(id: number, payload: WritePayload): Promise<FleetVehicle> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.patch<FleetVehicle>(
      API_ENDPOINTS.FLEET.VEHICLE_BY_ID(id),
      data,
      { headers },
    );
    return response.data;
  },

  async retireVehicle(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FLEET.VEHICLE_BY_ID(id));
  },

  /**
   * The day-wise log for one vehicle, or one row per vehicle for the fleet.
   *
   * Which shape comes back is decided by whether `vehicle` was passed, and the
   * response says so in its own `vehicle` field rather than leaving the caller
   * to remember what it asked for.
   */
  async runningLog(query: { vehicle?: number; from?: string; to?: string } = {}) {
    const response = await apiClient.get<RunningLog>(
      `${API_ENDPOINTS.FLEET.RUNNING_LOG}${params(query)}`,
    );
    return response.data;
  },

  async dailyReadings(
    query: { vehicle?: number; from?: string; to?: string } = {},
  ): Promise<DailyReading[]> {
    const response = await apiClient.get<DailyReading[]>(
      `${API_ENDPOINTS.FLEET.DAILY_READINGS}${params(query)}`,
    );
    return response.data;
  },

  /** Upsert: posting a day that already has a reading overwrites it. */
  async saveDailyReading(payload: WritePayload): Promise<DailyReading> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.post<DailyReading>(
      API_ENDPOINTS.FLEET.DAILY_READINGS,
      data,
      { headers },
    );
    return response.data;
  },

  async deleteDailyReading(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FLEET.DAILY_READING_BY_ID(id));
  },

  async fuelEntries(query: EntryListParams = {}): Promise<FuelEntry[]> {
    const response = await apiClient.get<FuelEntry[]>(
      `${API_ENDPOINTS.FLEET.FUEL_ENTRIES}${params(query)}`,
    );
    return response.data;
  },

  async createFuelEntry(payload: WritePayload): Promise<FuelEntry> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.post<FuelEntry>(API_ENDPOINTS.FLEET.FUEL_ENTRIES, data, {
      headers,
    });
    return response.data;
  },

  async updateFuelEntry(id: number, payload: WritePayload): Promise<FuelEntry> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.patch<FuelEntry>(
      API_ENDPOINTS.FLEET.FUEL_ENTRY_BY_ID(id),
      data,
      { headers },
    );
    return response.data;
  },

  async deleteFuelEntry(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FLEET.FUEL_ENTRY_BY_ID(id));
  },

  async serviceEntries(query: EntryListParams = {}): Promise<ServiceEntry[]> {
    const response = await apiClient.get<ServiceEntry[]>(
      `${API_ENDPOINTS.FLEET.SERVICE_ENTRIES}${params(query)}`,
    );
    return response.data;
  },

  async createServiceEntry(payload: WritePayload): Promise<ServiceEntry> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.post<ServiceEntry>(API_ENDPOINTS.FLEET.SERVICE_ENTRIES, data, {
      headers,
    });
    return response.data;
  },

  async updateServiceEntry(id: number, payload: WritePayload): Promise<ServiceEntry> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.patch<ServiceEntry>(
      API_ENDPOINTS.FLEET.SERVICE_ENTRY_BY_ID(id),
      data,
      { headers },
    );
    return response.data;
  },

  async deleteServiceEntry(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FLEET.SERVICE_ENTRY_BY_ID(id));
  },

  async decideServiceEntry(
    id: number,
    decision: { approval_status: 'APPROVED' | 'REJECTED'; rejection_reason?: string },
  ): Promise<ServiceEntry> {
    const response = await apiClient.post<ServiceEntry>(
      API_ENDPOINTS.FLEET.SERVICE_ENTRY_APPROVAL(id),
      decision,
    );
    return response.data;
  },

  /** Workshop bills waiting to be passed. Fuel has no approval, so none here. */
  async pendingApprovals(): Promise<{ service: ServiceEntry[] }> {
    const response = await apiClient.get<{ service: ServiceEntry[] }>(
      API_ENDPOINTS.FLEET.PENDING_APPROVALS,
    );
    return response.data;
  },

  async documents(query: { vehicle?: number; doc_type?: string } = {}): Promise<VehicleDocument[]> {
    const response = await apiClient.get<VehicleDocument[]>(
      `${API_ENDPOINTS.FLEET.DOCUMENTS}${params(query)}`,
    );
    return response.data;
  },

  async expiringDocuments(days?: number): Promise<{ days: number; rows: VehicleDocument[] }> {
    const response = await apiClient.get<{ days: number; rows: VehicleDocument[] }>(
      `${API_ENDPOINTS.FLEET.DOCUMENTS_EXPIRING}${params({ days })}`,
    );
    return response.data;
  },

  async createDocument(payload: WritePayload): Promise<VehicleDocument> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.post<VehicleDocument>(API_ENDPOINTS.FLEET.DOCUMENTS, data, {
      headers,
    });
    return response.data;
  },

  async updateDocument(id: number, payload: WritePayload): Promise<VehicleDocument> {
    const { data, headers } = toRequest(payload);
    const response = await apiClient.patch<VehicleDocument>(
      API_ENDPOINTS.FLEET.DOCUMENT_BY_ID(id),
      data,
      { headers },
    );
    return response.data;
  },

  async deleteDocument(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FLEET.DOCUMENT_BY_ID(id));
  },
};
