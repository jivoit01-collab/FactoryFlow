/**
 * Which day's figures are on screen: a date box between the day before and the
 * day after, and Latest to come back to the newest.
 *
 * The server answers a day with the latest one on or before it that has
 * figures, so a Sunday the sheet was not read shows the Saturday; the note
 * under the box says so rather than letting the two look like the same day.
 * The day before and the day after are the days either side the sheet was
 * read (the server's previous_date / next_date), never a blank one.
 */
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button, Input } from '@/shared/components/ui';

import { todayISO } from '../../utils';
import { longDay } from './priceFormat';

export function DayPicker({
  id,
  asked,
  shown,
  previousDate,
  nextDate,
  firstDate,
  lastDate,
  loading,
  fetching,
  noun,
  onPick,
}: {
  id: string;
  /** The day in the address; null is the latest. */
  asked: string | null;
  /** The day the figures are of. */
  shown: string | null;
  previousDate: string | null;
  nextDate: string | null;
  firstDate: string | null;
  lastDate: string | null;
  /** The day asked for is not read yet (what is on screen is the one before). */
  loading: boolean;
  /** A refetch of the day on screen. */
  fetching: boolean;
  /** "prices" or "rates". */
  noun: string;
  onPick: (day: string | null) => void;
}) {
  function pick(day: string | null) {
    if (!day || (lastDate && day >= lastDate)) onPick(null);
    else onPick(day);
  }

  let note: string;
  if (loading) note = `Reading the ${noun}…`;
  else if (!shown)
    note = asked
      ? `No ${noun} are held on or before ${longDay(asked)}.`
      : `No ${noun} have been saved yet.`;
  else if (asked && asked !== shown)
    note = `No ${noun} were read on ${longDay(asked)}: these are of ${longDay(shown)}, the last day before it.`;
  else
    note = `${longDay(shown)}${asked ? '' : ', the latest day held'}, against ${
      previousDate ? longDay(previousDate) : 'nothing: the first day held'
    }.`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="The day before"
          title={previousDate ? `The day before: ${longDay(previousDate)}` : 'The first day held'}
          disabled={!previousDate}
          onClick={() => pick(previousDate)}
        >
          <ChevronLeft />
        </Button>
        <Input
          id={id}
          type="date"
          aria-label={`The day whose ${noun} to show`}
          className="h-9 w-[10.5rem] border-0 px-2 shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
          value={asked ?? shown ?? ''}
          min={firstDate ?? undefined}
          max={todayISO()}
          onChange={(event) => pick(event.target.value || null)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="The day after"
          title={nextDate ? `The day after: ${longDay(nextDate)}` : 'The latest day held'}
          disabled={!nextDate}
          onClick={() => pick(nextDate)}
        >
          <ChevronRight />
        </Button>
      </div>
      {asked && (
        <Button type="button" variant="outline" size="sm" onClick={() => onPick(null)}>
          Latest
        </Button>
      )}
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {(loading || fetching) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {note}
      </p>
    </div>
  );
}
