import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type BoardParams,
  type EnsureSheetRequest,
  type FinalizeRequest,
  type ItemsUpsertRequest,
  labourCountApi,
  type LabourHistoryParams,
  type MarkOutRequest,
} from './labourCount.api';

export function useEnsureLabourSheet() {
  return useMutation({
    mutationFn: (data: EnsureSheetRequest) => labourCountApi.ensureSheet(data),
  });
}

export function useSaveLabourItems(sheetId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ItemsUpsertRequest) => labourCountApi.saveItems(sheetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourHistory'] });
    },
  });
}

export function useSubmitLabourSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: number) => labourCountApi.submit(sheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourHistory'] });
    },
  });
}

export function usePullBackLabourSheet() {
  return useMutation({
    mutationFn: (sheetId: number) => labourCountApi.pullBack(sheetId),
  });
}

export function useHolidayLabourSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: number) => labourCountApi.markHoliday(sheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourHistory'] });
    },
  });
}

export function useLabourHistory(params: LabourHistoryParams, enabled: boolean = true) {
  return useQuery({
    queryKey: ['labourHistory', params],
    queryFn: () => labourCountApi.history(params),
    enabled,
  });
}

export function useLabourBoard(params: BoardParams, enabled: boolean = true) {
  return useQuery({
    queryKey: ['labourBoard', params],
    queryFn: () => labourCountApi.board(params),
    enabled,
  });
}

export function useMarkOutLabour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkOutRequest) => labourCountApi.markOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourBoard'] });
    },
  });
}

export function useUndoOutLabour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: number) => labourCountApi.undoOut(sheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourBoard'] });
    },
  });
}

export function useFinalizeLabour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FinalizeRequest) => labourCountApi.finalize(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourBoard'] });
    },
  });
}

export function useReopenLabour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: number) => labourCountApi.reopen(sheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labourBoard'] });
    },
  });
}
