// -------------------------------------------------------------------------- //
// Timing
// -------------------------------------------------------------------------- //

/** How often the wall board re-pulls every source (ms). Short — it is a live
 *  screen and nobody is there to press refresh. */
export const DISPATCH_DAY_REFRESH_MS = 30_000;

/** Clock tick on the header (ms). */
export const DISPATCH_DAY_CLOCK_MS = 1_000;

/** Trend chart length, in days (today inclusive). */
export const TREND_DAYS = 14;

/** Look-back for the on-the-road panel: a truck that left a fortnight ago can
 *  still be the one running late today. */
export const TRACKING_DAYS_BACK = 30;

/**
 * Look-back for the docking list that drives the vendor, company and vehicle
 * panels. Its date filter runs on when the docking was *created*, so this has to
 * cover the oldest truck that could still be standing inside the plant -- a load
 * docked last Tuesday and still not gone is exactly the one the wall must show.
 */
export const DOCKING_DAYS_BACK = 7;

// -------------------------------------------------------------------------- //
// Open backlog panel
// -------------------------------------------------------------------------- //

/** The two booking statuses that count as unshipped. Same pair the backend's
 *  `OPEN_STATUSES` uses for the Open Backlog KPI, so the panel and the tile
 *  cannot drift apart on what "open" means. */
export const BACKLOG_OPEN_STATUSES = {
  PENDING: 'PENDING',
  BOOKED: 'BOOKED',
} as const;

/** Rows pulled per status. This is the drill-down endpoint's own ceiling
 *  (`MAX_BILL_PAGE`); asking for more is silently clamped, so the panel says
 *  when it has hit the cap rather than pretending the list is complete. */
export const BACKLOG_PAGE_SIZE = 100;

/** How far back the panel looks before anybody touches the date picker. Wide on
 *  purpose: the list leads with the most overdue bill, and a short default would
 *  hide exactly the rows that need chasing. */
export const BACKLOG_DEFAULT_DAYS_BACK = 365;

/**
 * Hard floor for the picker — ten years, i.e. "anything you might reasonably
 * type". Kept just inside the bill endpoint's own `MAX_BILL_RANGE_DAYS` so a
 * clamped date is always one the backend will accept.
 *
 * Deliberately NOT the summary endpoint's 366-day aggregation guard. Sharing
 * that number greyed out whole years in the date picker, which reads as a broken
 * control rather than as a limit — and the bill list is paginated, so it never
 * needed the guard in the first place.
 */
export const BACKLOG_MAX_DAYS_BACK = 3650;

// -------------------------------------------------------------------------- //
// Dates — always LOCAL, never UTC. A board that flips to "tomorrow" at 05:30 IST
// because the browser did toISOString() is worse than no board.
// -------------------------------------------------------------------------- //

/** Local YYYY-MM-DD for a Date. */
export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today, local, as YYYY-MM-DD. */
export function todayISO(): string {
  return toLocalISODate(new Date());
}

/** N days either side of a given local date. Parsed as local midnight, never
 *  through Date.parse of the bare string — that reads YYYY-MM-DD as UTC and
 *  slides the whole window a day west of here. */
export function shiftFromISO(anchor: string, days: number): string {
  const d = new Date(`${anchor}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

/** The last instant of a local date, as epoch ms. Dwell figures are measured to
 *  here rather than to `now`, so a past day's numbers stop ageing. */
export function endOfDayMs(anchor: string): number {
  const d = new Date(`${anchor}T00:00:00`);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * How long the board sits on a back-date before returning to today.
 *
 * This is a wall screen. Somebody checks Tuesday, walks away, and the display
 * silently shows a stale day to the whole room until the next person notices.
 * Snapping back is the difference between a filter and a trap.
 */
export const HISTORY_AUTO_RETURN_MS = 10 * 60_000;

// -------------------------------------------------------------------------- //
// Stage vocabulary for the wall
// -------------------------------------------------------------------------- //

/** How far along each docking status is — picks the truck's headline status
 *  when it carries several dockings sitting at different steps.
 *
 *  `PENDING_DOCKING` is deliberately absent rather than zero: it is not a
 *  docking status at all but the state of a truck that has crossed the barrier
 *  and has no docking yet, so it must lose to every real step (the lookup falls
 *  back to 0) the moment somebody starts one. */
export const DOCKING_STATUS_PROGRESS: Record<string, number> = {
  DOCKED: 1,
  PHOTO_ATTACHED: 2,
  READY_FOR_GATEPASS: 3,
  GATEPASS_PRINTED: 4,
  PRINT_COMMITTED: 5,
  DISPATCHED: 6,
};

/** Human labels for the docking statuses the wall shows. */
export const DOCKING_STATUS_LABEL: Record<string, string> = {
  PENDING_DOCKING: 'Waiting to dock',
  DOCKED: 'Docked',
  PHOTO_ATTACHED: 'Photo attached',
  READY_FOR_GATEPASS: 'Ready for gatepass',
  GATEPASS_PRINTED: 'Gatepass printed',
  PRINT_COMMITTED: 'At dispatch out',
  DISPATCHED: 'Dispatched',
};
