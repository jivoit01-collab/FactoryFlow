/** Folds the shared linking feed into trucks + a pending-linking queue. */
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
  pending: [],
  counts: {
    trucksToday: 0,
    linkedBillsToday: 0,
    pendingToday: 0,
    pendingOverdue: 0,
    pendingUpcoming: 0,
  },
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
