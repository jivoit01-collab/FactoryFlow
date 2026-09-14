import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateShortDispatchPayload, shortDispatchApi } from './short-dispatch.api';

export const shortDispatchKeys = {
  all: ['short-dispatch'] as const,
  list: (params?: Record<string, unknown>) => ['short-dispatch', 'list', params ?? {}] as const,
  detail: (id: number) => ['short-dispatch', 'detail', id] as const,
  warehouses: () => ['short-dispatch', 'warehouses'] as const,
};

export function useShortDispatches(params?: {
  search?: string;
  from_date?: string;
  to_date?: string;
  all_companies?: boolean;
}) {
  return useQuery({
    queryKey: shortDispatchKeys.list(params),
    queryFn: () => shortDispatchApi.list(params),
  });
}

export function useShortDispatch(id: number | null) {
  return useQuery({
    queryKey: shortDispatchKeys.detail(id ?? 0),
    queryFn: () => shortDispatchApi.get(id as number),
    enabled: !!id,
  });
}

export function useShortDispatchWarehouses(enabled = true) {
  return useQuery({
    queryKey: shortDispatchKeys.warehouses(),
    queryFn: () => shortDispatchApi.listWarehouses(),
    enabled,
    staleTime: 10 * 60_000,
  });
}

/**
 * Looking a bill up is a mutation, not a query: it is something the operator
 * *asks for* by typing a number and pressing Enter, every call is a live SAP read,
 * and the answer must never come from a cache — the batches and the quantity left
 * on each line can have moved since the last look.
 */
export function useShortDispatchInvoiceLookup() {
  return useMutation({
    mutationFn: (invoiceNumber: string) => shortDispatchApi.lookupInvoice(invoiceNumber),
  });
}

/** Submitting the form posts the SAP Return. A success means it is already there. */
export function useCreateShortDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShortDispatchPayload) => shortDispatchApi.create(payload),
    onSuccess: (data) => {
      qc.setQueryData(shortDispatchKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: shortDispatchKeys.all });
    },
  });
}

/** SAP's Return Note. A mutation for the same reason as the lookup: it is a live
 *  read done on request, and SAP can still amend the document after we post it. */
export function useShortDispatchPrint() {
  return useMutation({
    mutationFn: (id: number) => shortDispatchApi.getPrint(id),
  });
}
