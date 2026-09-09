/** Time helpers for the next-day production plan. */

/**
 * A local `YYYY-MM-DDTHH:mm` from a date input and a time input.
 *
 * Deliberately local and without a zone suffix: the supervisor means 06:00 on
 * the factory floor, and stamping a UTC `Z` would land the plan on the previous
 * evening for a shift that starts early.
 */
export function toLocalIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  return `${date}T${time.length === 5 ? time : time.slice(0, 5)}`;
}

/** "8h 25m" reads faster on a shift plan than "505 minutes". */
export function formatDuration(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** 24-hour clock time from an ISO datetime, or null when it cannot be read. */
export function formatClock(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
