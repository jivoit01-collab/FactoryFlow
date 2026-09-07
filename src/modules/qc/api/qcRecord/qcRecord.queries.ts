import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateQCRecordRequest,
  ListQCRecordsParams,
  RecordCellWrite,
  RecordTemplateWrite,
} from '../../types/qcRecord.types';
import { qcRecordApi } from './qcRecord.api';

export const QC_RECORD_QUERY_KEYS = {
  all: ['qcRecords'] as const,
  templates: () => [...QC_RECORD_QUERY_KEYS.all, 'templates'] as const,
  template: (id: number) => [...QC_RECORD_QUERY_KEYS.all, 'template', id] as const,
  list: (params: ListQCRecordsParams) =>
    [...QC_RECORD_QUERY_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...QC_RECORD_QUERY_KEYS.all, 'detail', id] as const,
};

export function useRecordTemplates() {
  return useQuery({
    queryKey: QC_RECORD_QUERY_KEYS.templates(),
    queryFn: () => qcRecordApi.listTemplates(),
  });
}

export function useRecordTemplate(id: number | null) {
  return useQuery({
    queryKey: QC_RECORD_QUERY_KEYS.template(id!),
    queryFn: () => qcRecordApi.getTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateRecordTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordTemplateWrite) => qcRecordApi.createTemplate(data),
    onSuccess: (template) => {
      // Seeded so the builder can navigate straight onto the new form without
      // a round trip for what the response already carried.
      queryClient.setQueryData(QC_RECORD_QUERY_KEYS.template(template.id), template);
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useUpdateRecordTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecordTemplateWrite> }) =>
      qcRecordApi.updateTemplate(id, data),
    onSuccess: (template) => {
      queryClient.setQueryData(QC_RECORD_QUERY_KEYS.template(template.id), template);
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useDeleteRecordTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => qcRecordApi.removeTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useQCRecords(params: ListQCRecordsParams = {}) {
  return useQuery({
    queryKey: QC_RECORD_QUERY_KEYS.list(params),
    queryFn: () => qcRecordApi.list(params),
  });
}

export function useQCRecord(id: number | null) {
  return useQuery({
    queryKey: QC_RECORD_QUERY_KEYS.detail(id!),
    queryFn: () => qcRecordApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQCRecordRequest) => qcRecordApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useSaveRecordValues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cells }: { id: number; cells: RecordCellWrite[] }) =>
      qcRecordApi.saveValues(id, cells),
    onSuccess: (record) => {
      // Seed the detail cache from the response so the grid re-renders with
      // the server's own in_spec verdicts rather than waiting on a refetch.
      queryClient.setQueryData(QC_RECORD_QUERY_KEYS.detail(record.id), record);
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useSubmitQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => qcRecordApi.submit(id),
    onSuccess: (record) => {
      queryClient.setQueryData(QC_RECORD_QUERY_KEYS.detail(record.id), record);
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useDecideQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: number;
      decision: 'APPROVE' | 'REJECT';
      remarks?: string;
    }) => qcRecordApi.decide(id, decision, remarks),
    onSuccess: (record) => {
      queryClient.setQueryData(QC_RECORD_QUERY_KEYS.detail(record.id), record);
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}

export function useDeleteQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => qcRecordApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QC_RECORD_QUERY_KEYS.all });
    },
  });
}
