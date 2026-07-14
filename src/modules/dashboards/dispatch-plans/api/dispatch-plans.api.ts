import { API_ENDPOINTS } from '@/config/constants';
import { apiClient, type ApiError } from '@/core/api';

import type {
  DispatchBill,
  DispatchBillSelectionPayload,
  DispatchBillSelectionResult,
  DispatchPlan,
  DispatchPlanFilters,
  DispatchPlansResponse,
  DispatchPlanUpdatePayload,
} from '../types';

const EP = API_ENDPOINTS.DISPATCH_PLANS;

const NULLABLE_VALUE_FIELDS = new Set<keyof DispatchPlanUpdatePayload>([
  'invoice_weight',
  'invoice_amount',
  'total_litres',
  'effective_month',
  'service_location_code',
  'sac_entry',
  'vehicle_id',
  'transporter_id',
  'driver_id',
  'linked_vehicle_entry_id',
  'dispatch_date',
  'bilty_date',
  'freight',
  'total_freight',
  'kanta_weight',
]);

export const dispatchPlansApi = {
  async getBills(filters: DispatchPlanFilters): Promise<DispatchPlansResponse> {
    const response = await apiClient.get<DispatchPlansResponse>(EP.BILLS, {
      params: buildParams(filters),
    });
    return response.data;
  },

  /**
   * Look up a single bill by its exact SAP invoice number. Unlike the list feed,
   * this bypasses the date window and row cap, so it finds a bill no matter how
   * far back it is. `companyCode` scopes the lookup to a specific company (the
   * Inside Vehicle Manager picker is cross-company); the request interceptor
   * leaves an explicit Company-Code header untouched. Returns null if not found.
   */
  async getBillByNumber(
    invoiceNumber: string,
    companyCode?: string,
  ): Promise<DispatchBill | null> {
    try {
      const response = await apiClient.get<DispatchBill>(EP.BILL_BY_NUMBER(invoiceNumber), {
        headers: companyCode ? { 'Company-Code': companyCode } : undefined,
      });
      return response.data;
    } catch (error) {
      if ((error as ApiError)?.status === 404) return null; // no such invoice
      throw error;
    }
  },

  /** Submit the Bill Selection page — persists which bills enter dispatch planning. */
  async submitBillSelection(
    payload: DispatchBillSelectionPayload,
  ): Promise<DispatchBillSelectionResult> {
    const response = await apiClient.post<DispatchBillSelectionResult>(
      EP.BILL_SELECTION,
      payload,
    );
    return response.data;
  },

  async updatePlan(docEntry: number, payload: DispatchPlanUpdatePayload): Promise<DispatchPlan> {
    const requestBody = buildUpdateBody(payload);
    const response = await apiClient.patch<DispatchPlan>(
      EP.PLAN(docEntry),
      requestBody,
      isFormData(requestBody) ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return response.data;
  },
};

function buildUpdateBody(payload: DispatchPlanUpdatePayload): DispatchPlanUpdatePayload | FormData {
  const normalizedPayload = normalizeUpdatePayload(payload);
  if (!isFile(normalizedPayload.bilty_attachment)) return normalizedPayload;

  const formData = new FormData();
  Object.entries(normalizedPayload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) formData.append(key, String(item));
      });
      return;
    }
    formData.append(key, isFile(value) ? value : String(value));
  });
  return formData;
}

function normalizeUpdatePayload(payload: DispatchPlanUpdatePayload): DispatchPlanUpdatePayload {
  return Object.entries(payload).reduce<DispatchPlanUpdatePayload>((normalized, [key, value]) => {
    const field = key as keyof DispatchPlanUpdatePayload;
    if (value === undefined) return normalized;

    if (field === 'bilty_attachment') {
      if (isFile(value)) normalized.bilty_attachment = value;
      return normalized;
    }

    if (value === '' && NULLABLE_VALUE_FIELDS.has(field)) {
      normalized[field] = null;
      return normalized;
    }

    normalized[field] = value as never;
    return normalized;
  }, {});
}

function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function buildParams(filters: DispatchPlanFilters): Record<string, string> {
  const params: Record<string, string> = {
    date_from: filters.date_from,
    date_to: filters.date_to,
  };
  if (filters.booking_status && filters.booking_status !== 'all') {
    params.booking_status = filters.booking_status;
  }
  if (filters.search) params.search = filters.search;
  if (filters.branch) params.branch = filters.branch;
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.exclude_jivo_mart_transfer) params.exclude_jivo_mart_transfer = 'true';
  if (filters.by_dispatch_date) params.by_dispatch_date = 'true';
  if (filters.all_companies) params.all_companies = '1';
  if (filters.selected_only) params.selected_only = 'true';
  return params;
}
