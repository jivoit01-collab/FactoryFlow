import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fillingCostBoardApi } from './filling-cost-board.api';

export const FILLING_COST_BOARD_KEYS = {
  all: ['filling-cost-board'] as const,
  board: (month?: string, day?: string) =>
    [...FILLING_COST_BOARD_KEYS.all, month ?? 'current', day ?? 'yesterday'] as const,
};

/**
 * The month's saved sheets and one day in full. Picking another day keeps the
 * board on screen while it loads, so the month does not blink out and back.
 */
export function useFillingCostBoard(month?: string, day?: string) {
  return useQuery({
    queryKey: FILLING_COST_BOARD_KEYS.board(month, day),
    queryFn: () => fillingCostBoardApi.getBoard(month, day),
    placeholderData: keepPreviousData,
  });
}
