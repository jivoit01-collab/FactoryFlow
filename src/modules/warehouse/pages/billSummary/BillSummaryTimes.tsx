import { formatDateTimeShort } from '@/shared/utils';

import { billSummaryEvents, type TimedSheet } from './billSummaryEvents';

/**
 * The sheet's times on one wrapping line — `Sent 05-10-2026 14:02 · Approved
 * 05-10-2026 15:10` — for a row in a list. Renders nothing when there is none.
 */
export function BillSummaryTimes({
  sheet,
  showNames = false,
  className = '',
}: {
  sheet: TimedSheet;
  showNames?: boolean;
  className?: string;
}) {
  const events = billSummaryEvents(sheet);
  if (events.length === 0) return null;
  return (
    <span
      className={`flex flex-wrap gap-x-1 text-xs text-muted-foreground tabular-nums ${className}`}
    >
      {events.map((event, index) => (
        <span key={event.key} className="whitespace-nowrap">
          {index > 0 && <span aria-hidden="true">· </span>}
          {event.label} {formatDateTimeShort(event.at)}
          {showNames && event.by ? ` by ${event.by}` : ''}
        </span>
      ))}
    </span>
  );
}
