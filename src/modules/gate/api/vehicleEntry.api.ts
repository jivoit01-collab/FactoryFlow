import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { Vehicle } from './vehicle.api'
import type { Driver } from './driver.api'

export interface VehicleEntry {
  id: number
  entry_no: string
  status: string
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
}

export interface UpdateVehicleEntryRequest {
  vehicle: number
  driver: number
  remarks?: string
}

export const vehicleEntryApi = {
  async getList(): Promise<VehicleEntry[]> {
    const response = await apiClient.get<VehicleEntry[]>(API_ENDPOINTS.VEHICLE.VEHICLE_ENTRIES)
    return response.data
  },

  async getById(id: number): Promise<VehicleEntry> {
    const response = await apiClient.get<VehicleEntry>(API_ENDPOINTS.VEHICLE.VEHICLE_ENTRY_BY_ID(id))
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
}