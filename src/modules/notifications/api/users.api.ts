import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { CompanyUser } from '../types/sendNotification.types'

export const usersApi = {
  async getUsers(): Promise<CompanyUser[]> {
    const response = await apiClient.get<CompanyUser[]>(API_ENDPOINTS.ACCOUNTS.USERS)
    return response.data
  },
}
