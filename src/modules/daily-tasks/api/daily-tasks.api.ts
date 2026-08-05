import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { DailyBoard, DailySheet } from '../types';

const EP = API_ENDPOINTS.DAILY_TASKS;

/** `date` is a local `YYYY-MM-DD`; omitted means today. */
export interface DailyTasksQuery {
  date?: string;
}

function buildParams({ date }: DailyTasksQuery = {}): Record<string, string> {
  return date ? { date } : {};
}

export const dailyTasksApi = {
  async getMySheet(query: DailyTasksQuery = {}): Promise<DailySheet> {
    const response = await apiClient.get<DailySheet>(EP.MY_TODAY, { params: buildParams(query) });
    return response.data;
  },

  async getTeamBoard(query: DailyTasksQuery = {}): Promise<DailyBoard> {
    const response = await apiClient.get<DailyBoard>(EP.TEAM_TODAY, { params: buildParams(query) });
    return response.data;
  },
};
