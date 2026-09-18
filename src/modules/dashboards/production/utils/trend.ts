/**
 * A fortnight of output, ending on the day the board is showing.
 *
 * Two rules the whole strip depends on:
 *
 *  - **Every day in the window gets a bar**, including the ones nothing ran on.
 *    A chart that only plots the days with runs draws a busy fortnight and a
 *    quiet one identically, which is the one comparison it exists to make.
 *  - **The shown day's bar comes from the board, not from this list.** The
 *    tiles read the day's runs live — segments included while a run is open —
 *    and a bar computed from the list's stored totals would sit under tiles
 *    saying something else. Every other day is closed and the two agree.
 */

export interface TrendPoint {
  /** Local YYYY-MM-DD. */
  date: string;
  value: number;
  /** The day the board is on — the bar the tiles below belong to. */
  isShown: boolean;
}

/** Every day from `from` to `to` inclusive, oldest first. */
export function windowDays(from: string, to: string, cap = 31): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days;
  while (cursor <= end && days.length < cap) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function buildTrend<Row extends { date: string }>({
  rows,
  from,
  to,
  valueOf,
  shownValue,
}: {
  /** Every run in the window, from the list endpoint. */
  rows: readonly Row[];
  from: string;
  to: string;
  /** What one run contributes. Zero for a run that produced nothing. */
  valueOf: (row: Row) => number;
  /** The shown day's figure, as the tiles state it. */
  shownValue: number;
}): TrendPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + valueOf(row));
  }

  return windowDays(from, to).map((date) => ({
    date,
    value: date === to ? shownValue : (byDate.get(date) ?? 0),
    isShown: date === to,
  }));
}
