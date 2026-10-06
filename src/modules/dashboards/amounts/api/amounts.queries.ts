import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AMOUNTS_BOARD_REFRESH_MS } from '../constants';
import type { AmountsDebtorKey, StockCategoryKey } from '../types';
import { amountsBoardApi } from './amounts.api';

export const AMOUNTS_BOARD_QUERY_KEYS = {
  all: ['amounts-board'] as const,
  board: () => ['amounts-board', 'board'] as const,
  godownItems: (companyCode: string, category: StockCategoryKey, warehouse: string) =>
    ['amounts-board', 'godown-items', companyCode, category, warehouse] as const,
  debtors: (key: AmountsDebtorKey) => ['amounts-board', 'debtors', key] as const,
  debtorBills: (companyCode: string, cardCode: string) =>
    ['amounts-board', 'debtor-bills', companyCode, cardCode] as const,
  owners: () => ['amounts-board', 'owners'] as const,
};

/**
 * The board, polled.
 *
 * Not keyed on the signed-in company: the server composes all three schemas
 * whichever one the reader is in, so a switch changes nothing here. The last
 * answer stays up through a failed refresh and the header says it is stale.
 */
export function useAmountsBoard() {
  return useQuery({
    queryKey: AMOUNTS_BOARD_QUERY_KEYS.board(),
    queryFn: () => amountsBoardApi.getBoard(),
    staleTime: AMOUNTS_BOARD_REFRESH_MS,
    refetchInterval: (query) => {
      const seconds = query.state.data?.meta?.refresh_seconds;
      return seconds && seconds > 0 ? seconds * 1000 : AMOUNTS_BOARD_REFRESH_MS;
    },
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

/** One godown's items, read when it is opened. Not polled: it is read to be scanned. */
export function useAmountsGodownItems(
  companyCode: string,
  category: StockCategoryKey,
  warehouse: string,
) {
  return useQuery({
    queryKey: AMOUNTS_BOARD_QUERY_KEYS.godownItems(companyCode, category, warehouse),
    queryFn: () => amountsBoardApi.getGodownItems(companyCode, category, warehouse),
    staleTime: AMOUNTS_BOARD_REFRESH_MS,
    retry: false,
  });
}

/** The customers behind a debtor tile, read when it is opened. */
export function useAmountsDebtors(key: AmountsDebtorKey) {
  return useQuery({
    queryKey: AMOUNTS_BOARD_QUERY_KEYS.debtors(key),
    queryFn: () => amountsBoardApi.getDebtors(key),
    staleTime: AMOUNTS_BOARD_REFRESH_MS,
    retry: false,
  });
}

/** One customer's unpaid bills, read when the customer is opened. */
export function useAmountsDebtorBills(companyCode: string, cardCode: string) {
  return useQuery({
    queryKey: AMOUNTS_BOARD_QUERY_KEYS.debtorBills(companyCode, cardCode),
    queryFn: () => amountsBoardApi.getDebtorBills(companyCode, cardCode),
    staleTime: AMOUNTS_BOARD_REFRESH_MS,
    retry: false,
  });
}

export function useAmountsOwners() {
  return useQuery({
    queryKey: AMOUNTS_BOARD_QUERY_KEYS.owners(),
    queryFn: () => amountsBoardApi.getOwners(),
  });
}

/** Set or clear one owner, then re-read both the settings and the board. */
export function useSetAmountsOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: amountsBoardApi.setOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AMOUNTS_BOARD_QUERY_KEYS.all });
    },
  });
}
