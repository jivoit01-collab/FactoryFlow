import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type EntryDetail,
  type EntryFilters,
  type IssuePreview,
  type PlanInput,
  productionOrdersApi,
  type ReceiptInput,
  type SapOrderFilters,
  type StepInput,
  type StepKey,
} from './production-orders.api';

/** Every query key this module owns. A write invalidates every list that shows its rows. */
const KEYS = {
  all: ['productionOrders'] as const,
  me: ['productionOrders', 'me'] as const,
  products: (search: string) => ['productionOrders', 'products', search] as const,
  varieties: ['productionOrders', 'varieties'] as const,
  entries: (filters: EntryFilters) => ['productionOrders', 'entries', filters] as const,
  entry: (id: number) => ['productionOrders', 'entry', id] as const,
  sapOrders: (filters: SapOrderFilters) => ['productionOrders', 'sapOrders', filters] as const,
  step: (id: number, step: StepKey) => ['productionOrders', 'entry', id, 'step', step] as const,
};

export function useProductionOrdersMe() {
  return useQuery({ queryKey: KEYS.me, queryFn: productionOrdersApi.me, staleTime: 60_000 });
}

export function useProductSearch(search: string) {
  return useQuery({
    queryKey: KEYS.products(search),
    queryFn: () => productionOrdersApi.products(search),
    enabled: search.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useVarieties() {
  return useQuery({
    queryKey: KEYS.varieties,
    queryFn: productionOrdersApi.varieties,
    staleTime: 30 * 60_000,
  });
}

export function useEntries(filters: EntryFilters) {
  return useQuery({
    queryKey: KEYS.entries(filters),
    queryFn: () => productionOrdersApi.entries(filters),
    placeholderData: keepPreviousData,
  });
}

/** SAP's own production orders, read straight from SAP. */
export function useSapOrders(filters: SapOrderFilters) {
  return useQuery({
    queryKey: KEYS.sapOrders(filters),
    queryFn: () => productionOrdersApi.sapOrders(filters),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
}

/** An entry; polled while one of its steps is waiting for SAP, so the page
 * shows the queue posting it without a reload. */
export function useEntry(id: number | null) {
  return useQuery({
    queryKey: KEYS.entry(id ?? 0),
    queryFn: () => productionOrdersApi.entry(id as number),
    enabled: id !== null && Number.isFinite(id),
    refetchInterval: (query) => {
      const entry = query.state.data as EntryDetail | undefined;
      const waiting = entry?.steps.some(
        (step) =>
          !step.done && (step.posting?.status === 'QUEUED' || step.posting?.status === 'SENDING'),
      );
      return waiting ? 15_000 : false;
    },
  });
}

/** The planned order the Plan step's fields would create (POST, but it saves nothing). */
export function usePlanPreview(input: PlanInput | null) {
  return useQuery({
    queryKey: ['productionOrders', 'planPreview', input],
    queryFn: () => productionOrdersApi.planPreview(input as PlanInput),
    enabled: input !== null,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
}

export function useIssuePreview(id: number, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.step(id, 'ISSUE'),
    queryFn: () => productionOrdersApi.stepPreview<IssuePreview>(id, 'ISSUE'),
    enabled,
    retry: false,
    staleTime: 0,
  });
}

/** The receipt's batch for the fields as typed. */
export function useReceiptPreview(id: number, input: ReceiptInput | null) {
  return useQuery({
    queryKey: ['productionOrders', 'receiptPreview', id, input],
    queryFn: () => productionOrdersApi.receiptPreview(id, input as ReceiptInput),
    enabled: input !== null,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 15_000,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEYS.all });
}

export function useCreateEntry() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ input, post }: { input: PlanInput; post: boolean }) =>
      productionOrdersApi.create(input, post),
    onSettled: invalidate,
  });
}

/** Save a step's fields; post it to SAP when `post`. */
export function useSaveStep(id: number, step: StepKey) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ input, post }: { input: StepInput; post: boolean }) =>
      productionOrdersApi.saveStep(id, step, input, post),
    // Whatever SAP said, the entry and its steps changed.
    onSettled: invalidate,
  });
}

/** Take a released order (nothing issued) back to planned in SAP. */
export function useUnrelease(id: number) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => productionOrdersApi.unrelease(id),
    onSettled: invalidate,
  });
}

export function useDeleteEntry() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => productionOrdersApi.remove(id),
    onSuccess: invalidate,
  });
}
