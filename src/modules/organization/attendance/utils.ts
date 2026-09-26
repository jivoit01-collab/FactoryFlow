/**
 * Pure helpers for the daily sheet.
 *
 * The rule worth isolating here is `rowMatches`: **the status filter follows
 * whichever view is on.** With corrections hidden, filtering by "Absent" has to
 * mean *the machine said absent*, because the tiles above the table are
 * counting the machine's readings too. If the filter read the effective status
 * while the tiles counted the machine's, a day with corrections would show
 * "Absent 69" above a table holding 68 rows, and nobody could tell which number
 * was lying.
 */
import type { AttendanceStatusValue, AttendanceSummary, DailyAttendanceRow } from './api/attendance.api';

export interface SheetView {
  search: string;
  statusFilter: AttendanceStatusValue | '';
  /** false = punch-machine data only, the page default. */
  showCorrections: boolean;
}

/** The status this row is judged by, given which view is on. */
export function statusInView(
  row: Pick<DailyAttendanceRow, 'machine_status' | 'effective_status'>,
  showCorrections: boolean,
): AttendanceStatusValue {
  return showCorrections ? row.effective_status : row.machine_status;
}

export function rowMatches(
  row: Pick<
    DailyAttendanceRow,
    'employee_name' | 'employee_code' | 'machine_status' | 'effective_status'
  >,
  view: SheetView,
): boolean {
  const needle = view.search.trim().toLowerCase();
  if (needle) {
    const haystack = `${row.employee_name} ${row.employee_code}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (!view.statusFilter) return true;
  return statusInView(row, view.showCorrections) === view.statusFilter;
}

/** The counts the tiles show — the same side of the row the filter reads. */
export function countsInView(
  summary: AttendanceSummary | undefined,
  showCorrections: boolean,
): Partial<Record<AttendanceStatusValue, number>> {
  if (!summary) return {};
  return showCorrections ? summary.effective : summary.machine;
}

/** Today in the browser's own timezone — never the UTC date, which is a day off after 18:30 IST. */
export function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

// ===== The monthly register =====

/**
 * The single letter a register cell shows.
 *
 * One column per day across thirty-one days leaves room for exactly one
 * character, so the grid draws a letter and the legend carries the words. The
 * letters are derived here rather than hardcoded per cell so that a status
 * added to the backend's vocabulary shows up as its own initial instead of
 * silently reading as something else.
 */
const CELL_LETTERS: Record<string, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  HALF_DAY: 'H',
  MISSING_PUNCH: 'M',
  WEEKLY_OFF: 'W',
  ON_LEAVE: 'L',
  ON_DUTY: 'D',
  HOLIDAY: 'O',
};

export function cellLetter(status: string): string {
  return CELL_LETTERS[status] ?? status.charAt(0);
}

/**
 * What a register cell is, from the three shapes the API can send.
 *
 * `missing` is the one that matters: a day nobody has synced is NOT an
 * absence, and drawing it as one would invent a fortnight of absences for the
 * whole plant every time the sync stops. `outside` is a day that was never this
 * person's — before they joined, after they left — and is simply blank.
 */
export type CellKind = 'synced' | 'missing' | 'outside';

export function cellKind(days: Record<string, unknown>, day: number): CellKind {
  const key = String(day);
  if (!(key in days)) return 'outside';
  return days[key] === null ? 'missing' : 'synced';
}

/** The month a register opens on: the current one, in the browser's timezone. */
export function currentMonth(): string {
  return todayLocal().slice(0, 7);
}

/** `"2026-09"` -> `"September 2026"`. */
export function monthLabel(month: string): string {
  const [year, index] = month.split('-').map(Number);
  if (!year || !index) return month;
  return new Date(year, index - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** Hand a fetched file to the browser as a download. The one non-pure helper here. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
