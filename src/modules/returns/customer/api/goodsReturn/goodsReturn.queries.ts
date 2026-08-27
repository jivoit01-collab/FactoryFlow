import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateGoodsReturnPayload,
  goodsReturnApi,
  type GoodsReturnApprovalStatus,
  type GoodsReturnAttachmentType,
  type SaveItemsPayload,
  type SetVehiclePayload,
} from './goodsReturn.api';

export const goodsReturnKeys = {
  all: ['goods-return'] as const,
  list: (params?: Record<string, unknown>) => ['goods-return', 'list', params ?? {}] as const,
  detail: (id: number) => ['goods-return', 'detail', id] as const,
  expected: () => ['goods-return', 'gate', 'expected'] as const,
  warehouses: () => ['goods-return', 'warehouses'] as const,
  returnableItems: (id: number, search: string) =>
    ['goods-return', 'returnable-items', id, search] as const,
};

/**
 * Items this return's customer has been invoiced. Only the customer's own
 * history is offered — anything else has no tax code and SAP would refuse the
 * return line at posting.
 */
export function useReturnableItems(id: number | null, search = '') {
  return useQuery({
    queryKey: goodsReturnKeys.returnableItems(id ?? 0, search),
    queryFn: () => goodsReturnApi.returnableItems(id as number, { search, limit: 200 }),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useGoodsReturns(params?: {
  status?: string;
  basis?: string;
  search?: string;
  approval?: GoodsReturnApprovalStatus;
  all_companies?: boolean;
}) {
  return useQuery({
    queryKey: goodsReturnKeys.list(params),
    queryFn: () => goodsReturnApi.list(params),
  });
}

/** Pending-approval GRs across the user's companies (admin queue + badge). */
export function usePendingApprovalGoodsReturns(enabled = true) {
  const params = { approval: 'PENDING' as const, all_companies: true };
  return useQuery({
    queryKey: goodsReturnKeys.list(params),
    queryFn: () => goodsReturnApi.list(params),
    enabled,
  });
}

export function useApproveGoodsReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; remarks?: string }) =>
      goodsReturnApi.approve(input.id, input.remarks),
    onSuccess: (data) => {
      qc.setQueryData(goodsReturnKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: goodsReturnKeys.all });
    },
  });
}

export function useRejectGoodsReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; remarks?: string }) =>
      goodsReturnApi.reject(input.id, input.remarks),
    onSuccess: (data) => {
      qc.setQueryData(goodsReturnKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: goodsReturnKeys.all });
    },
  });
}

export function useGoodsReturn(id: number | null, withInvoicePreview = false) {
  return useQuery({
    queryKey: goodsReturnKeys.detail(id ?? 0),
    queryFn: () => goodsReturnApi.get(id as number, withInvoicePreview),
    enabled: id !== null && id > 0,
  });
}

export function useInvoiceSearch() {
  return useMutation({
    mutationFn: (invoiceNumber: string) => goodsReturnApi.searchInvoice(invoiceNumber),
  });
}

export function useCreateGoodsReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGoodsReturnPayload) => goodsReturnApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: goodsReturnKeys.all }),
  });
}

export function useSaveGoodsReturnItems(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveItemsPayload) => goodsReturnApi.saveItems(id, payload),
    onSuccess: (data) => qc.setQueryData(goodsReturnKeys.detail(id), data),
  });
}

export function useSetGoodsReturnVehicle(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetVehiclePayload) => goodsReturnApi.setVehicle(id, payload),
    onSuccess: (data) => qc.setQueryData(goodsReturnKeys.detail(id), data),
  });
}

export function useUpdateGoodsReturnHeader(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { customer_code?: string; customer_name?: string; remarks?: string }) =>
      goodsReturnApi.updateHeader(id, payload),
    onSuccess: (data) => qc.setQueryData(goodsReturnKeys.detail(id), data),
  });
}

export function useAddInvoiceRef(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceNumber: string) => goodsReturnApi.addInvoiceRef(id, invoiceNumber),
    onSuccess: (data) => qc.setQueryData(goodsReturnKeys.detail(id), data),
  });
}

export function useRemoveInvoiceRef(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refId: number) => goodsReturnApi.removeInvoiceRef(id, refId),
    onSuccess: (data) => qc.setQueryData(goodsReturnKeys.detail(id), data),
  });
}

export function useUploadAttachment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; attachmentType: GoodsReturnAttachmentType; notes?: string }) =>
      goodsReturnApi.uploadAttachment(id, input.file, input.attachmentType, input.notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: goodsReturnKeys.detail(id) }),
  });
}

export function useDeleteAttachment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => goodsReturnApi.deleteAttachment(id, attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: goodsReturnKeys.detail(id) }),
  });
}

export function useSubmitGoodsReturn(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => goodsReturnApi.submit(id),
    onSuccess: (data) => {
      qc.setQueryData(goodsReturnKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: goodsReturnKeys.all });
    },
  });
}

export function useReturnWarehouses(enabled = true) {
  return useQuery({
    queryKey: goodsReturnKeys.warehouses(),
    queryFn: () => goodsReturnApi.listReturnWarehouses(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReceiveGoodsReturn(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (warehouseCode?: string) => goodsReturnApi.receive(id, warehouseCode),
    onSuccess: (data) => {
      qc.setQueryData(goodsReturnKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: goodsReturnKeys.all });
    },
  });
}

// Gate side
export function useExpectedGoodsReturns() {
  return useQuery({
    queryKey: goodsReturnKeys.expected(),
    queryFn: () => goodsReturnApi.listExpected(),
  });
}

export function useMarkGoodsReturnIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; remarks?: string }) =>
      goodsReturnApi.markIn(input.id, input.remarks),
    onSuccess: () => qc.invalidateQueries({ queryKey: goodsReturnKeys.expected() }),
  });
}
