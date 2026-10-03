/**
 * The report's arithmetic: days in, totals, breakdowns and per-litre cost out.
 *
 * The server sends days and nothing added up (`operations_report/services.py`),
 * so these are the only definitions of the totals there are — what a litre's
 * cost includes, what a month's head count averages over — and a test pins
 * each of them.
 *
 * NULL MEANS NOT KNOWN, AND SURVIVES THE ADDITION. A section the reader may not
 * see, or that could not be read, is null on every day, and its totals are null
 * — never zero. Labour with no rate in force is null too: a wage bill missing a
 * day is not a wage bill. A day nobody read the meters is the one gap that is
 * summed past, and counted, because a month of electricity should not vanish
 * over one unread Sunday.
 */

import type {
  LabourEntry,
  LineOutput,
  OperationsReport,
  PerLitreCost,
  PowerEntry,
  ReportDay,
  ReportDaySummary,
  ReportMeta,
  ReportPeriod,
  ReportTotals,
  ReturnEntry,
  WastageEntry,
} from '../types';
import { comparisonSpan, daysBetween, trendSpan } from './period';

const sum = <T>(rows: readonly T[], pick: (row: T) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

/** A rupee figure over litres; null when either side is unknown or nothing was filled. */
const perLitre = (rupees: number | null, litres: number | null): number | null =>
  rupees !== null && litres !== null && litres > 0 ? rupees / litres : null;

/** Every day's rows of one section, or null if any day's section was not read. */
function rowsOf<T>(days: readonly ReportDay[], pick: (day: ReportDay) => T[] | null): T[] | null {
  const rows: T[] = [];
  for (const day of days) {
    const section = pick(day);
    if (section === null) return null;
    rows.push(...section);
  }
  return rows;
}

/** A day with nothing in it — what a day outside the fetched span reads as. */
export function emptyDay(date: string): ReportDay {
  return { date, lines: null, wastage: null, labour: null, power: null, returns: null };
}

/**
 * The headline figures for a run of days.
 *
 * - Litres are what the runs with known volumes filled.
 * - Heads are averaged over the days; man-days and money are summed.
 * - A litre's cost is labour, power and priced packing waste, over litres
 *   filled. Null if any head is unknown, so the total never quietly drops a part.
 */
export function totalsOf(days: readonly ReportDay[]): ReportTotals {
  const lines = rowsOf(days, (day) => day.lines);
  const wastage = rowsOf(days, (day) => day.wastage);
  const labour = rowsOf(days, (day) => day.labour);
  const returns = rowsOf(days, (day) => day.returns ?? null);

  const readPower = days.filter((day) => day.power !== null);
  const power = readPower.length > 0 ? readPower.flatMap((day) => day.power ?? []) : null;

  const litres =
    lines && lines.every((line) => line.litres !== null)
      ? sum(lines, (line) => line.litres ?? 0)
      : null;
  const wastageValue = wastage ? sum(wastage, (entry) => entry.value) : null;
  const labourCost =
    labour && labour.every((entry) => entry.cost !== null)
      ? sum(labour, (entry) => entry.cost ?? 0)
      : null;
  const manDays = labour ? sum(labour, (entry) => entry.heads) : null;
  const kwh = power ? sum(power, (entry) => entry.kwh) : null;
  const powerCost = power ? sum(power, (entry) => entry.cost) : null;

  const labourPerLitre = perLitre(labourCost, litres);
  const powerPerLitre = perLitre(powerCost, litres);
  const wastagePerLitre = perLitre(wastageValue, litres);
  const cost: PerLitreCost = {
    labour: labourPerLitre,
    power: powerPerLitre,
    wastage: wastagePerLitre,
    total:
      labourPerLitre !== null && powerPerLitre !== null && wastagePerLitre !== null
        ? labourPerLitre + powerPerLitre + wastagePerLitre
        : null,
  };

  return {
    days: days.length,
    litres,
    cases: lines ? sum(lines, (line) => line.cases) : null,
    runs: lines ? sum(lines, (line) => line.runs) : null,
    wastageValue,
    wastageUnpriced: wastage ? sum(wastage, (entry) => entry.unpriced) : 0,
    heads: manDays !== null && days.length > 0 ? manDays / days.length : null,
    manDays,
    labourCost,
    kwh,
    powerCost,
    powerUnreadDays: power === null ? 0 : days.length - readPower.length,
    litresUnknownDays: days.filter((day) => day.lines?.some((line) => line.litres === null)).length,
    labourUncostedDays: days.filter((day) => day.labour?.some((entry) => entry.cost === null))
      .length,
    kwhPerKl: kwh !== null && litres !== null && litres > 0 ? kwh / (litres / 1000) : null,
    perLitre: cost,
    // A return with lines in two conditions is one return, so they are counted
    // by GR number rather than added up per row.
    grReturns: returns ? new Set(returns.flatMap((entry) => entry.entries)).size : null,
    grQuantity: returns ? sum(returns, (entry) => entry.quantity) : null,
    grValue: returns ? sum(returns, (entry) => entry.value) : null,
    grSpoiledQuantity: returns
      ? sum(
          returns.filter((entry) => entry.condition !== 'GOOD'),
          (entry) => entry.quantity,
        )
      : null,
    grUnpriced: returns ? sum(returns, (entry) => entry.unpriced) : 0,
  };
}

/** A return's conditions, worst first — the server's order for a day. */
const RETURN_ORDER: readonly ReturnEntry['condition'][] = [
  'LEAKED',
  'DAMAGED',
  'EXPIRED',
  'OTHER',
  'GOOD',
];

/** Rows with the same key added together, biggest first by `size`. */
function mergeBy<T>(
  rows: readonly T[],
  key: (row: T) => string,
  add: (into: T, row: T) => T,
  size: (row: T) => number,
): T[] {
  const merged = new Map<string, T>();
  for (const row of rows) {
    const existing = merged.get(key(row));
    merged.set(key(row), existing ? add(existing, row) : { ...row });
  }
  return [...merged.values()].sort((a, b) => size(b) - size(a));
}

/** The four breakdowns, added up over the days. People stay a daily average. */
export function breakdownOf(days: readonly ReportDay[]): OperationsReport['breakdown'] {
  const dayCount = Math.max(days.length, 1);
  const lines = rowsOf(days, (day) => day.lines);
  const wastage = rowsOf(days, (day) => day.wastage);
  const labour = rowsOf(days, (day) => day.labour);
  const readPower = days.filter((day) => day.power !== null);
  const returns = rowsOf(days, (day) => day.returns ?? null);

  return {
    lines:
      lines &&
      mergeBy<LineOutput>(
        lines,
        (row) => row.line,
        (into, row) => ({
          ...into,
          runs: into.runs + row.runs,
          cases: into.cases + row.cases,
          litres: into.litres !== null && row.litres !== null ? into.litres + row.litres : null,
        }),
        (row) => row.litres ?? 0,
      ),
    wastage:
      wastage &&
      mergeBy<WastageEntry>(
        wastage,
        (row) => `${row.item}|${row.unit}`,
        (into, row) => ({
          ...into,
          quantity: into.quantity + row.quantity,
          value: into.value + row.value,
          unpriced: into.unpriced + row.unpriced,
        }),
        (row) => row.value,
      ),
    labour:
      labour &&
      mergeBy<LabourEntry>(
        labour,
        (row) => row.group,
        (into, row) => ({
          ...into,
          heads: into.heads + row.heads,
          day_shift: into.day_shift + row.day_shift,
          night_shift: into.night_shift + row.night_shift,
          cost: into.cost !== null && row.cost !== null ? into.cost + row.cost : null,
        }),
        (row) => row.heads,
      ).map((row) => ({
        ...row,
        heads: row.heads / dayCount,
        day_shift: row.day_shift / dayCount,
        night_shift: row.night_shift / dayCount,
      })),
    power:
      readPower.length === 0
        ? null
        : mergeBy<PowerEntry>(
            readPower.flatMap((day) => day.power ?? []),
            (row) => row.area,
            (into, row) => ({ ...into, kwh: into.kwh + row.kwh, cost: into.cost + row.cost }),
            (row) => row.kwh,
          ),
    returns:
      returns &&
      mergeBy<ReturnEntry>(
        returns,
        (row) => row.condition,
        (into, row) => ({
          ...into,
          entries: [...new Set([...into.entries, ...row.entries])].sort(),
          lines: into.lines + row.lines,
          quantity: into.quantity + row.quantity,
          value: into.value + row.value,
          unpriced: into.unpriced + row.unpriced,
        }),
        // Worst first, as the server sends a day: the part that cost money leads.
        (row) => -RETURN_ORDER.indexOf(row.condition),
      ),
  };
}

/**
 * The span one read must cover for a period: the comparison, the trend and the
 * period itself. One read rather than three, because the meter allocation
 * behind electricity is worked out a span at a time and is the slow part.
 */
export function fetchSpan(period: ReportPeriod): { from: string; to: string } {
  const comparison = comparisonSpan(period);
  const trend = trendSpan(period);
  const from = [period.from, comparison.from, trend.from].sort()[0];
  const to = [period.to, comparison.to, trend.to].sort().reverse()[0];
  return { from, to };
}

/** The whole report for a period, from the days the server sent. */
export function buildReport(
  period: ReportPeriod,
  response: {
    company: { code: string; name: string };
    days: readonly ReportDay[];
    meta: ReportMeta;
  },
): OperationsReport {
  const byDate = new Map(response.days.map((day) => [day.date, day]));
  const readDay = (date: string) => byDate.get(date) ?? emptyDay(date);

  const days = daysBetween(period.from, period.to).map(readDay);
  const comparison = comparisonSpan(period);
  const trend = trendSpan(period);

  const daily: ReportDaySummary[] = daysBetween(trend.from, trend.to).map((date) => ({
    date,
    ...totalsOf([readDay(date)]),
  }));

  return {
    view: period.view,
    from: period.from,
    to: period.to,
    company: response.company,
    totals: totalsOf(days),
    previous: totalsOf(daysBetween(comparison.from, comparison.to).map(readDay)),
    previousLabel: comparison.label,
    breakdown: breakdownOf(days),
    daily,
    meta: response.meta,
  };
}
