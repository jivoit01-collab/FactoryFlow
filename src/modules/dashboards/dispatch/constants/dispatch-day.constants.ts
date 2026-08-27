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

/** N days either side of today, local, as YYYY-MM-DD. */
export function shiftISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

// -------------------------------------------------------------------------- //
// Stage vocabulary for the wall
// -------------------------------------------------------------------------- //

/**
 * Docking statuses that mean the truck is physically inside the plant: docked,
 * being photographed, waiting on a gatepass, or printed but not yet waved out.
 * Anything else is either gone (DISPATCHED) or dead (REJECTED / CANCELLED).
 */
export const INSIDE_DOCKING_STATUSES = [
  'DOCKED',
  'PHOTO_ATTACHED',
  'READY_FOR_GATEPASS',
  'GATEPASS_PRINTED',
  'PRINT_COMMITTED',
] as const;

/** How far along each docking status is — picks the truck's headline status
 *  when it carries several dockings sitting at different steps. */
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
  DOCKED: 'Docked',
  PHOTO_ATTACHED: 'Photo attached',
  READY_FOR_GATEPASS: 'Ready for gatepass',
  GATEPASS_PRINTED: 'Gatepass printed',
  PRINT_COMMITTED: 'At dispatch out',
  DISPATCHED: 'Dispatched',
};
