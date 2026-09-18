/**
 * The HR board's payload, as `hr_board/services.py` composes it.
 *
 * Every tile is nullable because the server reports a band it could not read
 * *inside* a 200 — named in `meta.withheld` (you may not see it) or
 * `meta.degraded` (it could not be read) — rather than failing the request. A
 * null tile is therefore a normal state with a reason attached, and the page
 * prints the reason instead of the figures.
 */

/** One bar: a label and its count. Blank groups arrive pre-labelled. */
export interface HrCount {
  label: string;
  count: number;
}

/**
 * A capped list: the top rows, plus whatever was below them summed into one.
 *
 * `other` travels with the rows so the tile can still show a figure that adds
 * up to its own headline — a chart whose bars sum to less than the number above
 * them is read as a broken chart.
 */
export interface HrCapped {
  rows: HrCount[];
  other: number;
  other_count: number;
}

export interface HrStatus {
  key: string;
  label: string;
  count: number;
}

export interface HrHeadcount {
  /**
   * Always `'group'`. The employee directory is one directory for the whole
   * factory — every person sits under a single company FK and the plant they
   * are costed to is `sap_segment` — so this figure does NOT change with the
   * company switcher. Printed on the tile for exactly that reason.
   */
  scope: 'group';
  total: number;
  /** Which plant each person is costed to. `Unassigned` where the field is blank. */
  segments: HrCount[];
  departments: HrCapped;
  department_count: number;
  unassigned: number;
  managers: number;
  statuses: HrStatus[];
}

export interface HrTrendDay {
  date: string;
  count: number;
}

export interface HrLabour {
  /** Per company, unlike head count — the gate really does book the plants apart. */
  scope: 'company';
  work_date: string;
  /**
   * How many labourers actually walked in: the sum over GATE INTAKE rows only.
   *
   * Not the sum over the labour gate table, which is roughly double — the gate
   * books a labourer once on entry and again when an HOD allocates them to a
   * department. `hr_board/constants.py` carries the full account.
   */
  today_in: number;
  /** How many of them an HOD has placed into a department so far. */
  today_allocated: number;
  /** The gap. Normal at 09:00, a standing problem by 18:00. */
  pending_allocation: number;
  shifts: HrCount[];
  contractors: HrCapped;
  /** Where today's labour was put. Only the allocation rows know this. */
  departments: HrCapped;
  contractor_count: number;
  trend: HrTrendDay[];
  window_days: number;
  /** Averaged over days the gate booked somebody, not over the calendar. */
  average_per_working_day: number | null;
  working_days: number;
  peak: HrTrendDay | null;
}

export interface HrBoardMeta {
  company: string;
  as_of: string;
  generated_at: string;
  refresh_seconds: number;
  /** Bands that could not be read. */
  degraded: string[];
  /** Bands this reader may not see. Never the same list as `degraded`. */
  withheld: string[];
  /** Prose caveats for a band that DID render. */
  warnings: string[];
}

export interface HrBoardResponse {
  headcount: HrHeadcount | null;
  labour: HrLabour | null;
  meta: HrBoardMeta;
}
