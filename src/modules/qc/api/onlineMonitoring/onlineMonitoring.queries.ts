import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateOnlineRecordRequest,
  OnlineMonitoringListParams,
  OnlineReadingWrite,
} from '../../types';
import { onlineMonitoringApi } from './onlineMonitoring.api';

export const ONLINE_MONITORING_KEYS = {
  all: ['onlineMonitoring'] as const,
  list: (params?: OnlineMonitoringListParams) =>
    [...ONLINE_MONITORING_KEYS.all, 'list', params ?? {}] as const,
  detail: (id: number) => [...ONLINE_MONITORING_KEYS.all, 'detail', id] as const,
  lines: () => [...ONLINE_MONITORING_KEYS.all, 'lines'] as const,
  specs: () => [...ONLINE_MONITORING_KEYS.all, 'specs'] as const,
};

export function useOnlineMonitoringList(params?: OnlineMonitoringListParams) {
  return useQuery({
    queryKey: ONLINE_MONITORING_KEYS.list(params),
    queryFn: () => onlineMonitoringApi.list(params),
    staleTime: 20_000,
  });
}

export function useOnlineMonitoringRecord(recordId: number | null) {
  return useQuery({
    queryKey: ONLINE_MONITORING_KEYS.detail(recordId!),
    queryFn: () => onlineMonitoringApi.get(recordId!),
    enabled: !!recordId,
  });
}

export function useOnlineMonitoringLines(enabled = true) {
  return useQuery({
    queryKey: ONLINE_MONITORING_KEYS.lines(),
    queryFn: () => onlineMonitoringApi.lines(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useOnlineMonitoringSpecs() {
  return useQuery({
    queryKey: ONLINE_MONITORING_KEYS.specs(),
    queryFn: () => onlineMonitoringApi.specs(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateOnlineRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOnlineRecordRequest) => onlineMonitoringApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ONLINE_MONITORING_KEYS.all }),
  });
}

function useRecordMutation<TArgs>(fn: (recordId: number, args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, args }: { recordId: number; args: TArgs }) => fn(recordId, args),
    onSuccess: (_data, { recordId }) => {
      qc.invalidateQueries({ queryKey: ONLINE_MONITORING_KEYS.detail(recordId) });
      qc.invalidateQueries({ queryKey: ONLINE_MONITORING_KEYS.all });
    },
  });
}

export const useAddOnlineReading = () =>
  useRecordMutation((recordId: number, args: OnlineReadingWrite) =>
    onlineMonitoringApi.addReading(recordId, args),
  );

export const useUpdateOnlineReading = () =>
  useRecordMutation((recordId: number, args: { readingId: number; payload: Partial<OnlineReadingWrite> }) =>
    onlineMonitoringApi.updateReading(recordId, args.readingId, args.payload),
  );

export const useDeleteOnlineReading = () =>
  useRecordMutation((recordId: number, args: { readingId: number }) =>
    onlineMonitoringApi.deleteReading(recordId, args.readingId),
  );

export const useUploadReadingAttachment = () =>
  useRecordMutation((recordId: number, args: { readingId: number; file: File }) =>
    onlineMonitoringApi.uploadReadingAttachment(recordId, args.readingId, args.file),
  );

export const useDeleteReadingAttachment = () =>
  useRecordMutation((recordId: number, args: { readingId: number; attachmentId: number }) =>
    onlineMonitoringApi.deleteReadingAttachment(recordId, args.readingId, args.attachmentId),
  );

export const useSubmitOnlineRecord = () =>
  useRecordMutation((recordId: number) => onlineMonitoringApi.submit(recordId));

export const useApproveOnlineRecord = () =>
  useRecordMutation((recordId: number, args: { remarks?: string }) =>
    onlineMonitoringApi.approve(recordId, args.remarks),
  );

export const useRejectOnlineRecord = () =>
  useRecordMutation((recordId: number, args: { remarks?: string }) =>
    onlineMonitoringApi.reject(recordId, args.remarks),
  );

export const useReopenOnlineRecord = () =>
  useRecordMutation((recordId: number) => onlineMonitoringApi.reopen(recordId));

export function useUpdateOnlineSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      specId,
      payload,
    }: {
      specId: number;
      payload: Parameters<typeof onlineMonitoringApi.updateSpec>[1];
    }) => onlineMonitoringApi.updateSpec(specId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ONLINE_MONITORING_KEYS.specs() }),
  });
}

export function useResetOnlineSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (specId: number) => onlineMonitoringApi.resetSpec(specId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ONLINE_MONITORING_KEYS.specs() }),
  });
}

export const useDeleteOnlineRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: number) => onlineMonitoringApi.remove(recordId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ONLINE_MONITORING_KEYS.all }),
  });
};
