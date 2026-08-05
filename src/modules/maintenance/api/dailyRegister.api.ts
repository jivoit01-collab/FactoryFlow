import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  DailyElectricityReading,
  DailyElectricityReadingFilters,
  DailyElectricityReadingPayload,
  DailyWastageLog,
  DailyWastageLogFilters,
  DailyWastageLogPayload,
  ElectricityMeter,
  ElectricityMeterFilters,
  ElectricityMeterPayload,
} from '../types';

const EP = API_ENDPOINTS.MAINTENANCE;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

function wastageFormData(payload: Partial<DailyWastageLogPayload>): FormData {
  const formData = new FormData();
  if (payload.date) formData.append('date', payload.date);
  if (payload.material_name !== undefined) formData.append('material_name', payload.material_name);
  if (payload.qty !== undefined) formData.append('qty', payload.qty);
  if (payload.uom !== undefined) formData.append('uom', payload.uom);
  if (payload.reason !== undefined) formData.append('reason', payload.reason);
  if (payload.photoFile) formData.append('photo', payload.photoFile);
  return formData;
}

export const dailyRegisterApi = {
  // ---- Electricity meter master ----

  async getMeters(filters?: ElectricityMeterFilters): Promise<ElectricityMeter[]> {
    const response = await apiClient.get<ElectricityMeter[]>(EP.ELECTRICITY_METERS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createMeter(payload: ElectricityMeterPayload): Promise<ElectricityMeter> {
    const response = await apiClient.post<ElectricityMeter>(EP.ELECTRICITY_METERS, payload);
    return response.data;
  },

  async updateMeter(
    meterId: number,
    payload: Partial<ElectricityMeterPayload>,
  ): Promise<ElectricityMeter> {
    const response = await apiClient.patch<ElectricityMeter>(
      EP.ELECTRICITY_METER_DETAIL(meterId),
      payload,
    );
    return response.data;
  },

  async deleteMeter(meterId: number): Promise<void> {
    await apiClient.delete(EP.ELECTRICITY_METER_DETAIL(meterId));
  },

  // ---- Daily electricity readings ----

  async getReadings(
    filters?: DailyElectricityReadingFilters,
  ): Promise<DailyElectricityReading[]> {
    const response = await apiClient.get<DailyElectricityReading[]>(
      EP.DAILY_ELECTRICITY_READINGS,
      { params: cleanFilters(filters) },
    );
    return response.data;
  },

  async createReading(
    payload: DailyElectricityReadingPayload,
  ): Promise<DailyElectricityReading> {
    const response = await apiClient.post<DailyElectricityReading>(
      EP.DAILY_ELECTRICITY_READINGS,
      payload,
    );
    return response.data;
  },

  async updateReading(
    readingId: number,
    payload: Partial<DailyElectricityReadingPayload>,
  ): Promise<DailyElectricityReading> {
    const response = await apiClient.patch<DailyElectricityReading>(
      EP.DAILY_ELECTRICITY_READING_DETAIL(readingId),
      payload,
    );
    return response.data;
  },

  async deleteReading(readingId: number): Promise<void> {
    await apiClient.delete(EP.DAILY_ELECTRICITY_READING_DETAIL(readingId));
  },

  // ---- Daily wastage log ----

  async getWastageLogs(filters?: DailyWastageLogFilters): Promise<DailyWastageLog[]> {
    const response = await apiClient.get<DailyWastageLog[]>(EP.DAILY_WASTAGE_LOGS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createWastageLog(payload: DailyWastageLogPayload): Promise<DailyWastageLog> {
    const response = await apiClient.post<DailyWastageLog>(
      EP.DAILY_WASTAGE_LOGS,
      wastageFormData(payload),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async updateWastageLog(
    logId: number,
    payload: Partial<DailyWastageLogPayload>,
  ): Promise<DailyWastageLog> {
    const response = await apiClient.patch<DailyWastageLog>(
      EP.DAILY_WASTAGE_LOG_DETAIL(logId),
      wastageFormData(payload),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async deleteWastageLog(logId: number): Promise<void> {
    await apiClient.delete(EP.DAILY_WASTAGE_LOG_DETAIL(logId));
  },
};
