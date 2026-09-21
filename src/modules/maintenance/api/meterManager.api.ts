import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

const EP = API_ENDPOINTS.MAINTENANCE;

/** One "this user keeps this meter" row. */
export interface UserElectricityMeter {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  user_code: string;
  meter: number;
  meter_name: string;
  meter_number: string;
  meter_location: string;
  meter_is_main: boolean;
  is_active: boolean;
  assigned_by_name: string;
  created_at: string;
}

/**
 * Which meters the current user may edit and record against.
 *
 * `unrestricted` is true for superusers, who bypass the scoping entirely — a
 * screen must check it before concluding an empty `meter_ids` means "can do
 * nothing", or admins see every action disabled.
 */
export interface MyElectricityMeters {
  unrestricted: boolean;
  meter_ids: number[];
  meters: { id: number; name: string }[];
}

/** Both halves of a misconfiguration: locked-out people, and unkept meters. */
export interface MeterScopeGaps {
  users_without_meters: {
    id: number;
    full_name: string;
    email: string;
    employee_code: string;
  }[];
  meters_without_managers: { id: number; name: string; location: string }[];
}

export interface AssignMetersPayload {
  user: number;
  meters: number[];
}

export interface AssignMetersResult {
  created: number[];
  reactivated: number[];
  already_assigned: number[];
  assignments: UserElectricityMeter[];
}

export const meterManagerApi = {
  async mine(): Promise<MyElectricityMeters> {
    const { data } = await apiClient.get<MyElectricityMeters>(EP.MY_ELECTRICITY_METERS);
    return data;
  },

  async list(params?: { user?: number; activeOnly?: boolean }): Promise<UserElectricityMeter[]> {
    const { data } = await apiClient.get<UserElectricityMeter[]>(EP.USER_ELECTRICITY_METERS, {
      params: {
        ...(params?.user ? { user: params.user } : {}),
        ...(params?.activeOnly ? { active_only: 'true' } : {}),
      },
    });
    return data;
  },

  async gaps(): Promise<MeterScopeGaps> {
    const { data } = await apiClient.get<MeterScopeGaps>(EP.USER_ELECTRICITY_METER_GAPS);
    return data;
  },

  async assign(payload: AssignMetersPayload): Promise<AssignMetersResult> {
    const { data } = await apiClient.post<AssignMetersResult>(
      EP.USER_ELECTRICITY_METERS,
      payload,
    );
    return data;
  },

  /** Removes by deactivating, so the record of who was responsible survives. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(EP.USER_ELECTRICITY_METER_DETAIL(id));
  },

  async restore(id: number): Promise<UserElectricityMeter> {
    const { data } = await apiClient.patch<UserElectricityMeter>(
      EP.USER_ELECTRICITY_METER_DETAIL(id),
      { is_active: true },
    );
    return data;
  },
};
