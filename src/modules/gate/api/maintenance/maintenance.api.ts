import { apiClient } from '@/core/api'

// Types
export interface UnitChoice {
  id: number
  name: string
}

export interface MaintenanceType {
  id: number
  type_name: string
  description: string
  is_active: boolean
}

export interface MaintenanceEntryType {
  id: number
  type_name: string
}

export interface MaintenanceEntryDepartment {
  id: number
  name: string
}

export interface MaintenanceEntry {
  id: number
  maintenance_type: MaintenanceEntryType | number
  work_order_number?: string
  supplier_name: string
  material_description: string
  part_number?: string
  quantity: number | string
  unit: UnitChoice | number
  invoice_number?: string
  equipment_id?: string
  receiving_department: MaintenanceEntryDepartment | number
  urgency_level: string
  inward_time?: string
  remarks?: string
}

export interface CreateMaintenanceRequest {
  maintenance_type: number
  supplier_name: string
  material_description: string
  part_number?: string
  quantity: number
  unit: number
  invoice_number?: string
  equipment_id?: string
  receiving_department: number
  urgency_level: string
  remarks?: string
}

export interface CreateMaintenanceResponse {
  message: string
  id: number
  work_order_number: string
}

// Full view types for Review page
export interface MaintenanceFullViewGateEntry {
  id: number
  entry_no: string
  status: string
  is_locked: boolean
  created_at: string
  entry_type: string
}

export interface MaintenanceFullViewVehicle {
  vehicle_number: string
  vehicle_type: { id: number; name: string }
  capacity_ton: number
}

export interface MaintenanceFullViewDriver {
  name: string
  mobile_no: string
  license_no: string
}

export interface MaintenanceFullViewSecurityCheck {
  vehicle_condition_ok: boolean
  tyre_condition_ok: boolean
  alcohol_test_passed: boolean
  is_submitted: boolean
  remarks?: string
  inspected_by: string
}

export interface MaintenanceFullViewDetails {
  work_order_number: string
  maintenance_type: string
  supplier_name: string
  material_description: string
  part_number?: string
  quantity: number
  unit: string
  invoice_number?: string
  equipment_id?: string
  receiving_department: string
  urgency_level: string
  inward_time: string
  remarks?: string
  created_by: string
  created_at: string
}

export interface MaintenanceFullView {
  gate_entry: MaintenanceFullViewGateEntry
  vehicle: MaintenanceFullViewVehicle
  driver: MaintenanceFullViewDriver
  security_check?: MaintenanceFullViewSecurityCheck
  maintenance_details?: MaintenanceFullViewDetails
}

// API functions
export const maintenanceApi = {
  /**
   * Get unit choices for dropdown
   */
  getUnitChoices: async (): Promise<UnitChoice[]> => {
    const response = await apiClient.get<UnitChoice[]>(
      '/gate-core/unit-choices/'
    )
    return response.data
  },

  /**
   * Get maintenance types for dropdown
   */
  getTypes: async (): Promise<MaintenanceType[]> => {
    const response = await apiClient.get<MaintenanceType[]>(
      '/maintenance-gatein/gate-entries/maintenance/types/'
    )
    return response.data
  },

  /**
   * Get maintenance entry by vehicle entry ID
   */
  getByEntryId: async (entryId: number): Promise<MaintenanceEntry> => {
    const response = await apiClient.get<MaintenanceEntry>(
      `/maintenance-gatein/gate-entries/${entryId}/maintenance/`
    )
    return response.data
  },

  /**
   * Create maintenance entry for a vehicle entry
   */
  create: async (entryId: number, data: CreateMaintenanceRequest): Promise<CreateMaintenanceResponse> => {
    const response = await apiClient.post<CreateMaintenanceResponse>(
      `/maintenance-gatein/gate-entries/${entryId}/maintenance/`,
      data
    )
    return response.data
  },

  /**
   * Update maintenance entry for a vehicle entry
   */
  update: async (entryId: number, data: CreateMaintenanceRequest): Promise<CreateMaintenanceResponse> => {
    const response = await apiClient.put<CreateMaintenanceResponse>(
      `/maintenance-gatein/gate-entries/${entryId}/maintenance/update/`,
      data
    )
    return response.data
  },

  /**
   * Get full maintenance gate entry view for review page
   */
  getFullView: async (entryId: number): Promise<MaintenanceFullView> => {
    const response = await apiClient.get<MaintenanceFullView>(
      `/gate-core/maintenance-gate-entry/${entryId}/`
    )
    return response.data
  },

  /**
   * Complete a maintenance gate entry
   */
  complete: async (entryId: number): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      `/maintenance-gatein/gate-entries/${entryId}/complete/`
    )
    return response.data
  },
}
