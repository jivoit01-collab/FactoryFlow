import { BOARD_FEED_PERMISSIONS, DASHBOARDS_PERMISSIONS } from '@/config/permissions';

import type { ExpenseColumnKey, ExpenseSpanKey } from '../types';

/**
 * Who may open the board.
 *
 * The same pair the Factory Expense wall uses, because this screen reads the
 * same registers through the same server-side permission class — it is that
 * board rearranged, not a new disclosure. No new right is created: one would
 * have to be added to the live database and granted to groups before anybody
 * could open the screen, which is the shortcut the Packing Material and
 * Logistics Control boards already set.
 *
 * THE FEED RIGHTS COME FIRST, AND THE OPERATIONAL ONES STAY.
 * The `BOARD_FEED_PERMISSIONS` entries are what a dashboard-only login holds:
 * they open this composed board on the server and reach no operational
 * endpoint, so granting them puts nothing in the sidebar. The rights below them
 * are the ones today's readers already hold, kept so nobody's access narrows —
 * the same OR the API makes in `may_read`. Removing one would lock out a user
 * who can read this board today.
 */
export const COMPANY_EXPENSE_VIEW_PERMISSIONS: readonly string[] = [
  BOARD_FEED_PERMISSIONS.FACTORY_EXPENSE,
  DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
  DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
];

/** How long a fetched grid stays fresh before a background refetch. */
export const MATRIX_STALE_TIME = 60_000;

/** Poll interval until the server's own `refresh_seconds` arrives. */
export const DEFAULT_REFRESH_MS = 120_000;

/**
 * The spans the board can show, and which one it opens on.
 *
 * Month-to-date is the default rather than today, and that is a data decision
 * rather than a taste one: the Daily Electricity register is entered in
 * batches — 13 distinct dates across the last 45 days — so a single-day grid is
 * mostly empty squares on most days, and a board that is usually blank gets
 * ignored. The month always has something in every column that has a source.
 */
export const EXPENSE_SPANS: { key: ExpenseSpanKey; label: string; days: number | 'month' }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: 'week', label: '7 days', days: 7 },
  { key: 'month', label: 'This month', days: 'month' },
];

export const DEFAULT_SPAN: ExpenseSpanKey = 'month';

/**
 * A hue per column, and nothing else carries colour.
 *
 * The grid is read down a column far more often than across a row — "what is
 * power costing us" is the question, "what is Beverages costing us" comes
 * second — so the column is what gets an identity. Rows are told apart by
 * weight and position instead.
 *
 * Deliberately a different family from Logistics Control, which owns teal,
 * blue and violet: two boards on two screens in the same room have to be
 * distinguishable from the doorway, before any number is legible.
 */
export const COLUMN_ACCENT: Record<ExpenseColumnKey, string> = {
  SALARY: 'salary',
  ELECTRICITY: 'power',
  MAINTENANCE: 'repair',
  LABOUR: 'gate',
};

/**
 * What each column actually measures, for the header's second line.
 *
 * On a wall board this is the difference between a figure people trust and one
 * they argue about: "Salary" alone invites the reader to assume it came from
 * payroll, which it did not.
 */
export const COLUMN_SOURCE: Record<ExpenseColumnKey, string> = {
  SALARY: 'Cost Master monthly rates, accrued per day',
  // The mains (KWH, KVAH, LP-196) sit in the Shared row by the user's choice.
  // They measure the whole supply the other meters break down, so the column
  // knowingly counts the same electricity about three times — said plainly here
  // and in a board warning, rather than left for a reader to discover.
  ELECTRICITY: 'Daily Electricity register · mains counted in Shared',
  MAINTENANCE: 'Spares issued + committed indents',
  // "By department" is the important half. The register's own company field
  // says Oil on every department row, Warehouse Gupta included, so a reader who
  // assumed the gate decided the company would mistrust the Mart figure.
  LABOUR: 'Gate headcount by department × contract rate',
};

/** The server's key for the row that belongs to the campus, not a company. */
export const SHARED_ROW_KEY = '__shared__';
