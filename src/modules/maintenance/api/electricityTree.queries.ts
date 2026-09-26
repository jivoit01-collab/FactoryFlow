import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DailyElectricityReadingFilters,
  DaySheetEntryPayload,
  MeterSetupPayload,
  TreeMeterFilters,
  TreeMeterPayload,
  TreeReadingPayload,
} from '../types';
import { electricityTreeApi } from './electricityTree.api';

export const ELECTRICITY_TREE_QUERY_KEYS = {
  meters: (filters?: TreeMeterFilters) =>
    ['maintenance', 'electricity-tree-meters', filters ?? {}] as const,
  readings: (filters?: DailyElectricityReadingFilters) =>
    ['maintenance', 'electricity-tree-readings', filters ?? {}] as const,
  setups: (meterId: number) => ['maintenance', 'electricity-meter-setups', meterId] as const,
  daySheet: (date: string) => ['maintenance', 'electricity-day-sheet', date] as const,
  allocation: (dateFrom: string, dateTo: string) =>
    ['maintenance', 'electricity-allocation', dateFrom, dateTo] as const,
  runSources: () => ['maintenance', 'electricity-run-sources'] as const,
};

/**
 * Anything that changes a meter, its setup or a reading changes the split, the
 * day sheet and the meter list together — they are three views of one tree.
 * The Daily Electricity page reads the same meters and readings, so its lists
 * go stale too.
 */
export function invalidateElectricityTree(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of [
    'electricity-tree-meters',
    'electricity-tree-readings',
    'electricity-meter-setups',
    'electricity-day-sheet',
    'electricity-allocation',
    'electricity-meters',
    'daily-electricity-readings',
  ]) {
    queryClient.invalidateQueries({ queryKey: ['maintenance', key] });
  }
}

// ---- meters ----

export function useTreeMeters(filters?: TreeMeterFilters, enabled = true) {
  return useQuery({
    queryKey: ELECTRICITY_TREE_QUERY_KEYS.meters(filters),
    queryFn: () => electricityTreeApi.getMeters(filters),
    enabled,
  });
}

export function useCreateTreeMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TreeMeterPayload) => electricityTreeApi.createMeter(payload),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useUpdateTreeMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meterId, payload }: { meterId: number; payload: Partial<TreeMeterPayload> }) =>
      electricityTreeApi.updateMeter(meterId, payload),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useDeleteTreeMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meterId: number) => electricityTreeApi.deleteMeter(meterId),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

// ---- readings ----

export function useTreeReadings(filters?: DailyElectricityReadingFilters, enabled = true) {
  return useQuery({
    queryKey: ELECTRICITY_TREE_QUERY_KEYS.readings(filters),
    queryFn: () => electricityTreeApi.getReadings(filters),
    enabled,
  });
}

export function useCreateTreeReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TreeReadingPayload) => electricityTreeApi.createReading(payload),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useUpdateTreeReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ readingId, payload }: { readingId: number; payload: Partial<TreeReadingPayload> }) =>
      electricityTreeApi.updateReading(readingId, payload),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useDeleteTreeReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (readingId: number) => electricityTreeApi.deleteReading(readingId),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

// ---- setup versions ----

export function useMeterSetups(meterId: number | null) {
  return useQuery({
    queryKey: ELECTRICITY_TREE_QUERY_KEYS.setups(meterId ?? 0),
    queryFn: () => electricityTreeApi.getSetups(meterId as number),
    enabled: meterId != null,
  });
}

export function useCreateMeterSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MeterSetupPayload) => electricityTreeApi.createSetup(payload),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useUpdateMeterSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ setupId, payload }: { setupId: number; payload: MeterSetupPayload }) =>
      electricityTreeApi.updateSetup(setupId, payload),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useDeleteMeterSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setupId: number) => electricityTreeApi.deleteSetup(setupId),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useElectricityDaySheet(date: string, enabled = true) {
  return useQuery({
    queryKey: ELECTRICITY_TREE_QUERY_KEYS.daySheet(date),
    queryFn: () => electricityTreeApi.getDaySheet(date),
    enabled: enabled && Boolean(date),
  });
}

export function useSaveElectricityDaySheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, entries }: { date: string; entries: DaySheetEntryPayload[] }) =>
      electricityTreeApi.saveDaySheet(date, entries),
    onSuccess: () => invalidateElectricityTree(queryClient),
  });
}

export function useElectricityAllocation(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery({
    queryKey: ELECTRICITY_TREE_QUERY_KEYS.allocation(dateFrom, dateTo),
    queryFn: () => electricityTreeApi.getAllocation(dateFrom, dateTo),
    enabled: enabled && Boolean(dateFrom) && Boolean(dateTo),
  });
}

/** Lines and machines change about once a quarter; cache them hard. */
export function useElectricityRunSources(enabled = true) {
  return useQuery({
    queryKey: ELECTRICITY_TREE_QUERY_KEYS.runSources(),
    queryFn: () => electricityTreeApi.getRunSources(),
    staleTime: 30 * 60 * 1000,
    enabled,
  });
}
