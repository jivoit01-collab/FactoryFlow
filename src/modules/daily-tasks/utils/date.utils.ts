/**
 * Local-calendar-day helpers.
 *
 * A daily sheet is a local-day artifact, so these deliberately never touch
 * `toISOString()` — that converts to UTC and would roll the date back a day for any
 * IST evening, silently showing yesterday's sheet after 5:30pm.
 *
 * Kept free of imports so they can be tested without loading the app config.
 */

/** Today as a local `YYYY-MM-DD`. */
export function todayLocalISO(): string {
  return toLocalISO(new Date());
}

/** Step a local `YYYY-MM-DD` by whole days without crossing a timezone boundary. */
export function shiftLocalISO(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return toLocalISO(new Date(year, month - 1, day + days));
}

function toLocalISO(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}
