/**
 * The civil board's payload — the shape the server will serve, written now so
 * the screen is not rewritten when it does.
 *
 * NOTHING FILLS THIS YET. There is no `/dashboards/civil-board/` endpoint and
 * no civil register behind one; the board renders `CIVIL_SAMPLE_PROJECTS` from
 * the constants file and says so on its own face. These types exist so that
 * wiring the feed is an import change rather than a redesign, and so the
 * decisions the screen makes about missing figures are made once, here.
 *
 * Snake_case, like every other board's payload, because these will be the
 * server's own keys and renaming them here would put a translation layer
 * between the board and its one endpoint.
 *
 * NULL IS A VALUE HERE, NOT AN ABSENCE. Every nullable field below means "the
 * register does not say", and the board is required to render it as a rule
 * rather than as a zero. A project nobody has costed and a project costing
 * nothing must not look the same — which on a capex board is the difference
 * between an oversight and a bargain.
 */

/**
 * The plot, as the site office writes it: a length and a breadth in feet.
 *
 * Kept beside the area rather than instead of it because the two answer
 * different questions — "how much cover are we buying" and "will it fit
 * against the boundary" — and the second is the one that gets argued about on
 * site. Null where only a total area was filed.
 */
export interface CivilPlot {
  length_ft: number;
  width_ft: number;
}

/** What one project has cost so far against what was sanctioned for it. */
export interface CivilMoney {
  /** Sanctioned, in rupees. Null until a budget is approved for the work. */
  budget: number | null;
  /** Certified and paid to date, in rupees. Null where no bill has been booked. */
  spent: number | null;
}

/**
 * The dates the project is measured against.
 *
 * `end` is the CURRENT committed date, not the original one: a board that
 * quietly re-baselined would report every project as on time. `baseline_end`
 * keeps the date first committed to, so a slip stays visible as a slip.
 */
export interface CivilSchedule {
  start: string;
  end: string;
  baseline_end: string | null;
}

/** What is going on at one project right now, in a word. */
export type CivilStage =
  | 'planning'
  | 'foundation'
  | 'structure'
  | 'roofing'
  | 'finishing'
  | 'handover'
  | 'on-hold';

export interface CivilProject {
  id: string;
  name: string;
  /** Where on the campus, and who is building it. */
  location: string | null;
  contractor: string | null;
  stage: CivilStage;
  /** Covered area in square feet. Null where the drawing is not yet approved. */
  area_sqft: number | null;
  plot: CivilPlot | null;
  money: CivilMoney;
  /**
   * Work done, as the site engineer certifies it — 0 to 100.
   *
   * NOT derived from money spent. An advance against steel is 20% of the bill
   * and 0% of the building, and a board that inferred one from the other would
   * report a project as a fifth built the day its first cheque cleared. Null
   * where nobody has certified a figure this month.
   */
  progress_pct: number | null;
  schedule: CivilSchedule;
  /** One line from the site, for whatever the columns cannot hold. */
  note: string | null;
}

export interface CivilBoardMeta {
  company_code: string;
  site: string;
  generated_at: string;
  /**
   * The rows are a worked example, not the register.
   *
   * True for as long as this board has no feed. The page reads it to put the
   * warning in its header and the word `sample` on every row — a capex figure
   * that a manager cannot tell from a real one is the one failure this board
   * must not have.
   */
  sample: boolean;
}

export interface CivilBoardResponse {
  projects: CivilProject[];
  meta: CivilBoardMeta;
}
