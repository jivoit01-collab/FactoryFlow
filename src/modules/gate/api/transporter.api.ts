import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'

export interface Transporter {
  id: number
  name: string
  contact_person: string
  mobile_no: string
  created_at: string
}

export interface CreateTransporterRequest {
  name: string
  contact_person: string
  mobile_no: string
}

export const transporterApi = {
  async getList(): Promise<Transporter[]> {
    const response = await apiClient.get<Transporter[]>(API_ENDPOINTS.VEHICLE.TRANSPORTERS)
    return response.data
  },

  async create(data: CreateTransporterRequest): Promise<Transporter> {
    // API expects form-urlencoded format
    const formData = new URLSearchParams()
    formData.append('name', data.name)
    formData.append('contact_person', data.contact_person)
    formData.append('mobile_no', data.mobile_no)

    const response = await apiClient.post<Transporter>(
      API_ENDPOINTS.VEHICLE.TRANSPORTERS,
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