import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { Transporter } from '../transporter/transporter.api'

// Lightweight type for dropdown list (names endpoint)
export interface VehicleName {
  id: number
  vehicle_number: string
}

// Full vehicle details
export interface Vehicle {
  id: number
  vehicle_number: string
  vehicle_type: string
  transporter: Transporter | null
  capacity_ton: string
  created_at: string
}

export interface CreateVehicleRequest {
  vehicle_number: string
  vehicle_type: string
  transporter: number
  capacity_ton: string
}

export const vehicleApi = {
  /**
   * Get list of vehicle names for dropdown (lightweight)
   */
  async getNames(): Promise<VehicleName[]> {
    const response = await apiClient.get<VehicleName[]>(API_ENDPOINTS.VEHICLE.VEHICLE_NAMES)
    return response.data
  },

  /**
   * Get full vehicle details by ID
   */
  async getById(id: number): Promise<Vehicle> {
    const response = await apiClient.get<Vehicle>(API_ENDPOINTS.VEHICLE.VEHICLE_BY_ID(id))
    return response.data
  },

  /**
   * Get full list of vehicles (legacy - use getNames for dropdowns)
   */
  async getList(): Promise<Vehicle[]> {
    const response = await apiClient.get<Vehicle[]>(API_ENDPOINTS.VEHICLE.VEHICLES)
    return response.data
  },

  async create(data: CreateVehicleRequest): Promise<Vehicle> {
    // API expects form-urlencoded format
    const formData = new URLSearchParams()
    formData.append('vehicle_number', data.vehicle_number)
    formData.append('vehicle_type', data.vehicle_type)
    formData.append('transporter', data.transporter.toString())
    formData.append('capacity_ton', data.capacity_ton)

    const response = await apiClient.post<Vehicle>(
      API_ENDPOINTS.VEHICLE.VEHICLES,
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
