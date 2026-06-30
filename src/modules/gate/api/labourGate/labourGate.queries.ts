import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { labourGateApi, type RecordInRequest } from './labourGate.api';

const DAY_KEY = 'labourGateDay';

export function useLabourGateDay(date: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [DAY_KEY, date],
    queryFn: () => labourGateApi.listDay(date),
    enabled,
  });
}

export function useRecordLabourIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordInRequest) => labourGateApi.recordIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DAY_KEY] });
    },
  });
}

export function useUpdateLabourIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count_in }: { id: number; count_in: number }) =>
      labourGateApi.updateIn(id, count_in),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DAY_KEY] });
    },
  });
}

export function useRemoveLabourIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labourGateApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DAY_KEY] });
    },
  });
}

export function useAddLabourOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count }: { id: number; count: number }) =>
      labourGateApi.addOut(id, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DAY_KEY] });
    },
  });
}

export function useUndoLabourOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labourGateApi.undoOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DAY_KEY] });
    },
  });
}
