import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import { getErrorMessage } from '@/shared/utils';

import { PLAN_STALE_TIME, REQUIREMENT_STALE_TIME } from '../constants';
import type {
  BucketType,
  CreatePurchaseOrdersRequest,
  ProducibleFilters,
  PurchaseOrderListFilters,
  RequirementFilters,
  SpreadPolicy,
  UpdatePurchaseOrderRequest,
} from '../types';
import { planApi, purchaseOrderApi } from './planning-purchase.api';

/**
 * Everything is keyed on the current company: the plan, the stock and the
 * suppliers all come from that company's SAP schema, and the same item code
 * means a different product in a different one. Sharing a cache entry across
 * companies would show one factory another's numbers.
 */
export const PLANNING_PURCHASE_KEYS = {
  all: ['planning-purchase'] as const,
  plans: (companyId?: number | string) =>
    [...PLANNING_PURCHASE_KEYS.all, 'plans', companyId] as const,
  plan: (
    companyId: number | string | undefined,
    absId: number,
    bucketType: BucketType,
    spreadPolicy: SpreadPolicy,
  ) =>
    [...PLANNING_PURCHASE_KEYS.all, 'plan', companyId, absId, bucketType, spreadPolicy] as const,
  requirement: (
    companyId: number | string | undefined,
    absId: number,
    filters: RequirementFilters,
  ) =>
    [
      ...PLANNING_PURCHASE_KEYS.all,
      'requirement',
      companyId,
      absId,
      filters.material_type ?? null,
      (filters.warehouse ?? []).join(',') || null,
      filters.include_covered ?? true,
    ] as const,
  producible: (
    companyId: number | string | undefined,
    absId: number,
    filters: ProducibleFilters,
  ) =>
    [
      ...PLANNING_PURCHASE_KEYS.all,
      'producible',
      companyId,
      absId,
      filters.target_date ?? null,
      filters.stock_basis ?? 'ON_HAND',
      (filters.warehouse ?? []).join(',') || null,
    ] as const,
  vendors: (companyId: number | string | undefined, search: string) =>
    [...PLANNING_PURCHASE_KEYS.all, 'vendors', companyId, search] as const,
  warehouses: (companyId?: number | string) =>
    [...PLANNING_PURCHASE_KEYS.all, 'warehouses', companyId] as const,
  purchaseOrders: (companyId: number | string | undefined, filters: PurchaseOrderListFilters) =>
    [...PLANNING_PURCHASE_KEYS.all, 'purchase-orders', companyId, filters] as const,
  purchaseOrder: (companyId: number | string | undefined, id: number) =>
    [...PLANNING_PURCHASE_KEYS.all, 'purchase-order', companyId, id] as const,
};

export function usePlans(limit = 36) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.plans(currentCompany?.company_id),
    queryFn: () => planApi.list(limit),
    staleTime: PLAN_STALE_TIME,
  });
}

export function usePlanDetail(
  absId: number | undefined,
  bucketType: BucketType,
  spreadPolicy: SpreadPolicy,
) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.plan(
      currentCompany?.company_id,
      absId ?? 0,
      bucketType,
      spreadPolicy,
    ),
    queryFn: () => planApi.detail(absId as number, { bucketType, spreadPolicy }),
    enabled: Boolean(absId),
    staleTime: PLAN_STALE_TIME,
  });
}

/**
 * The requirement explodes every BOM on the plan and reads stock and open POs
 * for every component, so it is several seconds on a full plan. It does not
 * refetch on window focus — a planner tabbing back should not trigger another
 * pass — and "Refresh" is left to mean something.
 */
export function useRequirement(absId: number | undefined, filters: RequirementFilters) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.requirement(
      currentCompany?.company_id,
      absId ?? 0,
      filters,
    ),
    queryFn: () => planApi.requirement(absId as number, filters),
    enabled: Boolean(absId),
    staleTime: REQUIREMENT_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * What can be built from stock. Reads every BOM plus stock for every component,
 * so it does not refetch on focus and holds for the same window as the plan.
 */
export function useProducible(absId: number | undefined, filters: ProducibleFilters) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.producible(
      currentCompany?.company_id,
      absId ?? 0,
      filters,
    ),
    queryFn: () => planApi.producible(absId as number, filters),
    enabled: Boolean(absId),
    staleTime: REQUIREMENT_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useVendors(search = '') {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.vendors(currentCompany?.company_id, search),
    queryFn: () => planApi.vendors(search),
    staleTime: 30 * 60 * 1000,
  });
}

export function useWarehouses() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.warehouses(currentCompany?.company_id),
    queryFn: () => planApi.warehouses(),
    staleTime: 60 * 60 * 1000,
  });
}

export function usePurchaseOrders(filters: PurchaseOrderListFilters = {}) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.purchaseOrders(currentCompany?.company_id, filters),
    queryFn: () => purchaseOrderApi.list(filters),
    staleTime: 30 * 1000,
  });
}

export function usePurchaseOrder(id: number | undefined) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: PLANNING_PURCHASE_KEYS.purchaseOrder(currentCompany?.company_id, id ?? 0),
    queryFn: () => purchaseOrderApi.detail(id as number),
    enabled: Boolean(id),
  });
}

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({
      queryKey: [...PLANNING_PURCHASE_KEYS.all],
      predicate: (query) =>
        typeof query.queryKey[1] === 'string' &&
        query.queryKey[1].startsWith('purchase-order'),
    });
}

export function useCreatePurchaseOrders() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrdersRequest) => purchaseOrderApi.create(payload),
    onSuccess: (result) => {
      invalidate();
      const count = result.meta.created;
      toast.success(
        count === 1
          ? 'Draft purchase order created.'
          : `${count} draft purchase orders created — one per supplier.`,
      );
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not create the purchase order.')),
  });
}

export function useUpdatePurchaseOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePurchaseOrderRequest }) =>
      purchaseOrderApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Purchase order updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update the order.')),
  });
}

export function useApprovePurchaseOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (id: number) => purchaseOrderApi.approve(id),
    onSuccess: () => {
      invalidate();
      toast.success('Approved. It can now be posted to SAP.');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not approve the order.')),
  });
}

export function usePostPurchaseOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (id: number) => purchaseOrderApi.postToSap(id),
    onSuccess: (result) => {
      invalidate();
      // Say plainly when nothing reached SAP. A "posted" toast after a simulated
      // post sends somebody looking in SAP for a document that never existed.
      if (result.meta.simulated) {
        toast.warning('Marked posted in simulate mode — nothing was sent to SAP.');
      } else {
        toast.success(`Created in SAP as ${result.data.sap_doc_num ?? 'a new document'}.`);
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'SAP rejected the order.')),
  });
}

export function useCancelPurchaseOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      purchaseOrderApi.cancel(id, reason ?? ''),
    onSuccess: () => {
      invalidate();
      toast.success('Purchase order cancelled.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel the order.')),
  });
}

/** Downloads the requirement workbook through the authenticated client. */
export function useExportRequirement() {
  return useMutation({
    mutationFn: async ({
      absId,
      planCode,
      filters,
    }: {
      absId: number;
      planCode: string;
      filters: RequirementFilters;
    }) => {
      const blob = await planApi.exportRequirement(absId, filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `requirement_${planCode || absId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not export.')),
  });
}
