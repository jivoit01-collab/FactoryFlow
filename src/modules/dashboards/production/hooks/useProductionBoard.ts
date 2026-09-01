import { useQueries } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  EXECUTION_QUERY_KEYS,
  executionApi,
  useCostAnalysisReport,
  useRuns,
} from '@/modules/production/execution/api';
import type { ProductionRun } from '@/modules/production/execution/types';

import type { MaterialReport, MaterialRow, ReconReport, ReconRow } from '../api/reconciliation.api';
import {
  useMaterialReconciliation,
  useProductionReconciliation,
  useWastageReconciliation,
} from '../api/reconciliation.queries';
import {
  PRODUCTION_TREND_DAYS,
  PRODUCTION_WALL_REFRESH_MS,
  type RunTone,
  runTone,
} from '../constants/production-wall.constants';
import type { ProductionDay } from './useProductionDay';

// -------------------------------------------------------------------------- //
// Shapes the panels read
// -------------------------------------------------------------------------- //

export interface ProductionRunRow {
  id: number;
  runNumber: number;
  line: string;
  product: string;
  itemCode: string;
  /**
   * Cases on the board: live segment output while the run is open, the run's
   * own closing figure once it is done. A running line whose segments have not
   * been closed yet reports `total_production` = 0, and a wall that showed that
   * as "0 cases" for six hours would read as a dead line.
   */
  cases: number;
  tone: RunTone;
}

export interface ReconLitres {
  /** Litres per row, in row order. Null where SAP holds no volume for the SKU. */
  perRow: (number | null)[];
  app: number;
  sap: number;
  /** SKUs with no volume in the item master — excluded from the totals above. */
  unknown: number;
}

export interface ReconSlice {
  rows: ReconRow[];
  /** App-side quantity, from completed runs. */
  produced: number;
  /** Live output on runs still open — not yet part of `produced`. */
  inProgress: number;
  sap: number;
  difference: number;
  differencePct: number;
  status: string;
  litres: ReconLitres;
  isLoading: boolean;
  isError: boolean;
}

export interface MaterialSlice {
  rows: MaterialRow[];
  should: number;
  app: number;
  sap: number;
  differencePct: number;
  status: string;
  isLoading: boolean;
  isError: boolean;
}

export interface CostCategoryRow {
  label: string;
  amount: number;
  credit: boolean;
  /** Share of the day's gross cost. */
  pct: number;
}

export interface CostSlice {
  total: number;
  net: number;
  wasteRecovery: number;
  perCase: number;
  runCount: number;
  categories: CostCategoryRow[];
  isLoading: boolean;
  isError: boolean;
}

export interface ProductionTrendPoint {
  date: string;
  /** Cases produced that day, from the runs themselves — never from SAP. */
  cases: number;
  /** Cost of the runs that have been costed that day; 0 where none were. */
  cost: number;
  perCase: number;
  /** True on the day the board is showing. */
  isToday: boolean;
  /** The day has runs but no cost row — the cost series has a hole, not a zero. */
  costMissing: boolean;
}

export interface ProductionBoard {
  runs: ProductionRunRow[];
  /** Cases produced on the shown day, live segments included. */
  cases: number;
  /** Of which is still being produced right now. */
  liveCases: number;
  runningLines: number;
  fg: ReconSlice;
  waste: ReconSlice;
  material: MaterialSlice;
  cost: CostSlice;
  trend: ProductionTrendPoint[];
  runsLoading: boolean;
  isFetching: boolean;
  /** Epoch ms of the most recent successful pull, across every source. */
  updatedAt: number;
  refetch: () => void;
}

// -------------------------------------------------------------------------- //
// Derivation
// -------------------------------------------------------------------------- //

const norm = (value: number | null | undefined) => Number(value) || 0;

/**
 * A reconciliation report reduced to what a panel draws, with the summary
 * recomputed over the rows that survive the filter.
 *
 * The backend's own summary covers every row it found, including SKUs the app
 * never touched. On a wall the filtered rows and the headline figure above them
 * have to be the same set of numbers, or the tile and the list disagree in
 * front of the whole room.
 */
