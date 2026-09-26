import { formatDay } from '@/shared/utils';

import type { ProductionRun } from '../types';

/**
 * Cases a run has made so far — the count entered at completion once it is
 * complete, its running segments' until then (`total_production` reads 0 on a
 * line still filling). A server without `produced_cases` gives the total.
 */
export function runProducedCases(run: ProductionRun): number {
  return parseFloat(run.produced_cases ?? run.total_production ?? '0') || 0;
}

/**
 * Litres in those cases: cases x pieces per case x litres per piece, from the
 * SAP snapshots taken at creation — the report service's rule. Null when the
 * SKU has no litre size, so it is left out rather than read as zero.
 */
export function runLitres(run: ProductionRun, cases: number): number | null {
  if (run.litres_per_piece == null) return null;
  return cases * (run.pieces_per_case || 1) * parseFloat(run.litres_per_piece);
}

export function formatCases(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

export interface ProductionGroup {
  cases: number;
  runs: number;
  /** Litres of the runs with a litre size; the rest are counted in `unsized`. */
  litres: number;
}

export interface ProductionSummary {
  completed: ProductionGroup;
  /** Runs still open, at their cases so far. */
  running: ProductionGroup;
  total: ProductionGroup;
  /** Runs that made something but whose SKU has no litre size. */
  unsized: number;
}

/**
 * What a set of runs produced: completed runs at their entered count, open ones
 * at their cases so far. A draft has made nothing and is not a run of either.
 */
export function summariseProduction(runs: ProductionRun[]): ProductionSummary {
  const completed = { cases: 0, runs: 0, litres: 0 };
  const running = { cases: 0, runs: 0, litres: 0 };
  let unsized = 0;
  for (const run of runs) {
    const group =
      run.status === 'COMPLETED' ? completed : run.status === 'IN_PROGRESS' ? running : null;
    if (!group) continue;
    const made = runProducedCases(run);
    group.cases += made;
    group.runs += 1;
    const litres = runLitres(run, made);
    if (litres != null) group.litres += litres;
    else if (made > 0) unsized += 1;
  }
  const total = {
    cases: completed.cases + running.cases,
    runs: completed.runs + running.runs,
    litres: completed.litres + running.litres,
  };
  return { completed, running, total, unsized };
}

/** The board's From/To, in words: "01-09-2026 to 26-09-2026", "all dates". */
export function dateRangeLabel(from: string, to: string): string {
  if (from && to) return from === to ? formatDay(from) : `${formatDay(from)} to ${formatDay(to)}`;
  if (from) return `from ${formatDay(from)}`;
  if (to) return `up to ${formatDay(to)}`;
  return 'all dates';
}
