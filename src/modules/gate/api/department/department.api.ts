import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'

export interface Department {
  id: number
  name: string
  description: string
}

export const departmentApi = {
  async getDepartments(): Promise<Department[]> {
    const response = await apiClient.get<Department[]>(API_ENDPOINTS.ACCOUNTS.DEPARTMENTS)
    return response.data
  },
}
