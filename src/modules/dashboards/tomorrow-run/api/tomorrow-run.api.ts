import { apiClient } from '@/core/api';

import { TOMORROW_RUN_ENDPOINTS as EP } from '../constants';
import type { ChoiceBody, PlanEnvelope, PlanningSheet } from '../types';

export const tomorrowRunApi = {
  async getPlan(): Promise<PlanEnvelope> {
    const response = await apiClient.get<PlanEnvelope>(EP.PLAN);
    return response.data;
  },

  /** Save a pick (or clear one with `job: ''`); the answer is the re-timed plan. */
  async choose(body: ChoiceBody): Promise<PlanEnvelope> {
    const response = await apiClient.post<PlanEnvelope>(EP.CHOICE, body);
    return response.data;
  },

  async rebuild(): Promise<PlanEnvelope> {
    const response = await apiClient.post<PlanEnvelope>(EP.REBUILD, {}, { timeout: 180_000 });
    return response.data;
  },

  async listSheets(): Promise<{ results: PlanningSheet[] }> {
    const response = await apiClient.get<{ results: PlanningSheet[] }>(EP.SHEETS);
    return response.data;
  },

  async putInSheet(file: File, stockDate?: string): Promise<PlanningSheet & { lines: unknown[] }> {
    const form = new FormData();
    form.append('file', file);
    if (stockDate) form.append('stock_date', stockDate);
    const response = await apiClient.post<PlanningSheet & { lines: unknown[] }>(EP.SHEETS, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
