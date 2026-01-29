import { apiClient } from '@/core/api'

// Types
export interface ConstructionCategory {
  id: number
  category_name: string
  description: string
  is_active: boolean
}

export interface ConstructionEntryCategory {
  id: number
  category_name: string
}

export interface ConstructionEntry {
  id: number
  project_name: string
  work_order_number: string
  contractor_name: string
  contractor_contact?: string
  vehicle_number?: string
  material_category: ConstructionEntryCategory | number
  material_description: string
  quantity: number | string
  unit: string
  challan_number?: string
  invoice_number?: string
  site_engineer: string
  security_approval: string
  inward_time?: string
  remarks?: string
}

export interface CreateConstructionRequest {
  project_name: string
  work_order_number?: string
  contractor_name: string
  contractor_contact?: string
  vehicle_number?: string
  material_category: number
  material_description: string
  quantity: number
  unit: string
  challan_number?: string
  invoice_number?: string
  site_engineer: string
  security_approval: string
  remarks?: string
}

export interface CreateConstructionResponse {
  message: string
  id: number
}

// Full view types for Review page
export interface ConstructionFullViewGateEntry {
  id: number
  entry_no: string
  status: string
  is_locked: boolean
  created_at: string
  entry_type: string
}

export interface ConstructionFullViewVehicle {
  vehicle_number: string
  vehicle_type: string
  capacity_ton: number
}

export interface ConstructionFullViewDriver {
  name: string
  mobile_no: string
  license_no: string
}

export interface ConstructionFullViewSecurityCheck {
  vehicle_condition_ok: boolean
  tyre_condition_ok: boolean
  alcohol_test_passed: boolean
  is_submitted: boolean
  remarks?: string
  inspected_by: string
}

export interface ConstructionFullViewDetails {
  project_name: string
  work_order_number: string
  contractor_name: string
  contractor_contact?: string
  vehicle_number?: string
  material_category: string
  material_description: string
  quantity: number
  unit: string
  challan_number?: string
  invoice_number?: string
  site_engineer: string
  security_approval: string
  inward_time: string
  remarks?: string
  created_by: string
  created_at: string
}

export interface ConstructionFullView {
  gate_entry: ConstructionFullViewGateEntry
  vehicle: ConstructionFullViewVehicle
  driver: ConstructionFullViewDriver
  security_check?: ConstructionFullViewSecurityCheck
  construction_details?: ConstructionFullViewDetails
}

// API functions
export const constructionApi = {
  /**
   * Get construction categories for dropdown
   */
  getCategories: async (): Promise<ConstructionCategory[]> => {
    const response = await apiClient.get<ConstructionCategory[]>(
      '/construction-gatein/gate-entries/construction/categories/'
    )
    return response.data
  },

  /**
   * Get construction entry by vehicle entry ID
   */
  getByEntryId: async (entryId: number): Promise<ConstructionEntry> => {
    const response = await apiClient.get<ConstructionEntry>(
      `/construction-gatein/gate-entries/${entryId}/construction/`
    )
    return response.data
  },

  /**
   * Create construction entry for a vehicle entry
   */
  create: async (entryId: number, data: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
    const response = await apiClient.post<CreateConstructionResponse>(
      `/construction-gatein/gate-entries/${entryId}/construction/`,
      data
    )
    return response.data
  },

  /**
   * Update construction entry for a vehicle entry
   */
  update: async (entryId: number, data: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
    const response = await apiClient.put<CreateConstructionResponse>(
      `/construction-gatein/gate-entries/${entryId}/construction/update/`,
      data
    )
    return response.data
  },

  /**
   * Get full construction gate entry view for review page
   */
  getFullView: async (entryId: number): Promise<ConstructionFullView> => {
    const response = await apiClient.get<ConstructionFullView>(
      `/gate-core/construction-gate-entry/${entryId}/`
    )
    return response.data
  },

  /**
   * Complete a construction gate entry
   */
  complete: async (entryId: number): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      `/construction-gatein/gate-entries/${entryId}/complete/`
    )
    return response.data
  },
}
