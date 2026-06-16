import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  salesDispatchApi,
  type SalesDispatchAttachmentUploadRequest,
  type SalesDispatchBoxScanRequest,
  type SalesDispatchChallanWeightRequest,
  type SalesDispatchCreateRequest,
  type SalesDispatchDocumentParams,
  type SalesDispatchDocumentType,
  type SalesDispatchGatepassPrintRequest,
  type SalesDispatchGatepassReprintRequest,
  type SalesDispatchListParams,
  type SalesDispatchLockUpdateRequest,
  type SalesDispatchPendingBookingParams,
  type SalesDispatchReasonRequest,
  type SalesDispatchReportParams,
  type SalesDispatchUpdateRequest,
} from './salesDispatch.api';

export const SALES_DISPATCH_QUERY_KEYS = {
  all: ['salesDispatch'] as const,
  documents: (params?: SalesDispatchDocumentParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'documents', params] as const,
  document: (documentType?: SalesDispatchDocumentType | null, docEntry?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'document', documentType, docEntry] as const,
  list: (params?: SalesDispatchListParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'list', params] as const,
  pendingBookings: (params?: SalesDispatchPendingBookingParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'pendingBookings', params] as const,
  reports: (params?: SalesDispatchReportParams) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'reports', params] as const,
  lock: () => [...SALES_DISPATCH_QUERY_KEYS.all, 'lock'] as const,
  detail: (id?: number | null) => [...SALES_DISPATCH_QUERY_KEYS.all, 'detail', id] as const,
  byVehicleEntry: (vehicleEntryId?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'byVehicleEntry', vehicleEntryId] as const,
  attachments: (id?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'attachments', id] as const,
  boxScans: (id?: number | null) => [...SALES_DISPATCH_QUERY_KEYS.all, 'boxScans', id] as const,
  gatepassPrintHistory: (id?: number | null) =>
    [...SALES_DISPATCH_QUERY_KEYS.all, 'gatepassPrintHistory', id] as const,
};

function invalidateSalesDispatch(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SALES_DISPATCH_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
  queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
}

export function useSalesDispatchDocuments(
  params?: SalesDispatchDocumentParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.documents(params),
    queryFn: () => salesDispatchApi.documents(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSalesDispatchDocument(
  documentType?: SalesDispatchDocumentType | null,
  docEntry?: number | null,
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.document(documentType, docEntry),
    queryFn: () => salesDispatchApi.document(documentType!, docEntry!),
    enabled: !!documentType && !!docEntry,
    staleTime: 60 * 1000,
  });
}

export function useSalesDispatchEntries(
  params?: SalesDispatchListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.list(params),
    queryFn: () => salesDispatchApi.list(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSalesDispatchPendingBookings(
  params?: SalesDispatchPendingBookingParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.pendingBookings(params),
    queryFn: () => salesDispatchApi.pendingBookings(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSalesDispatchReports(
  params?: SalesDispatchReportParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.reports(params),
    queryFn: () => salesDispatchApi.reports(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useSalesDispatchLock() {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.lock(),
    queryFn: () => salesDispatchApi.getLock(),
    staleTime: 30 * 1000,
  });
}

export function useSalesDispatch(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.detail(id),
    queryFn: () => salesDispatchApi.get(id!),
    enabled: !!id,
  });
}

export function useSalesDispatchByVehicleEntry(vehicleEntryId?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.byVehicleEntry(vehicleEntryId),
    queryFn: () => salesDispatchApi.getByVehicleEntry(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function useSalesDispatchAttachments(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.attachments(id),
    queryFn: () => salesDispatchApi.attachments(id!),
    enabled: !!id,
  });
}

export function useSalesDispatchBoxScans(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.boxScans(id),
    queryFn: () => salesDispatchApi.boxScans(id!),
    enabled: !!id,
  });
}

export function useCreateSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalesDispatchCreateRequest) => salesDispatchApi.create(data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useUpdateSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchUpdateRequest }) =>
      salesDispatchApi.update(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useUpdateSalesDispatchLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalesDispatchLockUpdateRequest) => salesDispatchApi.updateLock(data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useUploadSalesDispatchAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchAttachmentUploadRequest }) =>
      salesDispatchApi.uploadAttachment(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useScanSalesDispatchBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchBoxScanRequest }) =>
      salesDispatchApi.scanBox(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useRemoveSalesDispatchBoxScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scanId }: { id: number; scanId: number }) =>
      salesDispatchApi.removeBoxScan(id, scanId),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function usePreviewSalesDispatchGatepass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.previewGatepass(id),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function usePrintSalesDispatchGatepass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchGatepassPrintRequest }) =>
      salesDispatchApi.printGatepass(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useReprintSalesDispatchGatepass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchGatepassReprintRequest }) =>
      salesDispatchApi.reprintGatepass(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useSalesDispatchGatepassPrintHistory(id?: number | null) {
  return useQuery({
    queryKey: SALES_DISPATCH_QUERY_KEYS.gatepassPrintHistory(id),
    queryFn: () => salesDispatchApi.gatepassPrintHistory(id as number),
    enabled: Boolean(id),
  });
}

export function useSetSalesDispatchChallanWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchChallanWeightRequest }) =>
      salesDispatchApi.setChallanWeight(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useCommitSalesDispatchPrint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.commitPrint(id),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useMarkSalesDispatchDispatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesDispatchApi.markDispatched(id),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useRejectSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchReasonRequest }) =>
      salesDispatchApi.reject(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}

export function useCancelSalesDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SalesDispatchReasonRequest }) =>
      salesDispatchApi.cancel(id, data),
    onSuccess: () => invalidateSalesDispatch(queryClient),
  });
}
