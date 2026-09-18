/**
 * How a run is doing against its rated speed and against its own clock.
 *
 * TIME is derived from the run's segments and breakdowns rather than from the
 * run's stored totals, because those totals only settle when the run closes: a
 * line four hours into a shift reports `total_running_minutes` 0, and a board
 * reading that would call a producing line dead. The open segment and the open
 * breakdown are both counted up to `now`, so the numbers climb through the
 * shift the way the line does. On a closed run the two agree exactly —
 * `total_running_minutes` IS the segment sum, checked across 2026-09-17 —
 * so nothing is mixed by pairing segment time with the closing output below.
 *
 * OUTPUT does not work that way, and the rule for it is set out where it is
 * applied: the closing figure owns a finished run, the live segments own an
 * open one.
 *
 * The one conversion that matters: `rated_speed` is in BOTTLES per hour and
 * everything the floor counts is in CASES, so the two only meet through the
 * run's own `pieces_per_case` snapshot (SAP's SalFactor2), which varies by SKU
 * — 4, 10 and 20 all occur. Where SAP never resolved it, speed and efficiency
 * are returned as null rather than computed against an assumed 1: that
 * assumption does not produce a slightly wrong efficiency, it produces one
 * wrong by a factor of twenty, and a line running perfectly would read as 5%.
 *
 * That last choice deliberately differs from the backend's `compute_run_oee`,
 * which falls back to 1 for SKUs whose transacted piece IS the box. The run
 * model is the authority on what the null means — "not yet resolved" — and a
 * card built to be analysed rather than glanced at has to distinguish a figure
 * nobody can compute from a bad one.
 */

import type { ProductionRun, ProductionRunDetail } from '../types';

/**
 * What the line is set up to do, from its standing configuration.
 *
 * A run takes its own snapshot of both figures when it is opened, and that
 * snapshot is what the run was actually judged by — so it always wins. This is
 * the fallback for a run opened before the SKU resolved, or entered by hand on
 * the floor without a preset: the line's configuration is maintained for every
 * line, and reading it turns a blank efficiency into a real one rather than
 * leaving the tile mute.
 */
export interface LineStandard {
  /** Bottles/hr the line is configured for. */
  ratedSpeed: number | null;
  /** Bottles per case for the SKU, from the same configuration. */
  piecesPerCase: number | null;
}

export interface RunMetrics {
  /**
   * What the run has made: its own closing figure once it is done, live
   * segment output while it is still open.
   *
   * Derived in one place so a row, a tile and the card opened from either can
   * never state different case counts — and so every board states the same
   * figure the run register does.
   */
  producedCases: number;
  /** `total_production` — what the run was closed at. */
  closingCases: number;
  /** What the run's segments book between them. */
  segmentCases: number;
  /** Which of the two `producedCases` took. */
  basis: 'closing' | 'segments';
  /** A segment is open — the figures above and below are still climbing. */
  isLive: boolean;
  /** Minutes the line actually ran, the open segment included. */
  runningMinutes: number;
  /** Minutes lost to stoppages, an unfinished breakdown included. */
  breakdownMinutes: number;
  /** Bottles/hr the line is rated at; null when neither the run nor the line's
   *  configuration carries a rating. */
  ratedSpeed: number | null;
  /** Bottles in a case; null when neither has one. */
  piecesPerCase: number | null;
  /**
   * Litres in one bottle (SAP `OITM.SalPackUn`), snapshot on the run.
   *
   * Null where the SKU holds no liquid, or where SAP never resolved one — a
   * weight-packed pouch has no volume at all. Never derived from the SKU name:
   * a "1 LTR + 1 LTR COMBO" piece holds two litres and a "1 LTR 16 PCS" carton
   * bills as sixteen.
   */
  litresPerPiece: number | null;
  /** Litres in a case — pieces × litres per piece. Null when either is. */
  litresPerCase: number | null;
  /** What the run made, in litres. Null when the SKU carries no volume. */
  producedLitres: number | null;
  /** What the rating says it should have made, in litres. */
  expectedLitres: number | null;
  /** What it was asked for, in litres. */
  targetLitres: number | null;
  /**
   * Which of the two the figures above came from.
   *
   * Stated rather than inferred because the two are not equally strong: the
   * run's snapshot is what that run was actually set up against, while the
   * line's configuration is what the line is meant to do today. A tile leaning
   * on the second should be able to say so.
   */
  ratedFrom: 'run' | 'config' | null;
  piecesFrom: 'run' | 'config' | null;
  /** Bottles/hr the line actually achieved. */
  actualSpeed: number | null;
  /** Cases the rated speed would have made in the time the line ran. */
  expectedCases: number | null;
  /** Produced ÷ expected, as a percentage. */
  efficiencyPct: number | null;
  /** Running ÷ time on the line, as a percentage — how much of the run was
   *  spent producing rather than stopped. */
  utilisationPct: number | null;
  /** Cases the run was opened for; null when it was opened without a target. */
  targetCases: number | null;
  /** Produced ÷ target, as a percentage. */
  targetPct: number | null;
  rejectedCases: number;
  reworkedCases: number;
  /** Nothing above is derived from segments yet — the detail is still in flight. */
  isPartial: boolean;
}