function reconSlice(
  report: ReconReport | undefined,
  keep: (row: ReconRow) => boolean,
  query: { isLoading: boolean; isError: boolean },
): ReconSlice {
  const rows = (report?.by_sku ?? []).filter(keep);

  let produced = 0;
  let inProgress = 0;
  let sap = 0;
  const perRow: (number | null)[] = [];
  let litresApp = 0;
  let litresSap = 0;
  let unknown = 0;

  for (const row of rows) {
    produced += norm(row.app_qty);
    inProgress += norm(row.in_progress);
    sap += norm(row.sap_qty);

    const perCase = row.litres_per_case ?? null;
    perRow.push(perCase);
    if (perCase == null) {
      unknown += 1;
    } else {
      litresApp += perCase * norm(row.app_qty);
      litresSap += perCase * norm(row.sap_qty);
    }
  }

  const difference = produced - sap;
  const denom = Math.max(Math.abs(produced), Math.abs(sap), 1);
  const differencePct = Number(((difference / denom) * 100).toFixed(2));

  let status = 'MATCHED';
  if (produced > 0 && sap === 0) status = 'PENDING_SYNC';
  else if (!(produced === 0 && sap === 0) && Math.abs(differencePct) > 1) status = 'MISMATCH';

  return {
    rows,
    produced,
    inProgress,
    sap,
    difference,
    differencePct,
    status,
    litres: { perRow, app: litresApp, sap: litresSap, unknown },
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

function materialSlice(
  report: MaterialReport | undefined,
  query: { isLoading: boolean; isError: boolean },
): MaterialSlice {
  // An all-zero component is a BOM line nothing happened on; on a wall it is
  // just a row of dashes taking a slot from one that says something.
  const rows = (report?.by_sku ?? []).filter(
    (row) => row.should_use !== 0 || row.app_issued !== 0 || row.sap_issued !== 0,
  );

  let should = 0;
  let app = 0;
  let sap = 0;
  for (const row of rows) {
    should += norm(row.should_use);
    app += norm(row.app_issued);
    sap += norm(row.sap_issued);
  }

  const denom = Math.max(Math.abs(app), Math.abs(sap), 1);
  const differencePct = Number((((app - sap) / denom) * 100).toFixed(2));

  let status = 'MATCHED';
  if (app > 0 && sap === 0) status = 'PENDING_SYNC';
  else if (!(app === 0 && sap === 0) && Math.abs(differencePct) > 1) status = 'MISMATCH';

  return {
    rows,
    should,
    app,
    sap,
    differencePct,
    status,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** Every day in the window, oldest first — including the ones nothing ran on. */
function windowDays(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end && days.length < PRODUCTION_TREND_DAYS) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Everything the production wall draws, from one day and one optional line.
 *
 * Five sources, and the split between them is the thing to keep straight:
 *   - the runs themselves (app only) carry output and line state, and keep
 *     working when SAP is down — so the headline case count comes from here;
 *   - the three reconciliations go out to SAP and each own one panel, so a SAP
 *     outage empties those panels rather than the board;
 *   - the cost report is app-side again, but only covers runs that have been
 *     costed, which is why the trend draws cases and cost from different
 *     sources and says so.
 */
export function useProductionBoard(day: ProductionDay, line: number | undefined): ProductionBoard {
  const reconParams = { date_from: day.date, date_to: day.date, line };

  // One list for the whole fortnight: the shown day's rows are a filter on it,
  // so the panel and the trend can never disagree about what was produced.
  const windowRuns = useRuns({ date_from: day.trendFrom, date_to: day.date, line_id: line });
  const costDay = useCostAnalysisReport(reconParams);
  const costWindow = useCostAnalysisReport({
    date_from: day.trendFrom,
    date_to: day.date,
    line,
  });
  const fgQuery = useProductionReconciliation(reconParams);
  const materialQuery = useMaterialReconciliation(reconParams);
  const wasteQuery = useWastageReconciliation(reconParams);

  const allRuns: ProductionRun[] = windowRuns.data ?? [];
  const dayRuns = allRuns
    .filter((run) => run.date === day.date)
    .sort((a, b) => (b.run_number ?? 0) - (a.run_number ?? 0));

  // Segment output for the shown day's runs. Only the open ones actually need
  // it, but a completed run's detail is cached and cheap, and asking for the
  // whole day keeps the hook order stable as runs finish.
  const detailQueries = useQueries({
    queries: dayRuns.map((run) => ({
      queryKey: EXECUTION_QUERY_KEYS.runDetail(run.id),
      queryFn: () => executionApi.getRunDetail(run.id),
      staleTime: PRODUCTION_WALL_REFRESH_MS,
    })),
  });

  const runs: ProductionRunRow[] = dayRuns.map((run, index) => {
    const segments = detailQueries[index]?.data?.segments ?? [];
    const segmentTotal = segments.reduce((sum, seg) => sum + norm(Number(seg.produced_cases)), 0);
    return {
      id: run.id,
      runNumber: run.run_number,
      line: run.line_name || `Line ${run.line}`,
      product: run.product || '—',
      itemCode: run.item_code,
      cases: segmentTotal > 0 ? segmentTotal : norm(Number(run.total_production)),
      tone: runTone(run.live_status, run.status),
    };
  });

  const cases = runs.reduce((sum, row) => sum + row.cases, 0);
  const liveRuns = runs.filter((row) => row.tone.isLive);
  const liveCases = liveRuns.reduce((sum, row) => sum + row.cases, 0);

  // FG: only the SKUs the app actually produced. A SAP-only row is a receipt
  // this plant did not make today and belongs to the SAP report, not the wall.
  const fg = reconSlice(
    fgQuery.data,
    (row) => norm(row.app_qty) > 0 || norm(row.in_progress) > 0,
    fgQuery,
  );
  const waste = reconSlice(
    wasteQuery.data,
    (row) => norm(row.app_qty) !== 0 || norm(row.sap_qty) !== 0,
    wasteQuery,
  );
  const material = materialSlice(materialQuery.data, materialQuery);

  const costSummary = costDay.data?.summary;
  const gross = norm(costSummary?.total_cost);
  const categories: CostCategoryRow[] = (costDay.data?.category_breakdown ?? [])
    .filter((row) => row.amount > 0)
    .map((row) => ({
      label: row.label,
      amount: row.amount,
      credit: row.is_credit,
      pct: gross ? (row.amount / gross) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const cost: CostSlice = {
    total: gross,
    net: norm(costSummary?.total_net_cost ?? costSummary?.total_cost),
    wasteRecovery: norm(costSummary?.total_waste_recovery),
    perCase: norm(costSummary?.avg_per_unit),
    runCount: norm(costSummary?.run_count),
    categories,
    isLoading: costDay.isLoading,
    isError: costDay.isError,
  };

  // Cases per day from the runs; cost per day from the cost report. A day that
  // ran but was never costed keeps its bar and loses its cost line — drawing a
  // ₹0 there would read as a free day of production.
  const casesByDate = new Map<string, number>();
  for (const run of allRuns) {
    casesByDate.set(
      run.date,
      (casesByDate.get(run.date) ?? 0) + norm(Number(run.total_production)),
    );
  }
  const costByDate = new Map(costWindow.data?.trend.map((point) => [point.date, point]) ?? []);

  const trend: ProductionTrendPoint[] = windowDays(day.trendFrom, day.date).map((date) => {
    const isToday = date === day.date;
    // The shown day is the only one whose runs may still be open, so it is the
    // only one where the closing figures are not yet the truth.
    const dayCases = isToday ? cases : (casesByDate.get(date) ?? 0);
    const costPoint = costByDate.get(date);
    return {
      date,
      cases: dayCases,
      cost: norm(costPoint?.total_cost),
      perCase: norm(costPoint?.per_unit_cost),
      isToday,
      costMissing: !costPoint && dayCases > 0,
    };
  });

  const updatedAt = Math.max(
    windowRuns.dataUpdatedAt,
    costDay.dataUpdatedAt,
    costWindow.dataUpdatedAt,
    fgQuery.dataUpdatedAt,
    materialQuery.dataUpdatedAt,
    wasteQuery.dataUpdatedAt,
  );

  const isFetching =
    windowRuns.isFetching ||
    costDay.isFetching ||
    costWindow.isFetching ||
    fgQuery.isFetching ||
    materialQuery.isFetching ||
    wasteQuery.isFetching ||
    detailQueries.some((query) => query.isFetching);

  const refetch = () => {
    void windowRuns.refetch();
    void costDay.refetch();
    void costWindow.refetch();
    void fgQuery.refetch();
    void materialQuery.refetch();
    void wasteQuery.refetch();
    detailQueries.forEach((query) => void query.refetch());
  };

  // The board polls itself; nobody is standing at a wall to press refresh.
  // Only the app-side queries are driven from here — the three reconciliations
  // carry their own interval, and refetching those as well would double the
  // load this screen puts on SAP.
  const poll = () => {
    void windowRuns.refetch();
    void costDay.refetch();
    void costWindow.refetch();
    detailQueries.forEach((query) => void query.refetch());
  };
  // Held in a ref so the interval below is installed once and still calls the
  // current day's queries — re-installing it on every render would reset the
  // countdown continuously and the board would never actually poll.
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  });
  useEffect(() => {
    const id = window.setInterval(() => pollRef.current(), PRODUCTION_WALL_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return {
    runs,
    cases,
    liveCases,
    runningLines: liveRuns.length,
    fg,
    waste,
    material,
    cost,
    trend,
    runsLoading: windowRuns.isLoading,
    isFetching,
    updatedAt,
    refetch,
  };
}
