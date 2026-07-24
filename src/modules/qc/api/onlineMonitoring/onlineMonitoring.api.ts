import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CreateOnlineRecordRequest,
  OnlineMonitoringListParams,
  OnlineQualityReading,
  OnlineQualityRecord,
  OnlineQualityRecordListItem,
  OnlineQualitySpec,
  OnlineReadingWrite,
  ProductionLineOption,
} from '../../types';

const EP = API_ENDPOINTS.QUALITY_CONTROL_V2;

export const onlineMonitoringApi = {
  async list(params?: OnlineMonitoringListParams): Promise<OnlineQualityRecordListItem[]> {
    const { data } = await apiClient.get<OnlineQualityRecordListItem[]>(
      EP.ONLINE_MONITORING_LIST,
      { params },
    );
    return data;
  },

  async get(recordId: number): Promise<OnlineQualityRecord> {
    const { data } = await apiClient.get<OnlineQualityRecord>(
      EP.ONLINE_MONITORING_DETAIL(recordId),
    );
    return data;
  },

  async create(payload: CreateOnlineRecordRequest): Promise<OnlineQualityRecord> {
    const { data } = await apiClient.post<OnlineQualityRecord>(EP.ONLINE_MONITORING_LIST, payload);
    return data;
  },

  async updateHeader(
    recordId: number,
    payload: Partial<Pick<OnlineQualityRecord, 'sku' | 'product_name' | 'flavour' | 'shift' | 'batch_no' | 'remarks'>>,
  ): Promise<OnlineQualityRecord> {
    const { data } = await apiClient.patch<OnlineQualityRecord>(
      EP.ONLINE_MONITORING_DETAIL(recordId),
      payload,
    );
    return data;
  },

  async remove(recordId: number): Promise<void> {
    await apiClient.delete(EP.ONLINE_MONITORING_DETAIL(recordId));
  },

  async addReading(recordId: number, payload: OnlineReadingWrite): Promise<OnlineQualityReading> {
    const { data } = await apiClient.post<OnlineQualityReading>(
      EP.ONLINE_MONITORING_READINGS(recordId),
      payload,
    );
    return data;
  },

  async updateReading(
    recordId: number,
    readingId: number,
    payload: Partial<OnlineReadingWrite>,
  ): Promise<OnlineQualityReading> {
    const { data } = await apiClient.patch<OnlineQualityReading>(
      EP.ONLINE_MONITORING_READING_DETAIL(recordId, readingId),
      payload,
    );
    return data;
  },

  async deleteReading(recordId: number, readingId: number): Promise<void> {
    await apiClient.delete(EP.ONLINE_MONITORING_READING_DETAIL(recordId, readingId));
  },

  async submit(recordId: number): Promise<OnlineQualityRecord> {
    const { data } = await apiClient.post<OnlineQualityRecord>(EP.ONLINE_MONITORING_SUBMIT(recordId));
    return data;
  },

  async approve(recordId: number, remarks?: string): Promise<OnlineQualityRecord> {
    const { data } = await apiClient.post<OnlineQualityRecord>(
      EP.ONLINE_MONITORING_APPROVE(recordId),
      { remarks },
    );
    return data;
  },

  async reject(recordId: number, remarks?: string): Promise<OnlineQualityRecord> {
    const { data } = await apiClient.post<OnlineQualityRecord>(
      EP.ONLINE_MONITORING_REJECT(recordId),
      { remarks },
    );
    return data;
  },

  async lines(): Promise<ProductionLineOption[]> {
    const { data } = await apiClient.get<ProductionLineOption[]>(EP.ONLINE_MONITORING_LINES);
    return data;
  },

  async specs(): Promise<OnlineQualitySpec[]> {
    const { data } = await apiClient.get<OnlineQualitySpec[]>(EP.ONLINE_MONITORING_SPECS);
    return data;
  },
};
