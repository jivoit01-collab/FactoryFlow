import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BillsResponse,
  DispatchBillFilters,
  DispatchFulfilmentFilters,
  DispatchFulfilmentResponse,
} from '../types';

const EP = API_ENDPOINTS.DISPATCH_FULFILMENT;

export const dispatchFulfilmentApi = {
  async getSummary(
    filters: DispatchFulfilmentFilters,
  ): Promise<DispatchFulfilmentResponse> {
    const response = await apiClient.get<DispatchFulfilmentResponse>(EP.SUMMARY, {
      params: {
        from: filters.from,
        to: filters.to,
        // Omitted means every company the caller belongs to. Send it only when a
        // board names the companies it adds up, so its total cannot silently
        // gain a third one for whoever happens to hold all of them.
        companies: filters.companies?.length ? filters.companies.join(',') : undefined,
      },
    });
    return response.data;
  },

  async getBills(filters: DispatchBillFilters): Promise<BillsResponse> {
    const response = await apiClient.get<BillsResponse>(EP.BILLS, {
      params: {
        from: filters.from,
        to: filters.to,
        status: filters.status || undefined,
        search: filters.search || undefined,
        limit: filters.limit,
        offset: filters.offset,
        order: filters.order || undefined,
        filled: filters.filled ? 1 : undefined,
        // Sent only when a caller names them — see `companies` on the filters.
        companies: filters.companies?.length ? filters.companies.join(',') : undefined,
      },
    });
    return response.data;
  },
};
