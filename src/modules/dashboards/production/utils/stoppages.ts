/**
 * What stopped a machine, folded by cause.
 *
 * Shared between the filling lines and the blowing machines: the two registers
 * are different tables with the same shape — a category, a typed reason, a
 * span, and a flag for time never made up — and one folding means the two
 * boards can never group the same kind of record two different ways.
 *
 * Grouped on the typed REASON rather than on the breakdown category, because
 * the category is where the information isn't: all 224 production stoppages on
 * record carry one, but only five values exist across them — Machine, Other,
 * PM Short, RM Short, Labour — so a panel grouped that way says "Machine,
 * 6,833 minutes" and sends the reader off to find out which machine and why.
 * The reason is filled just as reliably and is the thing a supervisor acts on:
 * DOWNSTREAM, powercut, capstuck, HDPE. The category rides along as a
 * qualifier.
 *
 * Reasons are typed by hand, so they are matched case- and space-insensitively
 * — "powercut" and "POWERCUT" are one problem, not two — while the spelling
 * shown is the one the floor actually typed first.
 */

/** One cause of lost output, and what it cost in minutes. */
export interface Stoppage {
  /** The reason as typed, or the category where no reason was given. */
  label: string;
  /** The coarse category behind it, where it adds anything to the label. */
  category: string;
  minutes: number;
  /** How many separate stoppages this cause accounts for. */
  count: number;
  /** At least one of them was never made up. */
  unrecovered: boolean;
  /** Which machines it stopped — only meaningful on a plant-wide roll-up. */
  lines: string[];
}

/** The fields a stoppage record must carry, whichever register it came from. */
export interface StoppageRecord {
  breakdown_category_name?: string | null;
  reason?: string | null;
  breakdown_minutes?: number | string | null;
  start_time: string;
  end_time: string | null;
  is_unrecovered?: boolean;
}

const num = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Whole minutes since a stamp, never negative. */
function minutesSince(iso: string, now: number): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 60_000));
}

/** How long one stoppage lasted — measured, not read, while it is still open. */
export function stoppageMinutes(record: StoppageRecord, now: number): number {
  // An unfinished stoppage carries a stale `breakdown_minutes` from whenever it
  // was last saved, so it is measured from its start instead.
  return record.end_time ? num(record.breakdown_minutes) : minutesSince(record.start_time, now);
}

/** Fold one stoppage into a cause map, keyed on its reason. */
export function addStoppage(
  byCause: Map<string, Stoppage>,
  record: StoppageRecord,
  machineName: string,
  now: number,
): void {
  const reason = (record.reason ?? '').trim();
  const category = (record.breakdown_category_name ?? '').trim();
  const label = reason || category || 'Uncategorised';
  const key = label.toLowerCase();
  const minutes = stoppageMinutes(record, now);

  const existing = byCause.get(key);
  if (existing) {
    existing.minutes += minutes;
    existing.count += 1;
    existing.unrecovered = existing.unrecovered || Boolean(record.is_unrecovered);
    if (!existing.lines.includes(machineName)) existing.lines.push(machineName);
    // Several categories under one reason is real — "powercut" is logged as
    // both Machine and Other — and naming one of them would be a coin toss.
    if (existing.category && existing.category !== category) existing.category = '';
  } else {
    byCause.set(key, {
      label,
      // A reason that just repeats its category adds nothing twice.
      category: category && category.toLowerCase() !== key ? category : '',
      minutes,
      count: 1,
      unrecovered: Boolean(record.is_unrecovered),
      lines: [machineName],
    });
  }
}

/** Worst cause first. */
export function rankStoppages(byCause: Map<string, Stoppage>): Stoppage[] {
  return [...byCause.values()].sort((a, b) => b.minutes - a.minutes);
}
