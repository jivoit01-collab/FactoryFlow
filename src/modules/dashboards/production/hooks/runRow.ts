/**
 * One run, as every production board draws it.
 *
 * Kept in its own file because two boards now build these — the day wall and
 * the per-line board — and they open the SAME card from them. Two builders
 * would be two chances for one screen to state a case count the other does not.
 */

import type {
  LiveStatus,
  MachineBreakdown,
  ProductionRun,
  ProductionRunCost,
  ProductionRunDetail,
  ProductionSegment,
} from '@/modules/production/execution/types';
import { type LineStandard, type RunMetrics, runMetrics } from '@/modules/production/execution/utils';

import { type RunTone, runTone } from '../constants/production-wall.constants';

export interface ProductionRunRow {
  id: number;
  runNumber: number;
  line: string;
  lineId: number;
  product: string;
  itemCode: string;
  /**
   * Cases on the board: live segment output while the run is open, the run's
   * own closing figure once it is done. A running line whose segments have not
   * been closed yet reports `total_production` = 0, and a wall that showed that
   * as "0 cases" for six hours would read as a dead line.
   *
   * Taken from `metrics` rather than computed again here, so a row and the card
   * opened from it cannot state different case counts.
   */
  cases: number;
  tone: RunTone;
  /**
   * The backend's own live state, kept beside the tone it was drawn in.
   *
   * The tone is vocabulary for a reader; ranking one line against another needs
   * the raw state, and re-deriving it from the tone's label would make the
   * board's severity order depend on its wording.
   */
  liveStatus: LiveStatus;
  /**
   * How the line is doing — speed against its rating, time against stoppages,
   * output against its target. Everything the run card draws, derived once.
   */
  metrics: RunMetrics;
  /** The run's own cost rollup; null until the run has been costed. */
  cost: ProductionRunCost | null;
  /** The shift's spells of running, and what stopped them. */
  segments: ProductionSegment[];
  breakdowns: MachineBreakdown[];
  /** Who was on the line, as the run was opened. */
  supervisor: string;
  operators: string;
  labourCount: number;
  otherManpowerCount: number;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  /**
   * The run's detail is still in flight, so the figures above are the run's
   * stored totals rather than its live segments. A card must say so rather
   * than show a running line at zero.
   */
  detailLoading: boolean;
}

export function toRunRow({
  run,
  detail,
  cost,
  now,
  standard,
  detailLoading,
}: {
  run: ProductionRun;
  detail: ProductionRunDetail | undefined;
  cost: ProductionRunCost | undefined;
  now: number;
  /** The line's preset, where the caller has read the configuration master. */
  standard?: LineStandard;
  detailLoading: boolean;
}): ProductionRunRow {
  const metrics = runMetrics(run, detail, now, standard);
  return {
    id: run.id,
    runNumber: run.run_number,
    line: run.line_name || `Line ${run.line}`,
    lineId: run.line,
    product: run.product || '—',
    itemCode: run.item_code,
    cases: metrics.producedCases,
    tone: runTone(run.live_status, run.status),
    liveStatus: run.live_status,
    metrics,
    cost: cost ?? null,
    segments: detail?.segments ?? [],
    breakdowns: detail?.breakdowns ?? [],
    supervisor: run.supervisor,
    operators: run.operators,
    labourCount: run.labour_count,
    otherManpowerCount: run.other_manpower_count,
    plannedStartAt: run.planned_start_at,
    plannedEndAt: run.planned_end_at,
    detailLoading,
  };
}
