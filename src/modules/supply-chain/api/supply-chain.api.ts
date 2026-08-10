import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AlarmPreviewResponse,
  DailyRun,
  DailyRunPayload,
  DailyRunRow,
  SupplyChainDashboard,
  VerdictOutcome,
  WeeklyReview,
} from '../types';

const EP = API_ENDPOINTS.SUPPLY_CHAIN;

export const supplyChainApi = {
  async getDashboard(forecastId?: number | null): Promise<SupplyChainDashboard> {
    const response = await apiClient.get<SupplyChainDashboard>(EP.DASHBOARD, {
      params: forecastId ? { forecast_id: forecastId } : undefined,
    });
    return response.data;
  },

  async previewAlarms(): Promise<AlarmPreviewResponse> {
    const response = await apiClient.get<AlarmPreviewResponse>(EP.ALARM_PREVIEW);
    return response.data;
  },

  async sendAlarms(force = false): Promise<AlarmPreviewResponse> {
    const response = await apiClient.post<AlarmPreviewResponse>(EP.ALARM_SEND, { force });
    return response.data;
  },

  async uploadReferenceTemplate(file: File) {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post(EP.REFERENCE_UPLOAD, form);
    return response.data;
  },
};

/* ── The daily operating loop ─────────────────────────────────────────────── */

export const dailyRunApi = {
  async list(): Promise<DailyRun[]> {
    const response = await apiClient.get<DailyRun[]>(EP.RUNS);
    return response.data;
  },

  async latest(): Promise<DailyRunPayload> {
    const response = await apiClient.get<DailyRunPayload>(EP.RUN_LATEST);
    return response.data;
  },

  async detail(id: number): Promise<DailyRunPayload> {
    const response = await apiClient.get<DailyRunPayload>(EP.RUN_DETAIL(id));
    return response.data;
  },

  async generate(): Promise<DailyRunPayload> {
    const response = await apiClient.post<DailyRunPayload>(EP.RUN_GENERATE, {});
    return response.data;
  },

  async review(id: number, comment: string, override = false): Promise<DailyRunPayload> {
    const response = await apiClient.post<DailyRunPayload>(EP.RUN_REVIEW(id), {
      comment,
      override,
    });
    return response.data;
  },

  async publish(id: number, comment: string): Promise<DailyRunPayload> {
    const response = await apiClient.post<DailyRunPayload>(EP.RUN_PUBLISH(id), { comment });
    return response.data;
  },

  async setOwner(rowId: number, owner: string): Promise<DailyRunRow> {
    const response = await apiClient.post<DailyRunRow>(EP.ROW_OWNER(rowId), { owner });
    return response.data;
  },

  async setVerdict(
    rowId: number,
    outcome: VerdictOutcome,
    note: string,
  ): Promise<DailyRunRow> {
    const response = await apiClient.post<DailyRunRow>(EP.ROW_VERDICT(rowId), {
      outcome,
      note,
    });
    return response.data;
  },

  async weekly(weeks = 4): Promise<WeeklyReview> {
    const response = await apiClient.get<WeeklyReview>(EP.WEEKLY, { params: { weeks } });
    return response.data;
  },
};
