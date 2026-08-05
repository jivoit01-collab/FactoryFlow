/**
 * Daily Tasks types — mirror of the backend `activity_center.daily` serializers.
 */

/**
 * How often a job is expected. This describes the job itself and is independent of
 * whether the system can observe it being done (see `countable`).
 *
 * - `DAILY`    — expected on a normal working day.
 * - `SHIFT`    — expected once for each shift worked.
 * - `EVENT`    — only exists when something triggers it; never an expectation.
 * - `PERIODIC` — master data; only when something changes. Never an expectation.
 */
export type Cadence = 'DAILY' | 'SHIFT' | 'EVENT' | 'PERIODIC';

/** How a job is attributed: `OWNED` names this user, `QUEUE` is a shared backlog. */
export type ActivityMode = 'OWNED' | 'QUEUE';

export interface DailyJob {
  source_key: string;
  label: string;
  module: string;
  cadence: Cadence;
  mode: ActivityMode;
  /**
   * True when the record stores who acted, so completion can be proven.
   * When false, `done_today` and `last_done_at` are null — never 0 — and the job
   * is shown but never tallied.
   */
  countable: boolean;
  /** Records this user actioned today. Null when `countable` is false. */
  done_today: number | null;
  /** Null when `countable` is false, or when nothing was done today. */
  last_done_at: string | null;
  /** Records currently sitting in a status that needs this action. */
  pending_now: number;
  oldest_pending_days: number | null;
  /** Frontend link to the screen where this job is done. */
  url: string | null;
}

export interface DailyGroup {
  cadence: Cadence;
  title: string;
  /** Jobs in this group that count toward the tally. 0 for EVENT / PERIODIC. */
  counted_jobs: number;
  done: number;
  jobs: DailyJob[];
}

export interface DailyTally {
  counted_jobs: number;
  done: number;
  not_yet: number;
  /** Raw record count, as opposed to `done` which counts distinct kinds of job. */
  records_done: number;
}

export interface DailySheetUser {
  user_id: number;
  full_name: string;
  employee_code: string;
}

export interface DailySheet {
  date: string;
  is_today: boolean;
  user: DailySheetUser;
  tally: DailyTally;
  /** Jobs shown but deliberately excluded from the tally. */
  uncounted_jobs: number;
  groups: DailyGroup[];
}

export interface DailyBoardRow {
  user_id: number;
  full_name: string;
  email: string;
  employee_code: string;
  is_superuser: boolean;
  /** Countable jobs this user's permissions map to. */
  expected_counted: number;
  /** In-scope jobs that cannot be observed at all. */
  expected_uncounted: number;
  /** Distinct countable jobs with at least one record today. */
  jobs_done: number;
  not_yet: number;
  records_done: number;
  first_activity_at: string | null;
  last_activity_at: string | null;
  modules_touched: string[];
}

export interface DailyBoardTotals {
  users: number;
  with_activity: number;
  no_activity_yet: number;
  records_done: number;
}

export interface DailyBoard {
  date: string;
  is_today: boolean;
  totals: DailyBoardTotals;
  users: DailyBoardRow[];
}