const num = (value: string | number | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Whole minutes between two stamps, never negative — a clock skew on the
 *  floor must not hand a run negative running time. */
function minutesBetween(from: string, to: number | string): number {
  const start = new Date(from).getTime();
  const end = typeof to === 'number' ? to : new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 60_000));
}

const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : null;

export function runMetrics(
  run: ProductionRun,
  detail: ProductionRunDetail | undefined,
  now: number = Date.now(),
  /** The line's standing configuration, where the caller has it. */
  standard?: LineStandard,
): RunMetrics {
  const segments = detail?.segments ?? [];
  const breakdowns = detail?.breakdowns ?? [];

  let runningMinutes = 0;
  let segmentCases = 0;
  let isLive = false;
  for (const segment of segments) {
    if (segment.end_time) {
      runningMinutes += minutesBetween(segment.start_time, segment.end_time);
    } else if (segment.is_active) {
      runningMinutes += minutesBetween(segment.start_time, now);
      isLive = true;
    }
    segmentCases += num(segment.produced_cases);
  }

  let breakdownMinutes = 0;
  for (const breakdown of breakdowns) {
    // An unfinished breakdown carries a stale `breakdown_minutes` from whenever
    // it was last saved, so the open one is measured rather than read.
    if (breakdown.end_time) breakdownMinutes += num(breakdown.breakdown_minutes);
    else if (breakdown.is_active) breakdownMinutes += minutesBetween(breakdown.start_time, now);
  }

  // A closed run states its output once, on its own record. Its segments book
  // output spell by spell and are routinely left at zero on the spells nobody
  // was filling in — on 2026-09-17 every completed run disagreed with its own
  // segments (10 Head 894 against 440, Clear Pack 1,509 against 400), with two
  // or three zero-output spells apiece marked "tea time" and "lunch time". The
  // run's closing figure is what the register, the run screen, the yield report
  // and the OEE service all read, so it is what a board must read too: two
  // screens showing one run as 894 and 440 is the one thing this cannot do.
  //
  // While a run is still open there is no closing figure yet — it stays 0 until
  // the run is closed — so the live segments are the only thing that can keep a
  // running line off zero, and they take over.
  const isClosed = run.status === 'COMPLETED';
  const closingCases = num(run.total_production);
  const useClosing = isClosed ? closingCases > 0 : segmentCases === 0;
  const producedCases = useClosing ? closingCases : segmentCases;

  const ownRated = num(run.rated_speed);
  const configRated = standard?.ratedSpeed ?? 0;
  const ratedSpeed = ownRated > 0 ? ownRated : configRated > 0 ? configRated : null;
  const ratedFrom = ownRated > 0 ? 'run' : configRated > 0 ? 'config' : null;

  const ownPieces = run.pieces_per_case ?? 0;
  const configPieces = standard?.piecesPerCase ?? 0;
  const piecesPerCase = ownPieces > 0 ? ownPieces : configPieces > 0 ? configPieces : null;
  const piecesFrom = ownPieces > 0 ? 'run' : configPieces > 0 ? 'config' : null;

  const canConvert = ratedSpeed != null && piecesPerCase != null;
  const expectedCases =
    canConvert && runningMinutes > 0
      ? Math.round((runningMinutes / 60) * (ratedSpeed / piecesPerCase))
      : null;

  const actualSpeed =
    piecesPerCase != null && runningMinutes > 0
      ? Math.round(((producedCases * piecesPerCase) / runningMinutes) * 60)
      : null;

  const onTheLine = runningMinutes + breakdownMinutes;
  const target = num(run.required_qty);

  const perPiece = num(run.litres_per_piece);
  const litresPerPiece = perPiece > 0 ? perPiece : null;
  const litresPerCase =
    litresPerPiece != null && piecesPerCase != null ? litresPerPiece * piecesPerCase : null;
  // A missing volume stays null rather than 0 throughout, so a SKU SAP holds no
  // litres for reads as "—" instead of dragging a litre total down.
  const inLitres = (cases: number | null) =>
    litresPerCase == null || cases == null ? null : Math.round(litresPerCase * cases);

  return {
    producedCases,
    closingCases,
    segmentCases,
    basis: useClosing ? 'closing' : 'segments',
    isLive,
    runningMinutes,
    breakdownMinutes,
    ratedSpeed,
    piecesPerCase,
    litresPerPiece,
    litresPerCase,
    producedLitres: inLitres(producedCases),
    expectedLitres: inLitres(expectedCases),
    targetLitres: inLitres(target > 0 ? target : null),
    ratedFrom,
    piecesFrom,
    actualSpeed,
    expectedCases,
    efficiencyPct: expectedCases ? pct(producedCases, expectedCases) : null,
    utilisationPct: pct(runningMinutes, onTheLine),
    targetCases: target > 0 ? target : null,
    targetPct: target > 0 ? pct(producedCases, target) : null,
    rejectedCases: num(run.rejected_qty),
    reworkedCases: num(run.reworked_qty),
    isPartial: detail === undefined,
  };
}
