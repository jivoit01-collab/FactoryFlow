import { shortDate, shortTime } from '../utils/format';

/**
 * An entry's date, with its time on a quiet line underneath.
 *
 * For a table cell, where `23 Sep 2026, 2:05 pm` on one line would widen the
 * column for every row. An entry saved before times were asked for has none,
 * and shows the date alone.
 */
export function EntryWhen({ date, time }: { date: string; time?: string | null }) {
  const at = shortTime(time);
  return (
    <>
      <span className="whitespace-nowrap">{shortDate(date)}</span>
      {at && <span className="block whitespace-nowrap text-xs text-muted-foreground">{at}</span>}
    </>
  );
}
