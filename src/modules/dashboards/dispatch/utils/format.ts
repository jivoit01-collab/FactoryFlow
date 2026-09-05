/**
 * Wall-board formatters. Everything here optimises for one thing: staying
 * readable at 4 m from a 55" screen. That means short — "₹4.2 Cr", not
 * "₹4,21,55,090.00" — and Indian units, because that is what the floor speaks.
 */

/** 1,23,456 — Indian grouping, no decimals. */
export function count(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

/** Indian short scale: 1.2 Cr / 4.3 L / 12K / 940. */
export function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(abs >= 1e8 ? 1 : 2)} Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(abs >= 1e6 ? 0 : 1)} L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return count(value);
}

/** ₹ + short scale. */
export function money(value: number): string {
  return `₹${compact(value)}`;
}

/**
 * Litres, short-scaled.
 *
 * Preferred over weight wherever one row can dominate a total. SAP's weight
 * field is unreliable on this data -- it has arrived truncated to the tail of
 * its own litres figure (2,195 L recorded as 195 kg) on roughly one dispatched
 * docking in sixty -- while the litres on those same rows were correct every
 * time. For an oil business it is also the truer measure.
 */
export function volume(litres: number): string {
  return `${compact(litres)} L`;
}

/** Kilograms as tonnes once they stop fitting. */
export function weight(kg: number): string {
  if (Math.abs(kg) >= 1000) return `${(kg / 1000).toFixed(1)} T`;
  return `${count(kg)} kg`;
}

/** HH:MM on a 24-hour clock, local. Null-safe — a missing stamp reads "—". */
export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * How long ago, in floor language: "just now", "42m", "3h 10m", "2d".
 * Used for dwell time, so it must never round a stuck truck down to nothing.
 */
export function since(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const mins = Math.floor((now - then) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const rest = mins % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Minutes elapsed since a stamp — the dwell figure the "stuck" tint keys off. */
export function minutesSince(iso: string | null | undefined, now: number = Date.now()): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 60_000));
}

/** Local YYYY-MM-DD of a timestamp — for "did this happen today?". */
export function localDateOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local hour (0–23) of a timestamp, or null. */
export function localHourOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}

/** Percentage-point delta against a baseline, or null when there is no baseline. */
export function deltaPct(current: number, baseline: number): number | null {
  if (!baseline) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

/** "27 Aug 2026, Thursday" — the date line under the board title. */
export function longDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  });
}
