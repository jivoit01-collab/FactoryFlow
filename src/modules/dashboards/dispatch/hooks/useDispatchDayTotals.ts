import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/core/auth';
import {
  DISPATCH_FULFILMENT_QUERY_KEYS,
  dispatchFulfilmentApi,
} from '@/modules/dashboards/dispatch-fulfilment/api';
import type {
  CustomerRow,
  DispatchFulfilmentFilters,
  StatusRow,
} from '@/modules/dashboards/dispatch-fulfilment/types';

import { DISPATCH_DAY_REFRESH_MS } from '../constants/dispatch-day.constants';
import { useBoardDay } from './useBoardDay';

/** One day on the fortnight trend — one value per KPI tile above it. */
export interface TrendPoint {
  date: string;
  trucks: number;
  amount: number;
  boxes: number;
  litres: number;
  weightKg: number;
  /** null when the backend does not report a daily invoice count. Kept null
   *  rather than 0 so the chart can say "no history" instead of drawing a
   *  flat line along the floor and calling it data. */
  bills: number | null;
  isToday: boolean;
}

export interface DispatchDayTotals {
  /** Trucks (gate-outs) that cleared the gate today. */
  trucks: number;
  /** Distinct invoices those trucks carried. */
  bills: number;
  /** Σ SAP invoice DocTotal shipped today. */
  amount: number;
  boxes: number;
  weightKg: number;
  litres: number;

  /** Open pipeline — a live snapshot, NOT bound to today. */
  backlogCount: number;
  backlogAmount: number;
  backlogWeightKg: number;
  backlogByStatus: StatusRow[];

  /** Today's dispatch split by customer, biggest first. */
  byCustomer: CustomerRow[];

  /** Yesterday's like-for-like figures, for the comparison chips. */
  yesterdayTrucks: number;
  yesterdayAmount: number;
  /** Mean trucks/day over the completed days in the trend window. */
  avgTrucks: number;
  avgAmount: number;

  trend: TrendPoint[];
  /** How many companies the numbers span — this board is cross-company. */
  companyCount: number;
  companyCodes: string[];

  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  updatedAt: number;
  refetch: () => void;
}

/**
 * Same query as the Dispatch Fulfilment dashboard — same key, so the two share
 * one cache entry — but with a poll attached. The wall is left running
 * unattended, and the shared hook only sets a staleTime, which refreshes on
 * focus events that never come on a screen nobody touches.
 */
function useFulfilmentPolled(filters: DispatchFulfilmentFilters, enabled: boolean) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: DISPATCH_FULFILMENT_QUERY_KEYS.summary(filters, currentCompany?.company_id),
    queryFn: () => dispatchFulfilmentApi.getSummary(filters),
    refetchInterval: DISPATCH_DAY_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: DISPATCH_DAY_REFRESH_MS,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    enabled: enabled && !!filters.from && !!filters.to,
  });
}

/**
 * The day's money and volume, anchored on the ACTUAL gate-out date (which is
 * what the backend's summary is built on) rather than the scheduled plan date.
 * Two windows: today for the headline, a fortnight for the trend and the
 * yesterday/average baselines.
 */
export function useDispatchDayTotals(enabled = true): DispatchDayTotals {
  const day = useBoardDay();

  const todayQuery = useFulfilmentPolled({ from: day.today, to: day.today }, enabled);
  const trendQuery = useFulfilmentPolled({ from: day.trendFrom, to: day.today }, enabled);

  const data = todayQuery.data;
  const trendRows = trendQuery.data?.trend;

  const trendModel = useMemo(() => {
    const byDate = new Map((trendRows ?? []).map((row) => [row.date, row]));
    // One row carrying the field is enough: the backend either reports daily
    // invoice counts or it does not.
    const hasBills = (trendRows ?? []).some((row) => row.bills != null);

    // The API only returns days that had a dispatch, so walk the calendar and
    // fill the gaps — a missing bar has to read as a zero day, not as a gap.
    const points: TrendPoint[] = [];
    const cursor = new Date(`${day.trendFrom}T00:00:00`);
    const end = new Date(`${day.today}T00:00:00`);
    while (cursor <= end) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
        cursor.getDate(),
      ).padStart(2, '0')}`;
      const row = byDate.get(iso);
      points.push({
        date: iso,
        trucks: row?.trucks ?? 0,
        amount: row?.dispatched_amount ?? 0,
        boxes: row?.dispatched_boxes ?? 0,
        litres: row?.dispatched_litres ?? 0,
        weightKg: row?.dispatched_weight ?? 0,
        // A day the API skipped had no dispatch at all, so zero is right there;
        // a backend that never sends the field at all is the unknown case.
        bills: hasBills ? (row?.bills ?? 0) : null,
        isToday: iso === day.today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const yesterday = byDate.get(day.yesterday);
    // Averaged over completed days only: today is still running and would drag
    // the baseline down every morning.
    const completed = points.filter((point) => !point.isToday);
    const divisor = completed.length || 1;

    return {
      trend: points,
      yesterdayTrucks: yesterday?.trucks ?? 0,
      yesterdayAmount: yesterday?.dispatched_amount ?? 0,
      avgTrucks: completed.reduce((sum, point) => sum + point.trucks, 0) / divisor,
      avgAmount: completed.reduce((sum, point) => sum + point.amount, 0) / divisor,
    };
  }, [trendRows, day.trendFrom, day.today, day.yesterday]);

  return {
    trucks: data?.totals.dispatched.count ?? 0,
    bills: data?.totals.dispatched.bills ?? 0,
    amount: data?.totals.dispatched.amount ?? 0,
    boxes: data?.totals.dispatched.boxes ?? 0,
    weightKg: data?.totals.dispatched.weight ?? 0,
    litres: data?.totals.dispatched.litres ?? 0,

    backlogCount: data?.totals.backlog.count ?? 0,
    backlogAmount: data?.totals.backlog.amount ?? 0,
    backlogWeightKg: data?.totals.backlog.weight ?? 0,
    backlogByStatus: data?.by_status ?? [],

    byCustomer: data?.by_customer ?? [],

    ...trendModel,

    companyCount: data?.filters.company_count ?? 0,
    companyCodes: data?.filters.company_codes ?? [],

    // A disabled query sits in `pending` forever; that is not "loading".
    isLoading: enabled && todayQuery.isLoading,
    isFetching: todayQuery.isFetching || trendQuery.isFetching,
    isError: todayQuery.isError,
    error: todayQuery.error,
    updatedAt: todayQuery.dataUpdatedAt,
    refetch: () => {
      void todayQuery.refetch();
      void trendQuery.refetch();
    },
  };
}
