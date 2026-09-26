import { apiClient } from '@/core/api';

import type {
  DailyElectricityReadingFilters,
  DaySheet,
  DaySheetEntryPayload,
  DaySheetSaveResult,
  MeterSetup,
  MeterSetupPayload,
  RunSource,
  SplitReport,
  TreeMeter,
  TreeMeterFilters,
  TreeMeterPayload,
  TreeReading,
  TreeReadingPayload,
} from '../types';

/**
 * Daily Electricity++'s endpoints. Kept here rather than in the app-wide
 * endpoint constants: they belong to this one page, and nothing else calls
 * them. The meters and readings are the Daily Electricity page's own, served
 * as the tree — that page keeps its endpoints and its logic.
 */
export const ELECTRICITY_TREE_ENDPOINTS = {
  METERS: '/maintenance/electricity-tree-meters/',
  METER_DETAIL: (meterId: number) => `/maintenance/electricity-tree-meters/${meterId}/`,
  READINGS: '/maintenance/electricity-tree-readings/',
  READING_DETAIL: (readingId: number) => `/maintenance/electricity-tree-readings/${readingId}/`,
  SETUPS: '/maintenance/electricity-meter-setups/',
  SETUP_DETAIL: (setupId: number) => `/maintenance/electricity-meter-setups/${setupId}/`,
  DAY_SHEET: '/maintenance/electricity-day-sheet/',
  ALLOCATION: '/maintenance/electricity-allocation/',
  RUN_SOURCES: '/maintenance/electricity-run-sources/',
} as const;

const EP = ELECTRICITY_TREE_ENDPOINTS;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

export const electricityTreeApi = {
  // ---- meters, in tree order ----

  async getMeters(filters?: TreeMeterFilters): Promise<TreeMeter[]> {
    const response = await apiClient.get<TreeMeter[]>(EP.METERS, { params: cleanFilters(filters) });
    return response.data;
  },

  async createMeter(payload: TreeMeterPayload): Promise<TreeMeter> {
    const response = await apiClient.post<TreeMeter>(EP.METERS, payload);
    return response.data;
  },

  async updateMeter(meterId: number, payload: Partial<TreeMeterPayload>): Promise<TreeMeter> {
    const response = await apiClient.patch<TreeMeter>(EP.METER_DETAIL(meterId), payload);
    return response.data;
  },

  async deleteMeter(meterId: number): Promise<void> {
    await apiClient.delete(EP.METER_DETAIL(meterId));
  },

  // ---- readings, held to the chain ----

  async getReadings(filters?: DailyElectricityReadingFilters): Promise<TreeReading[]> {
    const response = await apiClient.get<TreeReading[]>(EP.READINGS, { params: cleanFilters(filters) });
    return response.data;
  },

  async createReading(payload: TreeReadingPayload): Promise<TreeReading> {
    const response = await apiClient.post<TreeReading>(EP.READINGS, payload);
    return response.data;
  },

  /** A corrected closing moves the next reading's opening with it. */
  async updateReading(readingId: number, payload: Partial<TreeReadingPayload>): Promise<TreeReading> {
    const response = await apiClient.patch<TreeReading>(EP.READING_DETAIL(readingId), payload);
    return response.data;
  },

  /** The next reading takes over the days this one covered. */
  async deleteReading(readingId: number): Promise<void> {
    await apiClient.delete(EP.READING_DETAIL(readingId));
  },

  // ---- setup versions: where a meter sits and who pays, from a date ----

  async getSetups(meterId: number): Promise<MeterSetup[]> {
    const response = await apiClient.get<MeterSetup[]>(EP.SETUPS, { params: { meter: meterId } });
    return response.data;
  },

  /** A change on the floor, from a date. Earlier days keep the old split. */
  async createSetup(payload: MeterSetupPayload): Promise<MeterSetup> {
    const response = await apiClient.post<MeterSetup>(EP.SETUPS, payload);
    return response.data;
  },

  /** A correction: every day the version covers is worked out again. */
  async updateSetup(setupId: number, payload: MeterSetupPayload): Promise<MeterSetup> {
    const response = await apiClient.patch<MeterSetup>(EP.SETUP_DETAIL(setupId), payload);
    return response.data;
  },

  async deleteSetup(setupId: number): Promise<void> {
    await apiClient.delete(EP.SETUP_DETAIL(setupId));
  },

  // ---- the day sheet: every meter's reading for one day ----

  async getDaySheet(date: string): Promise<DaySheet> {
    const response = await apiClient.get<DaySheet>(EP.DAY_SHEET, { params: { date } });
    return response.data;
  },

  /** All of them or none — a half-saved round leaves parents and sub-meters out of step. */
  async saveDaySheet(date: string, entries: DaySheetEntryPayload[]): Promise<DaySheetSaveResult> {
    const response = await apiClient.post<DaySheetSaveResult>(EP.DAY_SHEET, { date, entries });
    return response.data;
  },

  // ---- the split ----

  async getAllocation(dateFrom: string, dateTo: string): Promise<SplitReport> {
    const response = await apiClient.get<SplitReport>(EP.ALLOCATION, {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return response.data;
  },

  async getRunSources(): Promise<RunSource[]> {
    const response = await apiClient.get<RunSource[]>(EP.RUN_SOURCES);
    return response.data;
  },
};
