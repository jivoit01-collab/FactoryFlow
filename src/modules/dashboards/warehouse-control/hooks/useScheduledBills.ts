/** Bills carrying a dispatch date that have not gone out, from the Plans feed. */
import { useMemo } from 'react';

import { useControlPlanBills } from '../api';
import type { ControlScheduledQueue } from '../types';
import { buildScheduledQueue } from '../utils/scheduledBills';

export interface UseScheduledBillsResult {
  queue: ControlScheduledQueue;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

const EMPTY_QUEUE: ControlScheduledQueue = {
  rows: [],
  counts: { total: 0, overdue: 0, today: 0, upcoming: 0, alreadyBooked: 0 },
};

export function useScheduledBills(date: string, enabled = true): UseScheduledBillsResult {
  const query = useControlPlanBills(date, enabled);

  const queue = useMemo(() => {
    if (!query.data) return EMPTY_QUEUE;
    return buildScheduledQueue({ bills: query.data.data, today: date });
  }, [query.data, date]);

  return {
    queue,
    isLoading: enabled && query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
