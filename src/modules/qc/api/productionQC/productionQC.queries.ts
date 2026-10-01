import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateProductionQCEntryRequest,
  ProductionParameterRequest,
  ProductionParameterTypeListParams,
  ProductionParameterTypeRequest,
  ProductionQCDateRangeParams,
  ProductionQCEntryListParams,
  UpdateProductionQCEntryRequest,
} from '../../types/productionQC.types';
import { productionQCApi } from './productionQC.api';

export const PRODUCTION_QC_QUERY_KEYS = {
  all: ['productionQC'] as const,
  /** Lists, counts (and so the sidebar badge) and details: what a decision changes. */
  entries: () => [...PRODUCTION_QC_QUERY_KEYS.all, 'entries'] as const,
  entryList: (params?: ProductionQCEntryListParams) =>
    [...PRODUCTION_QC_QUERY_KEYS.entries(), 'list', params ?? {}] as const,
  entrySheet: (params: ProductionQCEntryListParams) =>
    [...PRODUCTION_QC_QUERY_KEYS.entries(), 'sheet', params] as const,
  entryCounts: (params?: ProductionQCDateRangeParams) =>
    [...PRODUCTION_QC_QUERY_KEYS.entries(), 'counts', params ?? {}] as const,
  entry: (id: number) => [...PRODUCTION_QC_QUERY_KEYS.entries(), 'detail', id] as const,
  /** The masters: types and their parameters. */
  parameterTypes: () => [...PRODUCTION_QC_QUERY_KEYS.all, 'parameterTypes'] as const,
  parameterTypeList: (params?: ProductionParameterTypeListParams) =>
    [...PRODUCTION_QC_QUERY_KEYS.parameterTypes(), 'list', params ?? {}] as const,
  parameterType: (id: number) =>
    [...PRODUCTION_QC_QUERY_KEYS.parameterTypes(), 'detail', id] as const,
  parameters: (typeId: number) =>
    [...PRODUCTION_QC_QUERY_KEYS.parameterTypes(), 'parameters', typeId] as const,
};

// ==================== Entries ====================

/**
 * The list and its counts are made and approved from different screens — the
 * floor fills, a lead approves elsewhere — so they refresh on coming back to the
 * tab (the app turns that off by default) and every minute while it is in front.
 * Both use the same settings, so the counts never run ahead of the list.
 */
const ENTRY_LIST_REFRESH = {
  staleTime: 30 * 1000,
  refetchOnWindowFocus: 'always',
  refetchInterval: 60 * 1000,
} as const;

export function useProductionQCEntries(params?: ProductionQCEntryListParams) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.entryList(params),
    queryFn: () => productionQCApi.listEntries(params),
    ...ENTRY_LIST_REFRESH,
  });
}

/** A day's entries with their readings, laid out as the paper record. */
export function useProductionQCSheetEntries(params: ProductionQCEntryListParams, enabled = true) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.entrySheet(params),
    queryFn: () => productionQCApi.listEntriesWithResults(params),
    enabled,
    ...ENTRY_LIST_REFRESH,
  });
}

/**
 * Pending and sent-back cover every date; approved covers the range (today when
 * none). The sidebar badge polls it with no range, for the pending count, on its
 * own interval; the dashboard takes the list's refresh.
 */
export function useProductionQCEntryCounts(
  params?: ProductionQCDateRangeParams,
  enabled = true,
  refetchInterval: number | false = ENTRY_LIST_REFRESH.refetchInterval,
) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.entryCounts(params),
    queryFn: () => productionQCApi.getEntryCounts(params),
    enabled,
    staleTime: ENTRY_LIST_REFRESH.staleTime,
    refetchOnWindowFocus: ENTRY_LIST_REFRESH.refetchOnWindowFocus,
    refetchInterval: enabled ? refetchInterval : false,
  });
}

export function useProductionQCEntry(id: number | null) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.entry(id ?? 0),
    queryFn: () => productionQCApi.getEntry(id!),
    enabled: !!id,
  });
}

export function useCreateProductionQCEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductionQCEntryRequest) => productionQCApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QC_QUERY_KEYS.entries() });
    },
  });
}

export function useUpdateProductionQCEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductionQCEntryRequest }) =>
      productionQCApi.updateEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QC_QUERY_KEYS.entries() });
    },
  });
}

export function useApproveProductionQCEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      productionQCApi.approveEntry(id, { remarks: remarks ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QC_QUERY_KEYS.entries() });
    },
  });
}

export function useSendBackProductionQCEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      productionQCApi.sendBackEntry(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QC_QUERY_KEYS.entries() });
    },
  });
}

// ==================== Parameter types ====================

export function useProductionParameterTypes(
  params?: ProductionParameterTypeListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.parameterTypeList(params),
    queryFn: () => productionQCApi.listParameterTypes(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useProductionParameterType(id: number | null) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.parameterType(id ?? 0),
    queryFn: () => productionQCApi.getParameterType(id!),
    enabled: !!id,
  });
}

/** Everything a master edit can change: the types and their parameters. */
function useInvalidateMasters() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PRODUCTION_QC_QUERY_KEYS.parameterTypes() });
    // A type's form number is its Print Documents row (Master Data): refresh that
    // list too. Its key is PRINT_DOCUMENT_QUERY_KEYS.all, spelled out here because
    // the print-document hooks import these.
    queryClient.invalidateQueries({ queryKey: ['qcPrintDocuments'] });
  };
}

export function useCreateProductionParameterType() {
  const invalidate = useInvalidateMasters();
  return useMutation({
    mutationFn: (data: ProductionParameterTypeRequest) => productionQCApi.createParameterType(data),
    onSuccess: invalidate,
  });
}

export function useUpdateProductionParameterType() {
  const invalidate = useInvalidateMasters();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductionParameterTypeRequest> }) =>
      productionQCApi.updateParameterType(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteProductionParameterType() {
  const invalidate = useInvalidateMasters();
  return useMutation({
    mutationFn: (id: number) => productionQCApi.deleteParameterType(id),
    onSuccess: invalidate,
  });
}

// ==================== Parameters ====================

export function useProductionParameters(typeId: number | null) {
  return useQuery({
    queryKey: PRODUCTION_QC_QUERY_KEYS.parameters(typeId ?? 0),
    queryFn: () => productionQCApi.listParameters(typeId!),
    enabled: !!typeId,
  });
}

export function useCreateProductionParameter() {
  const invalidate = useInvalidateMasters();
  return useMutation({
    mutationFn: ({ typeId, data }: { typeId: number; data: ProductionParameterRequest }) =>
      productionQCApi.createParameter(typeId, data),
    onSuccess: invalidate,
  });
}

export function useUpdateProductionParameter() {
  const invalidate = useInvalidateMasters();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductionParameterRequest> }) =>
      productionQCApi.updateParameter(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteProductionParameter() {
  const invalidate = useInvalidateMasters();
  return useMutation({
    mutationFn: (id: number) => productionQCApi.deleteParameter(id),
    onSuccess: invalidate,
  });
}
