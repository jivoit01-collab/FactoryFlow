/**
 * Today's runs folded into one row per line.
 *
 * The board is about LINES, not runs, and a line often carries several runs in
 * a day — BH-PF's 10 Head had three on 2026-09-08. A line showing three tiles
 * with three different states tells a supervisor nothing, so the runs collapse
 * to one row carrying the state that matters most.
 *
 * Two rules do the collapsing:
 *
 *  - **Worst state wins.** A line with one run broken down and another running
 *    is a broken line. Precedence is BREAKDOWN > RUNNING > STOPPED > COMPLETED
 *    > DRAFT, which is severity order, not lifecycle order.
 *  - **"Running" means an open segment, never the run's status.** Seven runs
 *    carried `IN_PROGRESS` on 2026-09-08 while only three had an open segment;
 *    the other four were mid-run with production stopped. The backend's
 *    `live_status` already draws that distinction, so the board reads it rather
 *    than re-deriving from `status`.
 */
import type { LiveStatus, ProductionRun } from '@/modules/production/execution/types';

import { type LineSpeed, lineSpeedOf } from './lineSpeed';

/** Severity order. Index 0 is the state a supervisor must see first. */
const SEVERITY: LiveStatus[] = ['BREAKDOWN', 'RUNNING', 'STOPPED', 'COMPLETED', 'DRAFT'];

export interface LineRow {
  lineId: number;
  lineName: string;
  /** The worst state across the line's runs today. */
  state: LiveStatus;
  /** Every run on this line today, worst state first. */
  runs: ProductionRun[];
  /** The run the row's figures come from — the worst-state one. */
  lead: ProductionRun;
  /** Product on the lead run. */
  product: string;
  /** Cases booked across every run on the line today. */
  cases: number;
  /** Downtime logged across every run on the line today, in minutes. */
  breakdownMinutes: number;
  /** Speed for the lead run against its rating. */
  speed: LineSpeed;
}

export interface LineBoard {
  rows: LineRow[];
  running: number;
  brokenDown: number;
  stopped: number;
  completed: number;
  notStarted: number;
  /** Downtime logged today across every line. */
  breakdownMinutes: number;
  /** Cases booked today across every line. */
  cases: number;
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function severityOf(status: LiveStatus): number {
  const index = SEVERITY.indexOf(status);
  // An unrecognised state sorts last rather than first, so a future status
  // never silently outranks a live breakdown.
  return index === -1 ? SEVERITY.length : index;
}

/** Group today's runs by line and rank the lines by what needs attention. */
export function buildLineBoard(runs: ProductionRun[]): LineBoard {
  const byLine = new Map<number, ProductionRun[]>();
  for (const run of runs) {
    const existing = byLine.get(run.line);
    if (existing) existing.push(run);
    else byLine.set(run.line, [run]);
  }

  const rows: LineRow[] = [];
  for (const [lineId, lineRuns] of byLine) {
    const ordered = [...lineRuns].sort(
      (a, b) =>
        severityOf(a.live_status) - severityOf(b.live_status) || b.run_number - a.run_number,
    );
    const lead = ordered[0];

    rows.push({
      lineId,
      lineName: lead.line_name || `Line ${lineId}`,
      state: lead.live_status,
      runs: ordered,
      lead,
      product: lead.product || lead.item_code || '',
      cases: ordered.reduce((sum, run) => sum + toNumber(run.total_production), 0),
      breakdownMinutes: ordered.reduce((sum, run) => sum + toNumber(run.total_breakdown_time), 0),
      speed: lineSpeedOf({
        cases: toNumber(lead.total_production),
        piecesPerCase: lead.pieces_per_case ?? null,
        runningMinutes: toNumber(lead.total_running_minutes),
        ratedSpeed: toNumber(lead.rated_speed) || null,
      }),
    });
  }

  rows.sort(
    (a, b) => severityOf(a.state) - severityOf(b.state) || a.lineName.localeCompare(b.lineName),
  );

  const count = (state: LiveStatus) => rows.filter((row) => row.state === state).length;

  return {
    rows,
    running: count('RUNNING'),
    brokenDown: count('BREAKDOWN'),
    stopped: count('STOPPED'),
    completed: count('COMPLETED'),
    notStarted: count('DRAFT'),
    breakdownMinutes: rows.reduce((sum, row) => sum + row.breakdownMinutes, 0),
    cases: rows.reduce((sum, row) => sum + row.cases, 0),
  };
}

/** Label and tone for a live state, in the board's vocabulary. */
export const LINE_STATE_LABEL: Record<LiveStatus, string> = {
  BREAKDOWN: 'Breakdown',
  RUNNING: 'Running',
  STOPPED: 'Stopped',
  COMPLETED: 'Finished',
  DRAFT: 'Not started',
};

/**
 * States that read as lost production, and take the board's alarm colour.
 *
 * A stopped line costs the same output as a broken one — the difference is why,
 * not whether it matters — so both are red rather than red-and-amber. They stay
 * told apart by their label and by the warning icon a breakdown carries; only
 * the urgency is shared.
 */
export const LINE_STATE_ALARM: readonly LiveStatus[] = ['BREAKDOWN', 'STOPPED'];

export function isLineAlarming(state: LiveStatus): boolean {
  return LINE_STATE_ALARM.includes(state);
}

export const LINE_STATE_TONE: Record<LiveStatus, string> = {
  BREAKDOWN: 'text-rose-600 dark:text-rose-400',
  RUNNING: 'text-emerald-600 dark:text-emerald-400',
  STOPPED: 'text-rose-600 dark:text-rose-400',
  COMPLETED: 'text-sky-600 dark:text-sky-400',
  DRAFT: 'text-muted-foreground',
};

export const LINE_STATE_DOT: Record<LiveStatus, string> = {
  BREAKDOWN: 'bg-rose-500',
  RUNNING: 'bg-emerald-500',
  STOPPED: 'bg-rose-500',
  COMPLETED: 'bg-sky-500',
  DRAFT: 'bg-muted-foreground/40',
};
