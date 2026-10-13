import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cashSaleOutApi,
  type CashSaleOutCreateRequest,
  type CashSaleOutListParams,
} from './cashSaleOut.api';

export const CASH_SALE_OUT_QUERY_KEYS = {
  all: ['cashSaleOut'] as const,
  list: (params?: CashSaleOutListParams) =>
    [...CASH_SALE_OUT_QUERY_KEYS.all, 'list', params] as const,
  pendingBills: () => [...CASH_SALE_OUT_QUERY_KEYS.all, 'pendingBills'] as const,
};

export function useCashSaleOuts(params?: CashSaleOutListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CASH_SALE_OUT_QUERY_KEYS.list(params),
    queryFn: () => cashSaleOutApi.list(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Read from SAP for every company the user is in, so only while the picker is
 * open. The week's list is small enough to search in the browser.
 */
export function useCashSalePendingBills(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CASH_SALE_OUT_QUERY_KEYS.pendingBills(),
    queryFn: () => cashSaleOutApi.pendingBills(),
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCashSaleOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CashSaleOutCreateRequest) => cashSaleOutApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CASH_SALE_OUT_QUERY_KEYS.all }),
  });
}

export function useCancelCashSaleOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      cashSaleOutApi.cancel(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CASH_SALE_OUT_QUERY_KEYS.all }),
  });
}
