import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

export type CostBasis =
  | 'PER_DAY'
  | 'PER_PERSON_DAY'
  | 'PER_HOUR'
  | 'PER_MONTH'
  | 'PER_UNIT'
  | 'PER_CASE'
  | 'PER_BOTTLE'
  | 'PER_KG'
  | 'PER_LITRE'
  | 'FLAT';

export type CostScope = 'FACTORY' | 'COMPANY' | 'DEPARTMENT' | 'VALUE';

export interface CostType {
  id: number;
  code: string;
  name: string;
  description: string;
  default_basis: CostBasis;
  default_basis_display: string;
  is_credit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostTypeCreateRequest {
  code: string;
  name: string;
  description?: string;
  default_basis?: CostBasis;
  is_credit?: boolean;
}

export type CostTypeUpdateRequest = Partial<Omit<CostTypeCreateRequest, 'code'>> & {
  is_active?: boolean;
};

export interface CostRate {
  id: number;
  cost_type: number;
  cost_type_code: string;
  cost_type_name: string;
  is_credit: boolean;
  scope: CostScope;
  scope_display: string;
  company: number | null;
  company_code: string | null;
  department: number | null;
  department_name: string | null;
  value_key: string;
  basis: CostBasis;
  basis_display: string;
  rate: string;
  effective_from: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostRateListParams {
  cost_type_id?: number;
  scope?: CostScope;
  company_id?: number;
  department_id?: number;
  value_key?: string;
  /** Rates in force on this date (default: today). */
  as_of?: string;
  /** Every dated row instead of just the ones in force — the audit trail. */
  history?: boolean;
}

export interface CostRateUpsertRequest {
  cost_type_id: number;
  scope: CostScope;
  company_id?: number | null;
  department_id?: number | null;
  value_key?: string;
  basis?: CostBasis;
  rate: string;
  notes?: string;
  /** Omitted = effective today. Saving adds a new dated row; it never overwrites. */
  effective_from?: string;
}

/** Org-wide department (accounts.Department) — the DEPARTMENT scope target. */
export interface OrgDepartment {
  id: number;
  name: string;
  description?: string;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  const queryParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) {
      queryParams.append(key, String(value === true ? 1 : value));
    }
  });
  const query = queryParams.toString();
  return query ? `?${query}` : '';
}

export const costMasterApi = {
  async getCostTypes(includeInactive?: boolean): Promise<CostType[]> {
    const response = await apiClient.get<CostType[]>(
      `${API_ENDPOINTS.COST_MASTER.COST_TYPES}${buildQuery({ include_inactive: includeInactive })}`,
    );
    return response.data;
  },

  async createCostType(data: CostTypeCreateRequest): Promise<CostType> {
    const response = await apiClient.post<CostType>(API_ENDPOINTS.COST_MASTER.COST_TYPES, data);
    return response.data;
  },

  async updateCostType(costTypeId: number, data: CostTypeUpdateRequest): Promise<CostType> {
    const response = await apiClient.patch<CostType>(
      API_ENDPOINTS.COST_MASTER.COST_TYPE_DETAIL(costTypeId),
      data,
    );
    return response.data;
  },

  async deleteCostType(costTypeId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.COST_MASTER.COST_TYPE_DETAIL(costTypeId));
  },

  async getRates(params?: CostRateListParams): Promise<CostRate[]> {
    const response = await apiClient.get<CostRate[]>(
      `${API_ENDPOINTS.COST_MASTER.RATES}${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
    );
    return response.data;
  },

  async upsertRate(data: CostRateUpsertRequest): Promise<CostRate> {
    const response = await apiClient.post<CostRate>(API_ENDPOINTS.COST_MASTER.RATES, data);
    return response.data;
  },

  async deleteRate(rateId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.COST_MASTER.RATE_DETAIL(rateId));
  },

  async getDepartments(): Promise<OrgDepartment[]> {
    const response = await apiClient.get<OrgDepartment[]>(API_ENDPOINTS.ACCOUNTS.DEPARTMENTS);
    return response.data;
  },
};
