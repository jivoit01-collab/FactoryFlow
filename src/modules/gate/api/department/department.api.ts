import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'

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
