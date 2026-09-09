import type { PackingMaterialBasis, PackingMaterialSource, PmPeriod } from '../types';

// ============================================================================
// Query config
// ============================================================================

/**
 * Stock is a live snapshot and the two lists are a month of movements. Neither
 * changes minute to minute, and every one of the three costs a HANA read.
 */
export const PACKING_MATERIAL_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const PACKING_MATERIAL_TOP_OPTIONS = [
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
] as const;

export const DEFAULT_TOP_N = 10;

// ============================================================================
// The dispatch source toggle
// ============================================================================

/**
 * Two registers, both true, and they do not cover the same set of bills: 396
 * of the 603 invoices SAP raised in August 2026 had a FactoryFlow docking
 * behind them. The hint under each option is there so nobody reads the gap as
 * one of the two being broken.
 */
export const PACKING_MATERIAL_SOURCES: {
  value: PackingMaterialSource;
  label: string;
  hint: string;
}[] = [
  { value: 'sap', label: 'SAP bills', hint: 'A/R invoices, net of credit notes' },
  { value: 'app', label: 'Gate-out bills', hint: 'Bills that left through docking' },
];

/**
 * What the dispatch column is, per source. Labelling a gate-out figure
 * "invoiced" — or the reverse — is the most misleading thing this board could
 * do, so the wording is driven off the basis the API reports rather than off
 * the toggle the user clicked.
 */
export const DISPATCH_BASIS_LABELS: Record<PackingMaterialBasis, string> = {
  issued: 'Issued to the line',
  invoiced: 'Invoiced out',
  'gated-out': 'Gone out through the gate',
};

// ============================================================================
// The period
// ============================================================================

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The month a date falls in, first to last day.
 *
 * Built in UTC throughout. A local-time month boundary shifts by the offset
 * and can hand the API the 31st of the month before, which silently reports
 * the wrong month rather than failing.
 */
export function monthRange(anchor: Date): PmPeriod {
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  return { date_from: toIsoDate(start), date_to: toIsoDate(end) };
}

/** The same month, shifted. Day 1 so a 31-day month cannot skip February. */
export function shiftMonth(anchor: Date, months: number): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, 1));
}

/** The first of the month a `YYYY-MM` value names, as a UTC date. */
export function monthAnchor(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, 1));
}

/** A month as `YYYY-MM`, which is what `<input type="month">` speaks. */
export function monthValue(anchor: Date): string {
  return `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function monthLabel(anchor: Date): string {
  return MONTH_LABEL.format(anchor);
}
