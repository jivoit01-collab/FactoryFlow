import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { CompanyUser } from '../types/sendNotification.types';

export const usersApi = {
  async getUsers(): Promise<CompanyUser[]> {
    const response = await apiClient.get<CompanyUser[]>(API_ENDPOINTS.ACCOUNTS.USERS);
    return response.data;
  },
};
