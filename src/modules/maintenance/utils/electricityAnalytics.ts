// Roll-ups behind the Electricity Dashboard. Every figure here is derived from
// the readings the register already serves — nothing is re-priced and no rate
// is re-applied, because the row carries the factor and rate that were typed on
// the day, and those are often not the meter master's current ones.

import type { DailyElectricityReading, ElectricityMeter } from '../types';

const num = (value: string | null | undefined) => {
  const parsed = parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface UnitsAndCost {
  units: number;
  cost: number;
}

export interface SupplyGroup extends UnitsAndCost {
  source: string;
  label: string;
  counts: boolean;
  rows: DailyElectricityReading[];
}

export interface MeterRollup extends UnitsAndCost {
  meterId: number;
  name: string;
  location: string;
  companies: string;
  isMain: boolean;
  multiplyingFactor: string;
  ratePerUnit: string;
  lastClosing: string | null;
  /** Readings keyed in the window, against the days the meter was due one. */
  readings: number;
  due: number;
  avgPerReading: number;
  share: number;
  zeroDays: number;
  negativeDays: number;
}

export type FindingLevel = 'critical' | 'warning' | 'info';

export interface Finding {
  level: FindingLevel;
  meter: string;
  title: string;
  detail: string;
}

export function sumReadings(rows: DailyElectricityReading[]): UnitsAndCost {
  let units = 0;
  let cost = 0;
  for (const row of rows) {
    units += num(row.units_consumed);
    cost += num(row.total_cost);
  }
  return { units, cost };
}

/**
 * Splits the window the way the register itself does: the mains are the
 * incoming supply every other meter draws from, so they are never added to the
 * sub-meter total, and a main flagged `counts_as_supply = false` (KVAH
 * measuring the grid's KWH a second way) is read but left out of the supply sum.
 */
export function splitBySupply(readings: DailyElectricityReading[]) {
  const mains = readings.filter((r) => r.meter_is_main);
  const subs = readings.filter((r) => !r.meter_is_main);
  const groups = new Map<string, SupplyGroup>();

  for (const reading of mains) {
    const source = reading.meter_supply_source || 'GRID';
    const key = `${source}:${reading.meter_counts_as_supply ? 'in' : 'out'}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(reading);
      continue;
    }
    groups.set(key, {
      source,
      label: reading.meter_supply_source_display || source,
      counts: reading.meter_counts_as_supply,
      rows: [reading],
      units: 0,
      cost: 0,
    });
  }

  const supplyGroups = [...groups.values()].map((group) => ({
    ...group,
    ...sumReadings(group.rows),
  }));

  return {
    mains,
    subs,
    supplyGroups,
    subTotal: sumReadings(subs),
    supplyTotal: sumReadings(mains.filter((r) => r.meter_counts_as_supply)),
  };
}

/** Distinct dates present in the window, oldest first. */
export function readingDates(readings: DailyElectricityReading[]): string[] {
  return [...new Set(readings.map((r) => r.date))].sort();
}

function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * Per-meter totals for the window. `due` counts only the days from the meter's
 * first reading in the window onward — a meter added mid-month is not short of
 * the days it did not yet exist for.
 */
export function rollupByMeter(
  readings: DailyElectricityReading[],
  meters: ElectricityMeter[],
  window: { from: string; to: string },
): MeterRollup[] {
  const byId = new Map<number, ElectricityMeter>(meters.map((m) => [m.id, m]));
  const grouped = new Map<number, DailyElectricityReading[]>();
  for (const reading of readings) {
    const bucket = grouped.get(reading.meter);
    if (bucket) bucket.push(reading);
    else grouped.set(reading.meter, [reading]);
  }

  const total = sumReadings(readings.filter((r) => !r.meter_is_main)).units;

  return [...grouped.entries()]
    .map(([meterId, rows]) => {
      const meter = byId.get(meterId);
      const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
      const { units, cost } = sumReadings(rows);
      const firstDate = sorted[0]?.date ?? window.from;
      const due = daysBetween(firstDate > window.from ? firstDate : window.from, window.to);
      return {
        meterId,
        name: meter?.name ?? sorted[0]?.meter_name ?? `Meter ${meterId}`,
        location: meter?.location ?? '',
        companies: meter?.companies_display || sorted[0]?.meter_companies_display || '',
        isMain: sorted[0]?.meter_is_main ?? meter?.is_main ?? false,
        multiplyingFactor: meter?.multiplying_factor ?? sorted[0]?.multiplying_factor ?? '1',
        ratePerUnit: meter?.rate_per_unit ?? sorted[0]?.rate_per_unit ?? '0',
        lastClosing: sorted[sorted.length - 1]?.closing_reading ?? null,
        readings: rows.length,
        due,
        units,
        cost,
        avgPerReading: rows.length ? units / rows.length : 0,
        // A main is not part of the sub-meter total, so it has no share of it.
        share: total && !sorted[0]?.meter_is_main ? (units / total) * 100 : 0,
        zeroDays: rows.filter((r) => num(r.units_consumed) === 0).length,
        negativeDays: rows.filter((r) => num(r.units_consumed) < 0).length,
      };
    })
    .sort((a, b) => b.units - a.units);
}

/** One row per date, with a column per meter name, for the trend chart. */
export function dailySeries(readings: DailyElectricityReading[], meterNames: string[]) {
  const dates = readingDates(readings);
  return dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const name of meterNames) row[name] = 0;
    let others = 0;
    for (const reading of readings.filter((r) => r.date === date)) {
      const units = num(reading.units_consumed);
      if (meterNames.includes(reading.meter_name)) {
        row[reading.meter_name] = (row[reading.meter_name] as number) + units;
      } else {
        others += units;
      }
    }
    row.Others = others;
    return row;
  });
}

/**
 * What is wrong with the register itself, read off the rows. These are the
 * mistakes a daily round actually makes: the same dials keyed on two days, a
 * dial that moved while nobody was reading it, a factor typed differently from
 * one day to the next. Each one moves the billed units, so they are reported
 * beside the totals rather than buried.
 */
export function findAnomalies(
  readings: DailyElectricityReading[],
  meters: ElectricityMeter[],
  window: { from: string; to: string },
): Finding[] {
  const rollups = rollupByMeter(readings, meters, window);
  const byId = new Map<number, ElectricityMeter>(meters.map((m) => [m.id, m]));
  const grouped = new Map<number, DailyElectricityReading[]>();
  for (const reading of readings) {
    const bucket = grouped.get(reading.meter);
    if (bucket) bucket.push(reading);
    else grouped.set(reading.meter, [reading]);
  }

  const findings: Finding[] = [];

  for (const [meterId, rows] of grouped) {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const meter = byId.get(meterId);
    const name = meter?.name ?? sorted[0]?.meter_name ?? `Meter ${meterId}`;
    const masterFactor = num(meter?.multiplying_factor ?? '1') || 1;

    for (const row of sorted) {
      if (num(row.units_consumed) < 0) {
        findings.push({
          level: 'critical',
          meter: name,
          title: `${name} ran backwards on ${row.date}`,
          detail: `Closing ${row.closing_reading} is below opening ${row.opening_reading} — ${row.units_consumed} units and ₹${row.total_cost} credited back.`,
        });
      }
    }

    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const sameDials =
        num(curr.opening_reading) === num(prev.opening_reading) &&
        num(curr.closing_reading) === num(prev.closing_reading);

      if (sameDials && num(curr.dial_difference) !== 0) {
        findings.push({
          level: 'critical',
          meter: name,
          title: `${name} keyed twice — ${prev.date} and ${curr.date}`,
          detail: `Both days carry the same dials (${prev.opening_reading} → ${prev.closing_reading}), so ${curr.units_consumed} units are counted a second time.`,
        });
        continue;
      }

      const drift = num(curr.opening_reading) - num(prev.closing_reading);
      if (drift !== 0) {
        findings.push({
          level: 'warning',
          meter: name,
          title: `${name} dial moved between readings`,
          detail: `${prev.date} closed at ${prev.closing_reading}, ${curr.date} opened at ${curr.opening_reading} — ${Math.abs(drift * masterFactor).toLocaleString('en-IN')} units are not on any row.`,
        });
      }
    }

    const factors = [...new Set(sorted.map((r) => num(r.multiplying_factor)))];
    if (factors.length > 1) {
      findings.push({
        level: 'critical',
        meter: name,
        title: `${name} factor changed mid-window`,
        detail: `Keyed as ${factors.map((f) => `×${f}`).join(' and ')} on different days; the master says ×${masterFactor}. The units on the odd days are out by that ratio.`,
      });
    } else if (factors.length === 1 && factors[0] !== masterFactor) {
      findings.push({
        level: 'warning',
        meter: name,
        title: `${name} factor differs from its master`,
        detail: `Readings were priced at ×${factors[0]}, the meter master says ×${masterFactor}.`,
      });
    }

    const rateFlip = sorted.find(
      (row, i) => i > 0 && num(row.rate_per_unit) !== num(sorted[i - 1].rate_per_unit),
    );
    if (rateFlip) {
      findings.push({
        level: 'info',
        meter: name,
        title: `${name} rate moved to ₹${num(rateFlip.rate_per_unit)}`,
        detail: `₹${num(sorted[0].rate_per_unit)}/unit until ${rateFlip.date}, ₹${num(rateFlip.rate_per_unit)}/unit from then on.`,
      });
    }

    const rollup = rollups.find((r) => r.meterId === meterId);
    if (rollup && rollup.readings < rollup.due) {
      const missing = rollup.due - rollup.readings;
      findings.push({
        level: 'warning',
        meter: name,
        title: `${name} missing ${missing} day${missing > 1 ? 's' : ''}`,
        detail: `${rollup.readings} of ${rollup.due} days keyed since it entered the register.`,
      });
    }
    if (rollup && rollup.zeroDays >= 3) {
      findings.push({
        level: 'warning',
        meter: name,
        title: `${name} sat at zero on ${rollup.zeroDays} days`,
        detail:
          'The dial did not move — either the plant was genuinely idle, or the previous reading was carried forward.',
      });
    }
  }

  const order: Record<FindingLevel, number> = { critical: 0, warning: 1, info: 2 };
  return findings.sort((a, b) => order[a.level] - order[b.level]);
}

/**
 * The sub-meters measure slices of what the mains brought in, so their total
 * can never exceed the supply. When it does, a factor or a duplicate row is
 * wrong, and the register is over-billing somebody.
 */
export function reconcileSupply(supply: UnitsAndCost, subs: UnitsAndCost) {
  const gap = subs.units - supply.units;
  return {
    gap,
    gapPct: supply.units ? (gap / supply.units) * 100 : 0,
    overDrawn: supply.units > 0 && gap > 0,
  };
}
