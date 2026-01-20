import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'

export interface SecurityCheck {
  id?: number
  vehicle_condition_ok: boolean
  tyre_condition_ok: boolean
  fire_extinguisher_available: boolean
  seal_no_before: string
  seal_no_after?: string
  alcohol_test_done: boolean
  alcohol_test_passed?: boolean
  inspected_by_name: string
  inspection_time?: string
  remarks?: string
  is_submitted?: boolean
}

export interface CreateSecurityCheckRequest {
  vehicle_condition_ok: boolean
  tyre_condition_ok: boolean
  fire_extinguisher_available: boolean
  seal_no_before: string
  seal_no_after?: string
  alcohol_test_done: boolean
  alcohol_test_passed?: boolean
  inspected_by_name: string
  remarks?: string
}

export const securityCheckApi = {
  async get(entryId: number): Promise<SecurityCheck> {
    const response = await apiClient.get<SecurityCheck>(
      API_ENDPOINTS.SECURITY.GATE_ENTRY_SECURITY_VIEW(entryId)
    )
    return response.data
  },

  async create(entryId: number, data: CreateSecurityCheckRequest): Promise<SecurityCheck> {
    // API expects form-data format
    const formData = new FormData()
    formData.append('vehicle_condition_ok', data.vehicle_condition_ok.toString())
    formData.append('tyre_condition_ok', data.tyre_condition_ok.toString())
    formData.append('fire_extinguisher_available', data.fire_extinguisher_available.toString())
    formData.append('seal_no_before', data.seal_no_before)
    if (data.seal_no_after) {
      formData.append('seal_no_after', data.seal_no_after)
    }
    formData.append('alcohol_test_done', data.alcohol_test_done.toString())
    if (data.alcohol_test_passed !== undefined) {
      formData.append('alcohol_test_passed', data.alcohol_test_passed.toString())
    }
    formData.append('inspected_by_name', data.inspected_by_name)
    if (data.remarks) {
      formData.append('remarks', data.remarks)
    }

    const response = await apiClient.post<SecurityCheck>(
      API_ENDPOINTS.SECURITY.GATE_ENTRY_SECURITY(entryId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}