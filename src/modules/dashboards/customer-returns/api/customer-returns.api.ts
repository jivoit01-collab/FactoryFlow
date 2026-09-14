import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { CustomerReturnsDashboard, CustomerReturnsFilters } from '../types';

export const customerReturnsApi = {
  async getDashboard(filters: CustomerReturnsFilters): Promise<CustomerReturnsDashboard> {
    const response = await apiClient.get<CustomerReturnsDashboard>(
      API_ENDPOINTS.GOODS_RETURN.DASHBOARD,
      {
        params: {
          from_date: filters.from,
          to_date: filters.to,
          // Sent only when it is on. Omitted means the active company, which is
          // what every other returns screen shows — a board that silently added
          // a second company's returns would make its own totals unreadable.
          ...(filters.allCompanies ? { all_companies: 1 } : {}),
        },
      },
    );
    return response.data;
  },
};
