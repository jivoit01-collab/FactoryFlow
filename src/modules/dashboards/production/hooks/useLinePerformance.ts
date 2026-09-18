/**
 * Every line, side by side, on one day.
 *
 * The day wall answers "what did the plant make"; this answers "which line is
 * carrying it and which one is losing it" — the same figures, cut per line
 * instead of per plant. Five lines carrying runs on the day give five tiles:
 * the board's shape is the day's own.
 *
 * Three sources, all app-side. There is deliberately no SAP reconciliation
 * here: a Service Layer outage must not empty a board whose whole subject is
 * how the lines are running, and the runs themselves answer that.
 *
 *   - the day's runs, and each run's detail for its segments and stoppages;
 *   - each run's cost rollup, so a tile can price what it made;
 *   - the line/SKU configuration master, which supplies a rated speed and a
 *     pack size for a run opened without one.
 *
 * The line master is deliberately NOT read: the board's tiles are the lines
 * that ran, and the runs themselves name them. Every query here shares its key
 * with the day wall's, so moving between the two boards re-reads nothing that
 * is still fresh. The folding itself lives in `buildLineTiles`, which is pure
 * and tested on its own.
 */

import { useQueries } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  EXECUTION_QUERY_KEYS,
  executionApi,
  useAllLineConfigs,
  useRuns,
} from '@/modules/production/execution/api';
import type { ProductionRun } from '@/modules/production/execution/types';

import { useNow } from '../../dispatch/hooks';
import { PRODUCTION_WALL_REFRESH_MS } from '../constants/production-wall.constants';
import { configForRun, indexLineConfigs, standardOf } from '../utils/lineStandards';
import { buildLineTiles, type LineTileBoard } from '../utils/lineTiles';
import { buildTrend, type TrendPoint } from '../utils/trend';
import { type ProductionRunRow, toRunRow } from './runRow';
import type { ProductionDay } from './useProductionDay';

export interface LinePerformance extends LineTileBoard {
  /** The fortnight ending on the shown day, in cases and in litres. */
  trend: TrendPoint[];
  litreTrend: TrendPoint[];
  isLoading: boolean;
  isFetching: boolean;
  updatedAt: number;
  refetch: () => void;
}

export function useLinePerformance(day: ProductionDay): LinePerformance {
  // One clock for every line, ticking at the board's own refresh cadence: two
  // lines read a second apart would report running times that do not add up to
  // the same shift, and an open segment measured against a frozen clock would
  // stop ageing.
  const clock = useNow(PRODUCTION_WALL_REFRESH_MS);
  const now = clock.getTime();

  const configsQuery = useAllLineConfigs();
  const runsQuery = useRuns({ date_from: day.date, date_to: day.date });
  // The fortnight behind it — the list alone, with no per-run detail or
  // cost, so a strip of fourteen bars costs one request rather than fifty.
  const windowQuery = useRuns({ date_from: day.trendFrom, date_to: day.date });

  const dayRuns: ProductionRun[] = [...(runsQuery.data ?? [])].sort(
    (a, b) => (b.run_number ?? 0) - (a.run_number ?? 0),
  );

  // Segments and stoppages per run. Only the open ones strictly need it, but a
  // finished run's detail is cached and cheap, and asking for the whole day
  // keeps the hook order stable as runs close.
  const detailQueries = useQueries({
    queries: dayRuns.map((run) => ({
      queryKey: EXECUTION_QUERY_KEYS.runDetail(run.id),
      queryFn: () => executionApi.getRunDetail(run.id),
      staleTime: PRODUCTION_WALL_REFRESH_MS,
    })),
  });

  // A 404 here means "not costed yet", not a fault, so it is never retried.
  const costQueries = useQueries({
    queries: dayRuns.map((run) => ({
      queryKey: EXECUTION_QUERY_KEYS.runCost(run.id),
      queryFn: () => executionApi.getRunCost(run.id),
      staleTime: PRODUCTION_WALL_REFRESH_MS,
      retry: false,
    })),
  });

  const configs = indexLineConfigs(configsQuery.data ?? []);

  const rows: ProductionRunRow[] = dayRuns.map((run, index) =>
    toRunRow({
      run,
      detail: detailQueries[index]?.data,
      cost: costQueries[index]?.data,
      now,
      standard: standardOf(configForRun(configs, run.line, run.item_code)),
      detailLoading: detailQueries[index]?.isLoading ?? false,
    }),
  );

  const board = buildLineTiles({ rows, configs, now });

  // A closed run states its output on its own record; the shown day comes from
  // the board instead, so the last bar and the tiles under it always agree.
  const windowRuns = windowQuery.data ?? [];
  const trend = buildTrend({
    rows: windowRuns,
    from: day.trendFrom,
    to: day.date,
    valueOf: (run) => Number(run.total_production) || 0,
    shownValue: board.cases,
  });
  const litreTrend = buildTrend({
    rows: windowRuns,
    from: day.trendFrom,
    to: day.date,
    valueOf: (run) => {
      const perCase = (run.pieces_per_case ?? 0) * (Number(run.litres_per_piece) || 0);
      return perCase > 0 ? (Number(run.total_production) || 0) * perCase : 0;
    },
    shownValue: board.litres ?? 0,
  });

  const refetch = () => {
    void runsQuery.refetch();
    void windowQuery.refetch();
    void configsQuery.refetch();
    detailQueries.forEach((query) => void query.refetch());
    costQueries.forEach((query) => void query.refetch());
  };

  // The board polls itself; nobody is standing at a wall to press refresh.
  // Held in a ref so the interval below is installed once and still calls the
  // current day's queries — re-installing it on every render would reset the
  // countdown continuously and the board would never actually poll.
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
    litreTrend,
    isLoading: runsQuery.isLoading,
    isFetching:
      runsQuery.isFetching ||
      configsQuery.isFetching ||
      detailQueries.some((query) => query.isFetching) ||
      costQueries.some((query) => query.isFetching),
    updatedAt: runsQuery.dataUpdatedAt,
    refetch,
  };
}
