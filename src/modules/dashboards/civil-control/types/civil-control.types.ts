/**
 * The civil board's row, and where each field of it comes from.
 *
 * THE FEED IS THE CONSTRUCTION REGISTER. This board used to draw four invented
 * projects because there was nothing behind it; it now reads
 * `/construction/projects/` — the same register the Construction module writes
 * — filtered to the statuses a project is live at. There is no
 * `/dashboards/civil-board/` endpoint and there is no longer a plan for one:
 * an aggregate that restated the register would be a second answer to "what is
 * being built", and this screen exists to agree with the module, not to
 * compete with it.
 *
 * Snake_case is kept, because most of these keys ARE the register's own and a
 * row that renamed half of them would hide which half the register does not
 * answer.
 *
 * NULL IS A VALUE HERE, NOT AN ABSENCE. Every nullable field below means "the
 * register does not say", and the board is required to render it as a rule
 * rather than as a zero. A project nobody has costed and a project costing
 * nothing must not look the same — which on a capex board is the difference
 * between an oversight and a bargain. The mapper in
 * `utils/fromConstruction.ts` is where a register value becomes one of these
 * nulls, and every one of those decisions is argued there.
 */

/**
 * The plot, as the site office writes it: a length and a breadth in feet.
 *
 * Kept beside the area rather than instead of it because the two answer
 * different questions — "how much cover are we buying" and "will it fit
 * against the boundary" — and the second is the one that gets argued about on
 * site. Null where the register holds only one side, which is the honest state
 * of a boundary wall.
 *
 * FEET, ALWAYS, whatever unit the project was filed in. The register stores a
 * `dimension_unit` per project, and a board that printed one row in metres
 * beside another in feet would be compared across anyway.
 */
export interface CivilPlot {
  length_ft: number;
  width_ft: number;
}

/** What one project has cost so far against what was sanctioned for it. */
export interface CivilMoney {
  /** Sanctioned, in rupees. Null until a budget is approved for the work. */
  budget: number | null;
  /** Recorded against the project to date, in rupees. Null where no bill has
   *  been booked. Approved and awaiting approval both count — the cash left
   *  the box either way, and a project sitting on an unreviewed batch must not
   *  read as under budget. */
  spent: number | null;
}

/**
 * The dates the project is measured against.
 *
 * `end` is the CURRENT committed date, not the original one: a board that
 * quietly re-baselined would report every project as on time. `baseline_end`
 * keeps the date first committed to — read off the project's earliest approved
 * revision, which is the only place the register records what the date used to
 * be — so a slip stays visible as a slip.
 *
 * Both dates are nullable although a live project cannot be submitted without
 * them (`services.REQUIRED_TO_SUBMIT`). The board does not rely on that rule
 * holding: it is enforced at submit, and a project whose dates were cleared
 * afterwards should print a rule rather than crash a wall display.
 */
export interface CivilSchedule {
  start: string | null;
  end: string | null;
  baseline_end: string | null;
}

/**
 * What is going on at one project right now, in a word.
 *
 * TWO VOCABULARIES LIVE IN THIS UNION, AND ONLY ONE OF THEM IS FED. The
 * register records a project's STATUS — raised, approved, under way, held,
 * finished — and does not record which trade is on site, so `planning`,
 * `in-progress`, `on-hold` and `handover` are the four the mapper can reach.
 *
 * The trade words are kept rather than deleted because they are what the site
 * meeting actually says, and the day a daily log carries a stage the mapper
 * widens by one line instead of the board being redesigned. Until then nothing
 * produces them, and nothing may guess one from a percentage: "38% built" is
 * not "structure", and a board that inferred it would put a frame on a site
 * that is still digging.
 */
export type CivilStage =
  | 'planning'
  | 'in-progress'
  | 'foundation'
  | 'structure'
  | 'roofing'
  | 'finishing'
  | 'handover'
  | 'on-hold';

export interface CivilProject {
  /** The register's row id, as a string, for React's key alone. */
  id: string;
  /** `PRJ-2026-001` — how the site office names the job out loud. This, not
   *  the serial in the first column, is what somebody quotes back. */
  code: string | null;
  name: string;
  /** Where on the campus. */
  location: string | null;
  /**
   * Who is answerable for it — the project manager on the register.
   *
   * NOT THE CONTRACTOR. The register has no contractor field at all, so
   * `contractor` below is null on every row the register feeds. Putting the
   * manager there instead would print an employee's name under the heading
   * "who is building it", which is a different and wrong claim.
   */
  manager: string | null;
  /** Null on every row today: the register does not record who was awarded the
   *  work. Kept so that wiring an award is a mapper line, not a column. */
  contractor: string | null;
  stage: CivilStage;
  /** Covered area in square feet, converted where the project was filed in
   *  metres. Null where the register holds fewer than two sides. */
  area_sqft: number | null;
  plot: CivilPlot | null;
  money: CivilMoney;
  /**
   * Work done, as the site engineer certifies it — 0 to 100.
   *
   * THE REGISTER'S OWN FIGURE, carried up from the latest daily log that
   * stated one. NOT derived from money spent: an advance against steel is 20%
   * of the bill and 0% of the building, and a board that inferred one from the
   * other would report a project as a fifth built the day its first cheque
   * cleared.
   *
   * Null where nobody has certified a figure — see the mapper for why an
   * uncertified project and a project certified at zero are read the same way
   * here, and which of the two errors that choice prefers.
   */
  progress_pct: number | null;
  schedule: CivilSchedule;
  /**
   * One line from the site, for whatever the columns cannot hold.
   *
   * Null on every row today. The sentence worth printing — why a job is held —
   * is the project's `decision_note`, which lives on the detail payload and
   * not on the register list this board reads. Fetching a detail per row to
   * recover it would be one request per project for one line of prose.
   */
  note: string | null;
}

/**
 * Whether the board is reading, showing the register, or has failed to.
 *
 * The header pill says which, and it matters more here than on other boards:
 * an empty civil board is a perfectly ordinary state (a campus with nothing
 * being built) and an unreachable register looks exactly like one. The two are
 * told apart by this and nothing else.
 */
export type CivilBoardState = 'loading' | 'live' | 'error';

/** What `useCivilBoard` hands the page. */
export interface CivilBoardFeed {
  projects: CivilProject[];
  state: CivilBoardState;
  /** True while a refresh is in flight over rows already on screen — the board
   *  keeps showing the old ones rather than blanking a wall display. */
  refreshing: boolean;
  /**
   * The rows on screen are from the last read that worked, and the one after
   * it failed.
   *
   * A wall board that blanked itself on a single bad response would be read as
   * broken, so the old rows stay — but they are a photograph of the register
   * rather than the register, and the board is required to say so. Only ever
   * true alongside `state: 'error'`.
   */
  stale: boolean;
  /**
   * The register answered, but at least one project's revision history FAILED
   * — so a programme that has been extended will read as one that never
   * slipped. Said on the board rather than swallowed.
   *
   * False while a history is merely still in flight: the original date appears
   * under the timeline a moment later, and a warning that flashed on every
   * page open would be a warning nobody reads.
   */
  baselinesMissing: boolean;
  error: Error | null;
  refetch: () => void;
}
