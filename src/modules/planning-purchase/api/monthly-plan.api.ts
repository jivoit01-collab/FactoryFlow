import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  MonthlyPlanDetail,
  MonthlyPlanList,
  MonthlyPlanUploadPayload,
  MonthlyPlanUploadResult,
} from '../types';

const EP = API_ENDPOINTS.PLANNING_PURCHASE;

/**
 * Reads and the upload show their own failure on the page (or in the upload
 * dialog, beside the file), so they opt out of the app's global error toast.
 */
const QUIET = { suppressErrorToast: true };

export const monthlyPlanApi = {
  /** Every uploaded version, newest month first. */
  async list(): Promise<MonthlyPlanList> {
    return (await apiClient.get<MonthlyPlanList>(EP.MONTHLY_PLANS, QUIET)).data;
  },

  /** One version with its rows; `latest` is the newest version of the newest month. */
  async detail(id: number | 'latest'): Promise<MonthlyPlanDetail> {
    return (await apiClient.get<MonthlyPlanDetail>(EP.MONTHLY_PLAN(id), QUIET)).data;
  },

  /** A new workbook: it becomes the next version of its month. */
  async upload(payload: MonthlyPlanUploadPayload): Promise<MonthlyPlanUploadResult> {
    const form = new FormData();
    form.append('file', payload.file);
    if (payload.month) form.append('month', payload.month);
    if (payload.notes) form.append('notes', payload.notes);
    return (
      await apiClient.post<MonthlyPlanUploadResult>(EP.MONTHLY_PLANS, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        ...QUIET,
      })
    ).data;
  },

  async remove(id: number): Promise<{ deleted: string }> {
    return (await apiClient.delete<{ deleted: string }>(EP.MONTHLY_PLAN(id))).data;
  },
};
