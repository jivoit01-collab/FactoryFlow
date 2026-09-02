import { useQueries } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { usePermission } from '@/core/auth';
import { type CostRate as CentralCostRate,useCostMasterRates } from '@/modules/admin/api';
import {
  EXECUTION_QUERY_KEYS,
  executionApi,
  useCostAnalysisReport,
  useRuns,
} from '@/modules/production/execution/api';
import type { ProductionRun, ProductionRunCost } from '@/modules/production/execution/types';

import type { MaterialReport, MaterialRow, ReconReport, ReconRow } from '../api/reconciliation.api';
import {
  useMaterialReconciliation,
  useProductionReconciliation,
  useWastageReconciliation,
} from '../api/reconciliation.queries';
import {
  MATERIAL_COST_CATEGORY,
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

/**
 * A cost head the day *will* be priced under, whether or not it has produced a
 * rupee yet — one row of the Cost Master, plus the BOM material line that has
 * no rate behind it.
 */
export interface CostHeadRow {
  /** The backend category code. */
  key: string;
  label: string;
  /** "₹1,200 · Per Person per Day", or "varies by line" where the overrides
   *  disagree and no single figure is honest. */
  rate: string;
  credit: boolean;
  /** Priced off the run's BOM snapshot rather than a Cost Master rate. */
  fromBom: boolean;
}

export interface CostCategoryRow {
  /** The backend's category code — what the RM/PM switch is matched on. */
  key: string;
  label: string;
  amount: number;
  credit: boolean;
  /** Share of the day's gross cost. */
  pct: number;
}

export interface CostSlice {
  /** Gross cost on the basis the board is showing — RM/PM in or out. */
  total: number;
  /** The same, after the waste-recovery credit. */
  net: number;
  wasteRecovery: number;
  /** Zero when no cases have been closed yet — there is no rate to state, and
   *  the UI must show a dash rather than ₹0. */
  perCase: number;
  /** Cases behind `perCase`. Runs still open have produced nothing closed. */
  costedCases: number;
  runCount: number;
  categories: CostCategoryRow[];
  /**
   * Every head the day would be costed under. Drawn when nothing has been
   * costed yet, so an empty panel still answers "what do we charge a run for".
   */
  heads: CostHeadRow[];
  /** Bought-in material for the day, whether or not it is being counted. */
  material: number;
  /** False while the figures above are conversion cost only. */
  includesMaterial: boolean;
  isLoading: boolean;
  isError: boolean;
}

export interface ProductionTrendPoint {
  date: string;
  /** Cases produced that day, from the runs themselves — never from SAP. */
  cases: number;
  /** Net cost of the runs costed that day, on the shown basis; 0 where none
   *  were costed. */
  cost: number;
  perCase: number;
  /** Bought-in material that day, whether or not `cost` counts it. */
  material: number;
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

/** A 404 from the per-run cost endpoint means "not costed yet", not a fault. */
function isMissing(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 404;
}

/**
 * The day's cost, folded from each run's own rollup.
 *
 * Deliberately NOT the cost-analysis report, which counts COMPLETED runs only
 * (`_base_runs_qs` defaults to `status='COMPLETED'`). On a wall that made the
 * whole cost half of the board read empty for the entire shift and then fill in
 * after the last run closed — the panel looked broken while the plant was
 * spending money. Each run's rollup is costed the moment its resources are
 * entered, whatever state the run is in, which is what a live board needs.
 */
function foldRunCosts(
  rollups: (ProductionRunCost | undefined)[],
  includeMaterial: boolean,
): {
  gross: number;
  net: number;
  material: number;
  wasteRecovery: number;
  cases: number;
  runCount: number;
  categories: Omit<CostCategoryRow, 'pct'>[];
} {
  let grossAll = 0;
  let netAll = 0;
  let material = 0;
  let wasteRecovery = 0;
  let cases = 0;
  let runCount = 0;
  const byCategory = new Map<string, Omit<CostCategoryRow, 'pct'>>();

  for (const rollup of rollups) {
    if (!rollup) continue;
    runCount += 1;
    grossAll += norm(Number(rollup.total_cost));
    netAll += norm(Number(rollup.net_cost));
    material += norm(Number(rollup.raw_material_cost));
    wasteRecovery += norm(Number(rollup.waste_recovery_credit));
    cases += norm(Number(rollup.produced_qty));

    for (const costLine of rollup.lines ?? []) {
      if (!includeMaterial && costLine.category === MATERIAL_COST_CATEGORY) continue;
      const amount = norm(Number(costLine.amount));
      if (amount <= 0) continue;
      const existing = byCategory.get(costLine.category);
      if (existing) existing.amount += amount;
      else
        byCategory.set(costLine.category, {
          key: costLine.category,
          label: costLine.category_display || costLine.category,
          amount,
          credit: costLine.is_credit,
        });
    }
  }

  return {
    gross: includeMaterial ? grossAll : grossAll - material,
    net: includeMaterial ? netAll : netAll - material,
    material,
    wasteRecovery,
    cases,
    runCount,
    categories: [...byCategory.values()].sort((a, b) => b.amount - a.amount),
  };
}

/**
 * The cost heads a run is priced under, from the Cost Master rows.
 *
 * Resolved the way the costing engine resolves them: one rate per category,
 * with a per-line override beating the company default. Listing the rows raw
 * would show a category twice and imply the run is charged twice for it.
 *
 * On "All lines" a category that exists only as per-line overrides has no one
 * true figure, and says "varies by line" rather than picking a line's rate and
 * presenting it as the plant's.
 *
 * MATERIAL is appended by hand because it is the one head with no rate behind
 * it: the engine prices it off the run's own BOM snapshot at last purchase
 * price, so it never appears in the Cost Master however well that is filled in.
 */
// The board's own view of a Cost Master row: the central store keys line
// overrides as VALUE rates "line:<name>", so the override match is by name.
interface BoardRate {
  category: string;
  category_display: string;
  rate: string;
  basis: string;
  basis_display: string;
  is_credit: boolean;
  lineName: string | null;
}

// Central cost-type code → the engine category the run cost lines carry
// (mirrors production_execution's COST_TYPE_CODES map, reversed).
const CENTRAL_CODE_TO_CATEGORY: Record<string, string> = {
  'prod-material': 'MATERIAL',
  'prod-electricity-variable': 'ELECTRICITY_VARIABLE',
  'prod-electricity-fixed': 'ELECTRICITY_FIXED',
  'prod-labour': 'LABOUR',
  'prod-salary': 'MANPOWER_SALARIED',
  'prod-lubrication': 'LUBRICATION',
  'prod-lab-chemicals': 'LAB_CHEMICALS',
  'prod-batch-coding': 'BATCH_CODING',
  'prod-maintenance': 'MAINTENANCE',
  'prod-water': 'WATER',
  'prod-overhead': 'OVERHEAD',
  'prod-waste-recovery': 'WASTE_RECOVERY',
  'prod-other': 'OTHER',
};

const LINE_KEY_PREFIX = 'line:';

const SCOPE_RANK: Record<CentralCostRate['scope'], number> = {
  VALUE: 3,
  DEPARTMENT: 2,
  COMPANY: 1,
  FACTORY: 0,
};

/**
 * Central Cost Master rows → board rates. Only production codes matter here;
 * where a category has both a factory-wide and a company row, the company row
 * is the one the engine would charge, so the factory one is dropped.
 */
function toBoardRates(rows: CentralCostRate[]): BoardRate[] {
  const bySlot = new Map<string, CentralCostRate>();
  for (const row of rows) {
    const category = CENTRAL_CODE_TO_CATEGORY[row.cost_type_code];
    if (!category) continue;
    const lineName = row.value_key.startsWith(LINE_KEY_PREFIX)
      ? row.value_key.slice(LINE_KEY_PREFIX.length)
      : '';
    const slot = `${category}|${lineName}`;
    const current = bySlot.get(slot);
    if (!current || SCOPE_RANK[row.scope] > SCOPE_RANK[current.scope]) {
      bySlot.set(slot, row);
    }
  }
  return [...bySlot.values()].map((row) => ({
    category: CENTRAL_CODE_TO_CATEGORY[row.cost_type_code],
    category_display: row.cost_type_name,
    rate: row.rate,
    basis: row.basis,
    basis_display: row.basis_display,
    is_credit: row.is_credit,
    lineName: row.value_key.startsWith(LINE_KEY_PREFIX)
      ? row.value_key.slice(LINE_KEY_PREFIX.length)
      : null,
  }));
}

function costHeads(
  rates: BoardRate[],
  includeMaterial: boolean,
  lineName: string | undefined,
): CostHeadRow[] {
  const byCategory = new Map<string, BoardRate[]>();
  for (const rate of rates) {
    // With a line picked, another line's override says nothing about this run.
    if (lineName != null && rate.lineName != null && rate.lineName !== lineName) continue;
    const rows = byCategory.get(rate.category);
    if (rows) rows.push(rate);
    else byCategory.set(rate.category, [rate]);
  }

  const describe = (row: BoardRate) =>
    `₹${Number(row.rate).toLocaleString('en-IN')} · ${row.basis_display || row.basis}`;

  const heads: CostHeadRow[] = [];
  for (const [category, rows] of byCategory) {
    if (!includeMaterial && category === MATERIAL_COST_CATEGORY) continue;

    const override =
      lineName == null ? undefined : rows.find((row) => row.lineName === lineName);
    const global = rows.find((row) => row.lineName == null);
    const chosen = override ?? global;
    const shapes = new Set(rows.map((row) => `${Number(row.rate)}|${row.basis}`));

    heads.push({
      key: category,
      label: (chosen ?? rows[0]).category_display || category,
      rate: chosen
        ? describe(chosen)
        : shapes.size > 1
          ? `varies by line · ${rows.length} rates`
          : describe(rows[0]),
      credit: (chosen ?? rows[0]).is_credit,
      fromBom: false,
    });
  }

  if (includeMaterial && !byCategory.has(MATERIAL_COST_CATEGORY)) {
    heads.push({
      key: MATERIAL_COST_CATEGORY,
      label: 'Material',
      rate: "BOM snapshot · the run's own last purchase price",
      credit: false,
      fromBom: true,
    });
  }

  // Credits last — they read as a discount on everything above them.
  return heads.sort(
    (a, b) => Number(a.credit) - Number(b.credit) || a.label.localeCompare(b.label),
  );
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
 *
 * `includeMaterial` switches every cost figure between the full cost and the
 * conversion cost — the same day, read two ways. It is one flag rather than a
 * second set of fields because a board showing both at once would invite
 * somebody to read a conversion cost as a full one.
 */
export function useProductionBoard(
  day: ProductionDay,
  line: number | undefined,
  includeMaterial: boolean,
): ProductionBoard {
  const reconParams = { date_from: day.date, date_to: day.date, line };

  // One list for the whole fortnight: the shown day's rows are a filter on it,
  // so the panel and the trend can never disagree about what was produced.
  const windowRuns = useRuns({ date_from: day.trendFrom, date_to: day.date, line_id: line });
  const costWindow = useCostAnalysisReport({
    date_from: day.trendFrom,
    date_to: day.date,
    line,
  });
  // Master data, not day data: what the plant charges a run for. Read even on a
  // day with cost, so the panel can name the heads the moment there is none.
  // Rates live in the central Cost Master: the current company's rows (which
  // include its line overrides) plus the factory-wide defaults.
  const { currentCompany } = usePermission();
  const companyRateRows = useCostMasterRates(
    currentCompany ? { company_id: currentCompany.company_id } : { scope: 'FACTORY' },
  );
  const factoryRateRows = useCostMasterRates({ scope: 'FACTORY' });
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

  // Each run's own cost rollup. The day report cannot serve this — it counts
  // completed runs only — and a 404 here simply means the run has not been
  // costed yet, so it is never retried into an error.
  const costQueries = useQueries({
    queries: dayRuns.map((run) => ({
      queryKey: EXECUTION_QUERY_KEYS.runCost(run.id),
      queryFn: () => executionApi.getRunCost(run.id),
      staleTime: PRODUCTION_WALL_REFRESH_MS,
      retry: false,
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

  const dayCost = foldRunCosts(
    costQueries.map((query) => query.data),
    includeMaterial,
  );

  const categories: CostCategoryRow[] = dayCost.categories.map((row) => ({
    ...row,
    // Against the total actually on show, so the shares still add to 100 once
    // the material line is taken out.
    pct: dayCost.gross ? (row.amount / dayCost.gross) * 100 : 0,
  }));

  const cost: CostSlice = {
    total: dayCost.gross,
    net: dayCost.net,
    wasteRecovery: dayCost.wasteRecovery,
    // A run that has produced nothing closed has no per-case rate. Dividing by
    // the day's live output instead would price cases the cost does not cover.
    perCase: dayCost.cases > 0 ? dayCost.net / dayCost.cases : 0,
    costedCases: dayCost.cases,
    runCount: dayCost.runCount,
    categories,
    heads: costHeads(
      toBoardRates([...(companyRateRows.data ?? []), ...(factoryRateRows.data ?? [])]),
      includeMaterial,
      // The central store keys line overrides by name; the board only holds the
      // id, so the name comes from the window's runs on that line.
      line != null ? allRuns.find((run) => run.line === line)?.line_name : undefined,
    ),
    material: dayCost.material,
    includesMaterial: includeMaterial,
    isLoading: costQueries.some((query) => query.isLoading),
    // A missing cost row is a state, not a failure; anything else is a fault
    // worth admitting on the panel.
    isError: costQueries.some((query) => query.isError && !isMissing(query.error)),
  };

  // Cases per day from the runs themselves — every run, costed or not, so a
  // day that produced always keeps its bar.
  const casesByDate = new Map<string, number>();
  for (const run of allRuns) {
    casesByDate.set(
      run.date,
      (casesByDate.get(run.date) ?? 0) + norm(Number(run.total_production)),
    );
  }

  // Built off the costed runs rather than the report's own daily trend: the
  // trend carries no material split, and the RM/PM switch needs one. Cost per
  // case is divided by the COSTED cases, not the day's cases — on a day where
  // half the runs have no cost row, dividing by everything produced would
  // quietly halve the rate.
  const costByDate = new Map<string, { net: number; material: number; cases: number }>();
  for (const run of costWindow.data?.per_run ?? []) {
    const bucket = costByDate.get(run.date) ?? { net: 0, material: 0, cases: 0 };
    bucket.net += norm(run.net_cost || run.total_cost);
    bucket.material += norm(run.raw_material_cost);
    bucket.cases += norm(run.produced_qty);
    costByDate.set(run.date, bucket);
  }

  const trend: ProductionTrendPoint[] = windowDays(day.trendFrom, day.date).map((date) => {
    const isToday = date === day.date;
    // The shown day is the only one whose runs may still be open, so it is the
    // only one where the closing figures are not yet the truth.
    const dayCases = isToday ? cases : (casesByDate.get(date) ?? 0);
    const bucket = costByDate.get(date);
    const reported = bucket ? (includeMaterial ? bucket.net : bucket.net - bucket.material) : 0;
    // The shown day comes from the live rollups instead, so the chart, the tile
    // and the breakdown cannot disagree while runs are still open — the window
    // report would report nothing for it until every run closed.
    const pointCost = isToday ? cost.total : reported;
    const pointCases = isToday ? cost.costedCases : (bucket?.cases ?? 0);
    return {
      date,
      cases: dayCases,
      cost: pointCost,
      perCase: pointCases > 0 ? pointCost / pointCases : 0,
      material: isToday ? cost.material : (bucket?.material ?? 0),
      isToday,
      costMissing: pointCost === 0 && dayCases > 0,
    };
  });

  const updatedAt = Math.max(
    windowRuns.dataUpdatedAt,
    costWindow.dataUpdatedAt,
    fgQuery.dataUpdatedAt,
    materialQuery.dataUpdatedAt,
    wasteQuery.dataUpdatedAt,
  );

  const isFetching =
    windowRuns.isFetching ||
    costWindow.isFetching ||
    fgQuery.isFetching ||
    materialQuery.isFetching ||
    wasteQuery.isFetching ||
    detailQueries.some((query) => query.isFetching) ||
    costQueries.some((query) => query.isFetching);

  const refetch = () => {
    void windowRuns.refetch();
    void costWindow.refetch();
    void fgQuery.refetch();
    void materialQuery.refetch();
    void wasteQuery.refetch();
    detailQueries.forEach((query) => void query.refetch());
    costQueries.forEach((query) => void query.refetch());
  };

  // The board polls itself; nobody is standing at a wall to press refresh.
  // Only the app-side queries are driven from here — the three reconciliations
  // carry their own interval, and refetching those as well would double the
  // load this screen puts on SAP.
  const poll = () => {
    void windowRuns.refetch();
    void costWindow.refetch();
    detailQueries.forEach((query) => void query.refetch());
    costQueries.forEach((query) => void query.refetch());
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
