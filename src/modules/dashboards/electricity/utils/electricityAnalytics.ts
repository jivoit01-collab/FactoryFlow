// Roll-ups behind the Electricity Dashboard. Every figure here is derived from
// the readings the register already serves — nothing is re-priced and no rate
// is re-applied, because the row carries the factor and rate that were typed on
// the day, and those are often not the meter master's current ones.

import type { DailyElectricityReading, ElectricityMeter } from '@/modules/maintenance/types';

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

/**
 * How much of a meter's consumption belongs to one company: an equal split
 * across the companies it feeds. The campus incomers and a few sub-meters feed
 * Oil and Beverages both, and nothing in the register says how the load divides
 * between them, so each carries half. A meter on one company's own supply is
 * untouched, and so is every figure while no company is selected.
 */
export function companyShare(meter: ElectricityMeter | undefined, company: string | ''): number {
  const codes = meter?.company_codes ?? [];
  if (!company || codes.length <= 1) return 1;
  // A meter the filter should not have returned is left whole rather than
  // silently zeroed — an unexplained gap is worse than an unsplit meter.
  return codes.some((code) => code === company) ? 1 / codes.length : 1;
}

/**
 * Restates the readings as one company's share of them. Only the money and the
 * units move; the dials do not, because half a dial reading is not a thing and
 * the data-quality checks read the dials.
 */
export function apportionToCompany(
  readings: DailyElectricityReading[],
  meters: ElectricityMeter[],
  company: string | '',
): DailyElectricityReading[] {
  if (!company) return readings;
  const byId = new Map<number, ElectricityMeter>(meters.map((m) => [m.id, m]));

  return readings.map((reading) => {
    const share = companyShare(byId.get(reading.meter), company);
    if (share === 1) return reading;
    return {
      ...reading,
      units_consumed: String(num(reading.units_consumed) * share),
      total_cost: String(num(reading.total_cost) * share),
    };
  });
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
