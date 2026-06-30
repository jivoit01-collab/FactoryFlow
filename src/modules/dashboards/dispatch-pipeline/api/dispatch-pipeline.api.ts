import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { DispatchPipelineFilters, DispatchPipelineResponse } from '../types';

const EP = API_ENDPOINTS.DISPATCH_PIPELINE;

function buildParams(filters: DispatchPipelineFilters): Record<string, string> {
  const params: Record<string, string> = {
    date_from: filters.date_from,
    date_to: filters.date_to,
  };
  if (filters.search) params.search = filters.search;
  if (filters.stage) params.stage = filters.stage;
  if (filters.stages?.length) params.stages = filters.stages.join(',');
  if (filters.all_companies) params.all_companies = '1';
  return params;
}

export const dispatchPipelineApi = {
  async getBoard(filters: DispatchPipelineFilters): Promise<DispatchPipelineResponse> {
    const response = await apiClient.get<DispatchPipelineResponse>(EP.BOARD, {
      params: buildParams(filters),
    });
    return response.data;
  },
};
