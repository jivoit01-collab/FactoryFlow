/**
 * Every blowing machine that ran, on one day.
 *
 * The filling-line half of this board reads `production_execution`; this reads
 * `blowing`, which is a separate app with its own runs, segments, breakdowns
 * and cost rows. Nothing is shared but the shape, so the two halves fail
 * independently — a blowing outage leaves the lines readable and the reverse.
 *
 * The preform specs come along because that is where blowing's configuration
 * lives: target rejection %, target conversion cost per bottle and target
 * electricity units per bottle. They are master data, cached for five minutes.
 */

import { useQueries } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { BLOWING_QUERY_KEYS, blowingApi, usePreformSpecs, useRuns } from '@/modules/production/blowing/api';
import type { PreformSpec } from '@/modules/production/blowing/types';

import { useNow } from '../../dispatch/hooks';
import { PRODUCTION_WALL_REFRESH_MS } from '../constants/production-wall.constants';
import { type BlowingBoard, buildBlowingTiles, toBlowingRow } from '../utils/blowingTiles';
import { buildTrend, type TrendPoint } from '../utils/trend';
import type { ProductionDay } from './useProductionDay';

export interface BlowingPerformance extends BlowingBoard {
  /** The fortnight ending on the shown day, in bottles off the counter. */
  trend: TrendPoint[];
  isLoading: boolean;
  isFetching: boolean;
  updatedAt: number;
  refetch: () => void;
}

export function useBlowingPerformance(day: ProductionDay): BlowingPerformance {
  const clock = useNow(PRODUCTION_WALL_REFRESH_MS);
  const now = clock.getTime();

  const runsQuery = useRuns({ date_from: day.date, date_to: day.date });
  // The fortnight behind it — the list alone, no detail and no cost.
  const windowQuery = useRuns({ date_from: day.trendFrom, date_to: day.date });
  const specsQuery = usePreformSpecs(true);

  const dayRuns = [...(runsQuery.data ?? [])].sort(
    (a, b) => (b.run_number ?? 0) - (a.run_number ?? 0),
  );

  // The list endpoint carries no segments, so the detail is what makes a live
  // machine's running time move at all.
  const detailQueries = useQueries({
    queries: dayRuns.map((run) => ({
      queryKey: BLOWING_QUERY_KEYS.runDetail(run.id),
      queryFn: () => blowingApi.getRun(run.id),
      staleTime: PRODUCTION_WALL_REFRESH_MS,
    })),
  });

  // A run that has not been costed yet 404s here, which is a state and not a
  // fault — the same rule the filling lines follow.
  const costQueries = useQueries({
    queries: dayRuns.map((run) => ({
      queryKey: BLOWING_QUERY_KEYS.runCost(run.id),
      queryFn: () => blowingApi.getRunCost(run.id),
      staleTime: PRODUCTION_WALL_REFRESH_MS,
      retry: false,
    })),
  });

  const specs = new Map<number, PreformSpec>(
    (specsQuery.data ?? []).map((spec) => [spec.id, spec]),
  );

  const rows = dayRuns.map((run, index) =>
    toBlowingRow({
      run,
      detail: detailQueries[index]?.data,
      cost: costQueries[index]?.data,
      now,
      detailLoading: detailQueries[index]?.isLoading ?? false,
    }),
  );

  const board = buildBlowingTiles({ rows, specs, now });

  const trend = buildTrend({
    rows: windowQuery.data ?? [],
    from: day.trendFrom,
    to: day.date,
    valueOf: (run) => Number(run.total_counter_production) || 0,
    shownValue: board.bottles,
  });

  const refetch = () => {
    void runsQuery.refetch();
    void windowQuery.refetch();
    void specsQuery.refetch();
    detailQueries.forEach((query) => void query.refetch());
    costQueries.forEach((query) => void query.refetch());
  };

  // Held in a ref so the interval is installed once and still calls the current
  // day's queries — see the filling-line hook for why.
  const pollRef = useRef(refetch);
  useEffect(() => {
    pollRef.current = refetch;
  });
  useEffect(() => {
    const id = window.setInterval(() => pollRef.current(), PRODUCTION_WALL_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return {
    ...board,
    trend,
    isLoading: runsQuery.isLoading,
    isFetching:
      runsQuery.isFetching ||
      specsQuery.isFetching ||
      detailQueries.some((query) => query.isFetching) ||
      costQueries.some((query) => query.isFetching),
    updatedAt: runsQuery.dataUpdatedAt,
    refetch,
  };
}
