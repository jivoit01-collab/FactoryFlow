import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/** One "this user manages this warehouse" row. */
export interface UserWarehouse {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  user_code: string;
  company: number;
  company_code: string;
  warehouse_code: string;
  is_active: boolean;
  assigned_by_name: string;
  created_at: string;
}

/**
 * What the current user is allowed to move, for the active company.
 *
 * `unrestricted` is true for superusers, who bypass the scoping entirely — a
 * screen must check it before concluding an empty `warehouse_codes` means "can
 * do nothing", or admins see every action disabled.
 */
export interface MyWarehouses {
  unrestricted: boolean;
  warehouse_codes: string[];
}

/** A user who can move stock but manages nothing, so is currently blocked. */
export interface WarehouseScopeGap {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
}

export interface AssignWarehousesPayload {
  user: number;
  warehouse_codes: string[];
}

export interface AssignWarehousesResult {
  created: string[];
  reactivated: string[];
  already_assigned: string[];
  assignments: UserWarehouse[];
}

export const userWarehouseApi = {
  async mine(): Promise<MyWarehouses> {
    const { data } = await apiClient.get<MyWarehouses>(API_ENDPOINTS.WAREHOUSE.MY_WAREHOUSES);
    return data;
  },

  async list(params?: { user?: number; activeOnly?: boolean }): Promise<UserWarehouse[]> {
    const { data } = await apiClient.get<UserWarehouse[]>(API_ENDPOINTS.WAREHOUSE.USER_WAREHOUSES, {
      params: {
        ...(params?.user ? { user: params.user } : {}),
        ...(params?.activeOnly ? { active_only: 'true' } : {}),
      },
    });
    return data;
  },

  async gaps(): Promise<WarehouseScopeGap[]> {
    const { data } = await apiClient.get<WarehouseScopeGap[]>(
      API_ENDPOINTS.WAREHOUSE.USER_WAREHOUSE_GAPS,
    );
    return data;
  },

  async assign(payload: AssignWarehousesPayload): Promise<AssignWarehousesResult> {
    const { data } = await apiClient.post<AssignWarehousesResult>(
      API_ENDPOINTS.WAREHOUSE.USER_WAREHOUSES,
      payload,
    );
    return data;
  },

  /** Removes by deactivating, so the record of who was responsible survives. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.WAREHOUSE.USER_WAREHOUSE_DETAIL(id));
  },

  async restore(id: number): Promise<UserWarehouse> {
    const { data } = await apiClient.patch<UserWarehouse>(
      API_ENDPOINTS.WAREHOUSE.USER_WAREHOUSE_DETAIL(id),
      { is_active: true },
    );
    return data;
  },
};
