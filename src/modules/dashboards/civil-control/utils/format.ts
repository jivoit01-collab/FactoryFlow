/**
 * The civil board's own formatting — and, deliberately, only its own.
 *
 * THE RUPEE AND PERCENTAGE FORMATTERS ARE NOT REDEFINED HERE. They are
 * re-exported from the admin board, which already decided where a figure
 * switches from rupees to lakhs to crores and that a figure with no source
 * renders as a rule rather than a zero. Two boards hanging in one room with two
 * answers for "₹1.5 Cr" is a worse outcome than one import across module
 * folders, and a copy is how that drift starts.
 *
 * What is new below is what this board measures that no other does: floor area,
 * a calendar, and how far the work has fallen behind it.
 */

export {
  barPct,
  money,
  moneyParts,
  NO_VALUE,
  num,
  pct,
  pctRough,
  whole,
} from '../../admin-control/utils';

import { NO_VALUE, num } from '../../admin-control/utils';

/**
 * Covered area, at the scale a site office says it out loud.
 *
 * Thousands above ten thousand — "40 K sq ft" is how the whiteboard this
 * screen came from wrote it, and rounding there loses nothing anyone acts on.
 * Below that the full figure, because 6,500 said as "7 K" is a shed's worth of
 * error on a small building.
 */
export function sqft(value: number | null | undefined): string {
  const n = num(value);
  if (n === null) return NO_VALUE;
  if (n >= 10_000) return `${Math.round(n / 1_000)} K sq ft`;
  return `${Math.round(n).toLocaleString('en-IN')} sq ft`;
}

/** "Apr 2026" — a month and a year, which is the precision a capex date has. */
export function monthYear(iso: string | null | undefined): string {
  const date = parseIso(iso);
  if (!date) return NO_VALUE;
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** An ISO date at midnight local, or null if it will not parse. */
export function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * How much of the programme has gone, 0 to 100 — or null if the dates will not
 * support the question.
 *
 * Clamped at both ends. Before the start it is 0 rather than a negative, and
 * past the end it is 100 rather than 140: the overrun is reported in words by
 * `remainingLabel`, and a bar that ran off its own track would say it twice
 * while fitting neither.
 */
export function elapsedPct(
  start: string | null | undefined,
  end: string | null | undefined,
  today = new Date(),
): number | null {
  const from = parseIso(start);
  const to = parseIso(end);
  if (!from || !to) return null;
  const span = to.getTime() - from.getTime();
  if (span <= 0) return null;
  const gone = today.getTime() - from.getTime();
  return Math.max(0, Math.min(100, (gone / span) * 100));
}

/**
 * What the calendar has left to say — "4 months left", "3 weeks over".
 *
 * Months above eight weeks, weeks below, because that is where a site changes
 * the unit it plans in: a job eleven weeks out is scheduled by the month and
 * one three weeks out by the week. Overrun is stated as overrun rather than as
 * a negative, since a minus sign in front of a duration is read as neither.
 */
export function remainingLabel(
  end: string | null | undefined,
  today = new Date(),
): string | null {
  const to = parseIso(end);
  if (!to) return null;
  const days = Math.round((to.getTime() - today.getTime()) / 86_400_000);
  const over = days < 0;
  const magnitude = Math.abs(days);
  const unit =
    magnitude >= 56
      ? `${Math.round(magnitude / 30)} months`
      : magnitude >= 7
        ? `${Math.round(magnitude / 7)} weeks`
        : `${magnitude} days`;
  if (magnitude === 0) return 'due today';
  return over ? `${unit} over` : `${unit} left`;
}

/**
 * Has the project slipped, and by how much.
 *
 * THE COMPARISON IS WORK AGAINST TIME, NEVER WORK AGAINST MONEY. A project is
 * not behind because it is at 38%; it is behind because it is at 38% of the
 * work with 52% of the time gone. Money cannot stand in for either half — an
 * advance against steel is a fifth of the bill and none of the building.
 *
 * `slip` is in percentage points, positive when the calendar is ahead of the
 * work. Null where either half is unknown, which the caller must render as "not
 * certified" rather than as on-programme: a project nobody has measured is not
 * a project going well.
 */
export interface CivilSlip {
  slip: number | null;
  tone: 'ok' | 'warn' | 'bad' | 'nil';
}

export function slipAgainstCalendar(
  progressPct: number | null | undefined,
  elapsed: number | null | undefined,
  warnPct: number,
  badPct: number,
): CivilSlip {
  const progress = num(progressPct);
  const gone = num(elapsed);
  if (progress === null || gone === null) return { slip: null, tone: 'nil' };
  const slip = gone - progress;
  if (slip >= badPct) return { slip, tone: 'bad' };
  if (slip >= warnPct) return { slip, tone: 'warn' };
  return { slip, tone: 'ok' };
}
