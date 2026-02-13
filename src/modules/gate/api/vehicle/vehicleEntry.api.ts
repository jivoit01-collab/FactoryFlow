import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'

import type { Driver } from '../driver/driver.api'
import type { Vehicle } from './vehicle.api'

export interface VehicleEntry {
  id: number
  entry_no: string
  status: string
  entry_type?: string
  vehicle?: Vehicle
  driver?: Driver
  remarks?: string
  entry_time?: string
  created_at?: string
}

export interface CreateVehicleEntryRequest {
  entry_no: string
  vehicle: number
  driver: number
  remarks?: string
  entry_type: string
}

export interface UpdateVehicleEntryRequest {
  vehicle: number
  driver: number
  remarks?: string
}

export interface VehicleEntriesParams {
  from_date?: string // Format: YYYY-MM-DD
  to_date?: string // Format: YYYY-MM-DD
  entry_type?: string // e.g., 'RAW_MATERIAL'
  status?: string // e.g., 'DRAFT', 'IN_PROGRESS', etc.
}

export interface StatusCount {
  status: string
  count: number
}

export interface VehicleEntriesCountResponse {
  total_vehicle_entries: StatusCount[]
}

export const vehicleEntryApi = {
  async getList(params?: VehicleEntriesParams): Promise<VehicleEntry[]> {
    const queryParams = new URLSearchParams()
    if (params?.from_date) {
      queryParams.append('from_date', params.from_date)
    }
    if (params?.to_date) {
      queryParams.append('to_date', params.to_date)
    }
    if (params?.entry_type) {
      queryParams.append('entry_type', params.entry_type)
    }
    if (params?.status) {
      queryParams.append('status', params.status)
    }

    // Use list-by-status endpoint when status filter is provided
    const baseUrl = params?.status
      ? API_ENDPOINTS.VEHICLE.VEHICLE_ENTRIES_BY_STATUS
      : API_ENDPOINTS.VEHICLE.VEHICLE_ENTRIES

    const url = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl

    const response = await apiClient.get<VehicleEntry[]>(url)
    return response.data
  },

  async getById(id: number): Promise<VehicleEntry> {
    const response = await apiClient.get<VehicleEntry>(
      API_ENDPOINTS.VEHICLE.VEHICLE_ENTRY_BY_ID(id)
    )
    return response.data
  },

  async create(data: CreateVehicleEntryRequest): Promise<VehicleEntry> {
    // API expects form-urlencoded format
    const formData = new URLSearchParams()
    formData.append('entry_no', data.entry_no)
    formData.append('vehicle', data.vehicle.toString())
    formData.append('driver', data.driver.toString())
    if (data.remarks) {
      formData.append('remarks', data.remarks)
    }
    formData.append('entry_type', data.entry_type)

    const response = await apiClient.post<VehicleEntry>(
      API_ENDPOINTS.VEHICLE.VEHICLE_ENTRIES,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    return response.data
  },

  async update(id: number, data: UpdateVehicleEntryRequest): Promise<VehicleEntry> {
    // API expects form-urlencoded format
    const formData = new URLSearchParams()
    formData.append('vehicle', data.vehicle.toString())
    formData.append('driver', data.driver.toString())
    if (data.remarks) {
      formData.append('remarks', data.remarks)
    }

    const response = await apiClient.put<VehicleEntry>(
      API_ENDPOINTS.VEHICLE.VEHICLE_ENTRY_BY_ID(id),
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    return response.data
  },

  async getCount(params?: VehicleEntriesParams): Promise<VehicleEntriesCountResponse> {
    const queryParams = new URLSearchParams()
    if (params?.from_date) {
      queryParams.append('from_date', params.from_date)
    }
    if (params?.to_date) {
      queryParams.append('to_date', params.to_date)
    }
    if (params?.entry_type) {
      queryParams.append('entry_type', params.entry_type)
    }

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.VEHICLE.VEHICLE_ENTRIES_COUNT}?${queryParams.toString()}`
      : API_ENDPOINTS.VEHICLE.VEHICLE_ENTRIES_COUNT

    const response = await apiClient.get<VehicleEntriesCountResponse>(url)
    return response.data
  },
}
