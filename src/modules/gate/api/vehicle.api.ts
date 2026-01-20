import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { Transporter } from './transporter.api'

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