import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DailyElectricityReadingFilters,
  DailyElectricityReadingPayload,
  DailyWastageLogFilters,
  DailyWastageLogPayload,
  ElectricityMeterFilters,
  ElectricityMeterPayload,
} from '../types';
import { dailyRegisterApi } from './dailyRegister.api';

export const DAILY_REGISTER_QUERY_KEYS = {
  meters: (filters?: ElectricityMeterFilters) =>
    ['maintenance', 'electricity-meters', filters ?? {}] as const,
  readings: (filters?: DailyElectricityReadingFilters) =>
    ['maintenance', 'daily-electricity-readings', filters ?? {}] as const,
  wastage: (filters?: DailyWastageLogFilters) =>
    ['maintenance', 'daily-wastage-logs', filters ?? {}] as const,
};

function invalidateElectricity(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'electricity-meters'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'daily-electricity-readings'] });
}

function invalidateWastage(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'daily-wastage-logs'] });
}

// ---- Electricity meter master ----

export function useElectricityMeters(filters?: ElectricityMeterFilters, enabled = true) {
  return useQuery({
    queryKey: DAILY_REGISTER_QUERY_KEYS.meters(filters),
    queryFn: () => dailyRegisterApi.getMeters(filters),
    enabled,
  });
}

export function useCreateElectricityMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ElectricityMeterPayload) => dailyRegisterApi.createMeter(payload),
    onSuccess: () => invalidateElectricity(queryClient),
  });
}

export function useUpdateElectricityMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      meterId,
      payload,
    }: {
      meterId: number;
      payload: Partial<ElectricityMeterPayload>;
    }) => dailyRegisterApi.updateMeter(meterId, payload),
    onSuccess: () => invalidateElectricity(queryClient),
  });
}

export function useDeleteElectricityMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meterId: number) => dailyRegisterApi.deleteMeter(meterId),
    onSuccess: () => invalidateElectricity(queryClient),
  });
}

// ---- Daily electricity readings ----

export function useDailyElectricityReadings(
  filters?: DailyElectricityReadingFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: DAILY_REGISTER_QUERY_KEYS.readings(filters),
    queryFn: () => dailyRegisterApi.getReadings(filters),
    enabled,
  });
}

export function useCreateDailyElectricityReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DailyElectricityReadingPayload) =>
      dailyRegisterApi.createReading(payload),
    onSuccess: () => invalidateElectricity(queryClient),
  });
}

export function useUpdateDailyElectricityReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      readingId,
      payload,
    }: {
      readingId: number;
      payload: Partial<DailyElectricityReadingPayload>;
    }) => dailyRegisterApi.updateReading(readingId, payload),
    onSuccess: () => invalidateElectricity(queryClient),
  });
}

export function useDeleteDailyElectricityReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (readingId: number) => dailyRegisterApi.deleteReading(readingId),
    onSuccess: () => invalidateElectricity(queryClient),
  });
}

// ---- Daily wastage log ----

export function useDailyWastageLogs(filters?: DailyWastageLogFilters, enabled = true) {
  return useQuery({
    queryKey: DAILY_REGISTER_QUERY_KEYS.wastage(filters),
    queryFn: () => dailyRegisterApi.getWastageLogs(filters),
    enabled,
  });
}

export function useCreateDailyWastageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DailyWastageLogPayload) => dailyRegisterApi.createWastageLog(payload),
    onSuccess: () => invalidateWastage(queryClient),
  });
}

export function useUpdateDailyWastageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      logId,
      payload,
    }: {
      logId: number;
      payload: Partial<DailyWastageLogPayload>;
    }) => dailyRegisterApi.updateWastageLog(logId, payload),
    onSuccess: () => invalidateWastage(queryClient),
  });
}

export function useDeleteDailyWastageLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: number) => dailyRegisterApi.deleteWastageLog(logId),
    onSuccess: () => invalidateWastage(queryClient),
  });
}
