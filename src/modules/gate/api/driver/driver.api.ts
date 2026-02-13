import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'

// Lightweight type for dropdown list (names endpoint)
export interface DriverName {
  id: number
  name: string
}

// Full driver details
export interface Driver {
  id: number
  name: string
  mobile_no: string
  license_no: string
  id_proof_type: string
  id_proof_number: string
  photo: string | null
  created_at: string
}

export interface CreateDriverRequest {
  name: string
  mobile_no: string
  license_no: string
  id_proof_type: string
  id_proof_number: string
  photo?: File
}

export const driverApi = {
  /**
   * Get list of driver names for dropdown (lightweight)
   */
  async getNames(): Promise<DriverName[]> {
    const response = await apiClient.get<DriverName[]>(API_ENDPOINTS.DRIVER.DRIVER_NAMES)
    return response.data
  },

  /**
   * Get full driver details by ID
   */
  async getById(id: number): Promise<Driver> {
    const response = await apiClient.get<Driver>(API_ENDPOINTS.DRIVER.DRIVER_BY_ID(id))
    return response.data
  },

  /**
   * Get full list of drivers (legacy - use getNames for dropdowns)
   */
  async getList(): Promise<Driver[]> {
    const response = await apiClient.get<Driver[]>(API_ENDPOINTS.DRIVER.DRIVERS)
    return response.data
  },

  async create(data: CreateDriverRequest): Promise<Driver> {
    // API expects form-data format (for file upload)
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('mobile_no', data.mobile_no)
    formData.append('license_no', data.license_no)
    formData.append('id_proof_type', data.id_proof_type)
    formData.append('id_proof_number', data.id_proof_number)
    if (data.photo) {
      formData.append('photo', data.photo)
    }

    const response = await apiClient.post<Driver>(API_ENDPOINTS.DRIVER.DRIVERS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
