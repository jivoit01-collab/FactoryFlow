import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { DispatchSheetParams, DispatchSheetResponse } from '../types/sheet.types';

export const dispatchSheetApi = {
  async get(params: DispatchSheetParams): Promise<DispatchSheetResponse> {
    const response = await apiClient.get<DispatchSheetResponse>(
      API_ENDPOINTS.DISPATCH_PLANS.SHEET,
      {
        params: {
          date_from: params.date_from,
          date_to: params.date_to,
          ...(params.booking_status && params.booking_status !== 'all'
            ? { booking_status: params.booking_status }
            : {}),
          ...(params.search ? { search: params.search } : {}),
          ...(params.all_companies ? { all_companies: 1 } : {}),
        },
      },
    );
    return response.data;
  },
};

export const DISPATCH_SHEET_QUERY_KEY = 'dispatch-sheet';

/**
 * The register for one window of days.
 *
 * The whole window arrives at once rather than a page at a time, because the
 * sorting, the column filters and the download all work on the sheet as a
 * whole — a filter that only reaches the fifty rows that happened to land on
 * screen reads as a filter and is not one. A month is a few hundred rows.
 */
export function useDispatchSheet(params: DispatchSheetParams, enabled = true) {
  return useQuery({
    queryKey: [DISPATCH_SHEET_QUERY_KEY, params],
    queryFn: () => dispatchSheetApi.get(params),
    enabled,
    staleTime: 60 * 1000,
  });
}
