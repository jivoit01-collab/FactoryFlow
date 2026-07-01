import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  FireReportReviewPayload,
  FireShiftReportAttachmentUploadPayload,
  FireShiftReportFilters,
  FireShiftReportItemPayload,
  FireShiftReportPayload,
  FireShiftReportPhotoUploadPayload,
  FireShiftReportUpdatePayload,
} from '../types';
import { fireReportApi } from './fireReport.api';

export const FIRE_REPORT_QUERY_KEYS = {
  all: ['maintenance', 'fire-reports'] as const,
  list: (filters?: FireShiftReportFilters) =>
    [...FIRE_REPORT_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  detail: (reportId: number) => [...FIRE_REPORT_QUERY_KEYS.all, 'detail', reportId] as const,
};

function invalidateReports(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FIRE_REPORT_QUERY_KEYS.all });
}

export function useFireReports(filters?: FireShiftReportFilters, enabled = true) {
  return useQuery({
    queryKey: FIRE_REPORT_QUERY_KEYS.list(filters),
    queryFn: () => fireReportApi.getReports(filters),
    enabled,
  });
}

export function useFireReport(reportId: number | null) {
  return useQuery({
    queryKey: FIRE_REPORT_QUERY_KEYS.detail(reportId!),
    queryFn: () => fireReportApi.getReport(reportId!),
    enabled: reportId !== null,
  });
}

export function useCreateFireReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireShiftReportPayload) => fireReportApi.createReport(payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useUpdateFireReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: number; payload: FireShiftReportUpdatePayload }) =>
      fireReportApi.updateReport(reportId, payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useDeleteFireReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => fireReportApi.deleteReport(reportId),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useReviewFireReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: number; payload: FireReportReviewPayload }) =>
      fireReportApi.reviewReport(reportId, payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useCreateFireReportItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireShiftReportItemPayload) => fireReportApi.createItem(payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useUpdateFireReportItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: Partial<FireShiftReportItemPayload> }) =>
      fireReportApi.updateItem(itemId, payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useDeleteFireReportItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => fireReportApi.deleteItem(itemId),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useUploadFireReportPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireShiftReportPhotoUploadPayload) => fireReportApi.uploadPhoto(payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useDeleteFireReportPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => fireReportApi.deletePhoto(photoId),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useUploadFireReportAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FireShiftReportAttachmentUploadPayload) =>
      fireReportApi.uploadAttachment(payload),
    onSuccess: () => invalidateReports(queryClient),
  });
}

export function useDeleteFireReportAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => fireReportApi.deleteAttachment(attachmentId),
    onSuccess: () => invalidateReports(queryClient),
  });
}
