import { ACCENTS } from '@/shared/components/dashboard';

/**
 * Constants + formatters for the Blowing dashboard (/dashboards/blowing).
 *
 * The dashboard is a read-only roll-up of the Blowing section under
 * Production — it owns no API of its own and reads the same endpoints the
 * blowing pages use (`@/modules/production/blowing/api`).
 */

/** Stale window for every blowing dashboard query (ms). */
export const BLOWING_DASHBOARD_STALE_TIME = 60_000;

/** Ordered palette (hex) for categorical charts — from the shared accents. */
export const CHART_COLORS: string[] = [
  ACCENTS.blue.hex,
  ACCENTS.emerald.hex,
  ACCENTS.amber.hex,
  ACCENTS.violet.hex,
  ACCENTS.rose.hex,
  ACCENTS.cyan.hex,
  ACCENTS.orange.hex,
  ACCENTS.indigo.hex,
  ACCENTS.pink.hex,
  ACCENTS.teal.hex,
];

/**
 * Targets the dashboard colours KPIs against. Rejection is the only one the
 * blowing data model doesn't already carry a per-spec standard for — specs do
 * hold `std_reject_pct`, but that's per preform and the variance report already
 * grades against it, so this is only the headline traffic-light.
 */
export const BLOWING_BENCHMARKS = {
  /** rejection % of production — lower is better */
  rejectionPct: 2,
} as const;

/** Local-time YYYY-MM-DD (never `toISOString()`, which shifts the day). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local-time YYYY-MM for the current month. */
export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** `YYYY-MM` → `{ year, month }` (month is 1-based). */
export function monthParts(month: string): { year: number; month: number } {
  const [y, m] = month.split('-');
  return { year: Number(y), month: Number(m) };
}

/** `YYYY-MM` → the first and last calendar day of that month. */
export function monthBounds(month: string): { from: string; to: string } {
  const { year, month: m } = monthParts(month);
  const lastDay = new Date(year, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/** A day inside `month` — today when the month is the current one, else the 1st. */
export function defaultDayFor(month: string): string {
  const today = todayISO();
  return today.startsWith(month) ? today : `${month}-01`;
}

/** ₹ abbreviated (Cr / L / K). */
export function money(value: number): string {
  const n = value || 0;
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n.toFixed(n < 100 ? 2 : 0)}`;
}

/**
 * Per-bottle money. Bottle costs live in paise territory (₹1.83 / ₹0.4120),
 * so they get 4 decimals rather than the abbreviated form.
 */
export function perBottle(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `₹${value.toFixed(4)}`;
}

/** Compact integer with Indian grouping. */
export function count(value: number): string {
  return Math.round(value || 0).toLocaleString('en-IN');
}

/** Percentage with a fixed precision. */
export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** Rejection as a share of production, guarded against a zero denominator. */
export function rejectionPct(rejection: number, production: number): number {
  if (!production) return 0;
  return (rejection / production) * 100;
}

/** DRF serialises DecimalFields as strings — coerce for arithmetic. */
export function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** `2026-08-05` → `Aug 05`, for chart axes. */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[Number(m) - 1] ?? m} ${d}`;
}

/** `2026-08` → `August 2026`, for headings. */
export function monthLabel(month: string): string {
  const { year, month: m } = monthParts(month);
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${MONTHS[m - 1] ?? month} ${year}`;
}

/** Tailwind chip classes per live run status (mirrors the blowing section). */
export const LIVE_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300',
  RUNNING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  BREAKDOWN: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  STOPPED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
};

export const LIVE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  RUNNING: 'Running',
  BREAKDOWN: 'Breakdown',
  STOPPED: 'Stopped',
  COMPLETED: 'Completed',
};

/** Shared recharts tooltip styling. */
export const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  fontSize: 12,
} as const;
