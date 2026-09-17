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
