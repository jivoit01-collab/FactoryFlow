/** Folds the Bills Linking feed into today's linked bills and their trucks. */
import { useMemo } from 'react';

import { useControlLinkingFeed } from '../api';
import type { ControlLinkingBoard } from '../types';
import { buildLinkingBoard } from '../utils/linkingBoard';

export interface UseLinkingBoardResult {
  board: ControlLinkingBoard;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

const EMPTY_BOARD: ControlLinkingBoard = {
  trucks: [],
  linkedBills: [],
  counts: {
    trucksToday: 0,
    linkedBillsToday: 0,
    dispatchedBillsToday: 0,
    dispatchedTrucksToday: 0,
    unlinkedToday: 0,
  },
  totals: { litres: 0, boxes: 0, amount: 0 },
};

export function useLinkingBoard(date: string, enabled = true): UseLinkingBoardResult {
  const query = useControlLinkingFeed(date, enabled);

  const board = useMemo(() => {
    if (!query.data) return EMPTY_BOARD;
    return buildLinkingBoard({ bills: query.data.data, today: date });
  }, [query.data, date]);

  return {
    board,
    isLoading: enabled && query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
