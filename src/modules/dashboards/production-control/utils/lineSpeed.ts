/**
 * How fast a line is actually running, against what it is rated for.
 *
 * This is deliberately NOT OEE. Three things stop the existing
 * `compute_run_oee` from meaning anything on a live board:
 *
 *  - it reads `total_production`, which stays 0 until a run is completed, so
 *    every in-flight run computes as 0% performance;
 *  - it assumes a fixed 720-minute shift, so availability is meaningless before
 *    the shift ends;
 *  - `total_breakdown_time` is 0 on most runs, pinning availability at 100% and
 *    leaving OEE as performance × quality anyway.
 *
 * So the board shows the one component that is honest at any moment: throughput
 * against rated speed, from output the operators have actually entered. Full
 * three-part OEE belongs on completed runs, from the analytics endpoints.
 *
 * ONE OPEN QUESTION sits behind this. On a completed run `total_production` and
 * the sum of the run's segments disagree — by up to 3.4× on live records — and
 * nobody has yet said which is authoritative. This module reads
 * `total_production` because it is the figure on the run's own closing record
 * and the only one the list endpoint carries; `SPEED_BASIS` names that choice so
 * it is a visible decision rather than a buried assumption.
 */

/** Which output figure the speed is computed from. See the note above. */
export const SPEED_BASIS = 'total_production' as const;

export interface LineSpeedInput {
  /** Cases the run has booked. `total_production` on the run record. */
  cases: number | null;
  /** `pieces_per_case` — SAP `OITM.SalFactor2`, snapshot on the run. */
  piecesPerCase: number | null;
  /** Minutes the line actually ran. `total_running_minutes`. */
  runningMinutes: number | null;
  /** `rated_speed`, in bottles per hour. */
  ratedSpeed: number | null;
}

export interface LineSpeed {
  /** Bottles per hour achieved. Null when it cannot be computed. */
  actual: number | null;
  rated: number | null;
  /** Achieved as a share of rated, capped at 100. Null when uncomputable. */
  percent: number | null;
  /** Why there is no figure, for the panel to show instead of a zero. */
  reason: 'ok' | 'no-output' | 'no-runtime' | 'no-rated-speed';
}

/**
 * Speed for one run.
 *
 * Every unmeasurable case returns null with a reason rather than 0. A line that
 * has not booked its output yet is not a line running at 0% — showing it that
 * way is how a working line ends up looking dead on a wall.
 */
export function lineSpeedOf(input: LineSpeedInput): LineSpeed {
  const cases = input.cases ?? 0;
  const minutes = input.runningMinutes ?? 0;
  const rated = input.ratedSpeed ?? 0;

  // A missing pieces-per-case falls back to 1, matching the backend's own rule:
  // for a CSD SKU the transacted piece IS the box.
  const bottles = cases * (input.piecesPerCase || 1);

  if (minutes <= 0)
    return { actual: null, rated: rated || null, percent: null, reason: 'no-runtime' };
  if (cases <= 0) return { actual: null, rated: rated || null, percent: null, reason: 'no-output' };

  const actual = bottles / (minutes / 60);
  if (rated <= 0) return { actual, rated: null, percent: null, reason: 'no-rated-speed' };

  return { actual, rated, percent: Math.min((actual / rated) * 100, 100), reason: 'ok' };
}

/** Plain-language stand-in for a speed that could not be computed. */
export function lineSpeedReason(reason: LineSpeed['reason']): string {
  switch (reason) {
    case 'no-output':
      return 'No output booked yet';
    case 'no-runtime':
      return 'No running time yet';
    case 'no-rated-speed':
      return 'No rated speed set';
    default:
      return '';
  }
}
