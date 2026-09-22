import { describe, expect, it } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';
import type { DailyElectricityReading, ElectricityMeter } from '@/modules/maintenance/types';

import {
  apportionToCompany,
  companyShare,
  dailySeries,
  findAnomalies,
  reconcileSupply,
  rollupByMeter,
  splitBySupply,
  sumReadings,
} from '../electricity/utils/electricityAnalytics';

const WINDOW = { from: '2026-09-01', to: '2026-09-04' };

function meter(
  overrides: Partial<ElectricityMeter> & { id: number; name: string },
): ElectricityMeter {
  return {
    meter_number: '',
    location: 'Near Boiler',
    company_codes: [],
    companies_display: 'Jivo Beverages',
    is_main: false,
    supply_source: '',
    supply_source_display: '',
    counts_as_supply: true,
    rate_per_unit: '7.0000',
    multiplying_factor: '1.0000',
    last_reading_date: null,
    last_closing_reading: null,
    readings_count: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as ElectricityMeter;
}

function reading(
  overrides: Partial<DailyElectricityReading> & { meter: number; date: string },
): DailyElectricityReading {
  return {
    id: Math.random(),
    meter_name: 'Boiler',
    meter_is_main: false,
    meter_supply_source: '',
    meter_supply_source_display: '',
    meter_counts_as_supply: true,
    meter_companies_display: 'Jivo Beverages',
    opening_reading: '100.00',
    closing_reading: '110.00',
    dial_difference: '10.00',
    multiplying_factor: '1.0000',
    units_consumed: '10.00',
    rate_per_unit: '7.0000',
    total_cost: '70.00',
    remarks: '',
    created_by: 1,
    created_by_name: 'Atul',
    created_at: '',
    updated_at: '',
    ...overrides,
  } as DailyElectricityReading;
}

describe('splitBySupply', () => {
  it('keeps the mains out of the sub-meter total and drops duplicate mains from supply', () => {
    const rows = [
      reading({
        meter: 1,
        date: '2026-09-01',
        meter_name: 'KWH',
        meter_is_main: true,
        meter_supply_source: 'GRID',
        meter_supply_source_display: 'Grid',
        units_consumed: '1000.00',
        total_cost: '7000.00',
      }),
      // KVAH measures the same grid a second way — read, never added.
      reading({
        meter: 2,
        date: '2026-09-01',
        meter_name: 'KVAH',
        meter_is_main: true,
        meter_counts_as_supply: false,
        meter_supply_source: 'GRID',
        meter_supply_source_display: 'Grid',
        units_consumed: '1100.00',
        total_cost: '7700.00',
      }),
      reading({ meter: 3, date: '2026-09-01', units_consumed: '400.00', total_cost: '2800.00' }),
    ];

    const split = splitBySupply(rows);

    expect(split.subTotal.units).toBe(400);
    expect(split.supplyTotal.units).toBe(1000);
    expect(split.supplyGroups).toHaveLength(2);
    expect(split.supplyGroups.find((g) => !g.counts)?.units).toBe(1100);
  });
});

describe('rollupByMeter', () => {
  it('totals each meter and only counts the days since its first reading', () => {
    const meters = [meter({ id: 3, name: 'Boiler' }), meter({ id: 4, name: 'Ro meter' })];
    const rows = [
      reading({ meter: 3, date: '2026-09-01', units_consumed: '10.00', total_cost: '70.00' }),
      reading({ meter: 3, date: '2026-09-02', units_consumed: '30.00', total_cost: '210.00' }),
      // Added to the register on the 3rd, so it is not short of the 1st and 2nd.
      reading({
        meter: 4,
        date: '2026-09-03',
        meter_name: 'Ro meter',
        units_consumed: '60.00',
        total_cost: '540.00',
      }),
    ];

    const rollups = rollupByMeter(rows, meters, WINDOW);
    const boiler = rollups.find((r) => r.meterId === 3)!;
    const ro = rollups.find((r) => r.meterId === 4)!;

    expect(boiler.units).toBe(40);
    expect(boiler.cost).toBe(280);
    expect(boiler.due).toBe(4);
    expect(boiler.readings).toBe(2);
    expect(ro.due).toBe(2);
    expect(ro.share).toBeCloseTo(60);
    expect(rollups[0].meterId).toBe(4); // sorted by units, biggest first
  });
});

describe('dailySeries', () => {
  it('names the meters asked for and folds the rest into Others', () => {
    const rows = [
      reading({ meter: 3, date: '2026-09-01', units_consumed: '10.00' }),
      reading({ meter: 4, date: '2026-09-01', meter_name: 'Terrace', units_consumed: '25.00' }),
      reading({ meter: 5, date: '2026-09-01', meter_name: 'ETP', units_consumed: '5.00' }),
    ];

    const series = dailySeries(rows, ['Boiler', 'Terrace']);

    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ date: '2026-09-01', Boiler: 10, Terrace: 25, Others: 5 });
  });
});

describe('findAnomalies', () => {
  const boiler = meter({ id: 3, name: 'Boiler', multiplying_factor: '20.0000' });

  it('flags the same dials keyed on two days as a double count', () => {
    const rows = [
      reading({
        meter: 3,
        date: '2026-09-01',
        multiplying_factor: '20.0000',
        opening_reading: '446.00',
        closing_reading: '449.00',
        dial_difference: '3.00',
        units_consumed: '60.00',
      }),
      reading({
        meter: 3,
        date: '2026-09-02',
        multiplying_factor: '20.0000',
        opening_reading: '446.00',
        closing_reading: '449.00',
        dial_difference: '3.00',
        units_consumed: '60.00',
      }),
    ];

    const findings = findAnomalies(rows, [boiler], WINDOW);

    expect(findings[0].level).toBe('critical');
    expect(findings[0].title).toContain('keyed twice');
    expect(findings[0].detail).toContain('60.00 units are counted a second time');
  });

  it('flags a dial that moved between two readings, priced at the master factor', () => {
    const rows = [
      reading({
        meter: 3,
        date: '2026-09-01',
        multiplying_factor: '20.0000',
        opening_reading: '100.00',
        closing_reading: '110.00',
      }),
      reading({
        meter: 3,
        date: '2026-09-02',
        multiplying_factor: '20.0000',
        opening_reading: '115.00',
        closing_reading: '120.00',
      }),
    ];

    const gap = findAnomalies(rows, [boiler], WINDOW).find((f) => f.title.includes('dial moved'));

    expect(gap?.level).toBe('warning');
    expect(gap?.detail).toContain('100'); // 5 dials × ×20
  });

  it('flags a factor typed differently from one day to the next', () => {
    const rows = [
      reading({ meter: 3, date: '2026-09-01', multiplying_factor: '1.0000' }),
      reading({
        meter: 3,
        date: '2026-09-02',
        multiplying_factor: '20.0000',
        opening_reading: '110.00',
        closing_reading: '120.00',
      }),
    ];

    const factor = findAnomalies(rows, [boiler], WINDOW).find((f) => f.title.includes('factor'));

    expect(factor?.level).toBe('critical');
    expect(factor?.detail).toContain('×1');
    expect(factor?.detail).toContain('×20');
  });

  it('reports a rate change as information, not a fault', () => {
    const rows = [
      reading({
        meter: 3,
        date: '2026-09-01',
        multiplying_factor: '20.0000',
        rate_per_unit: '7.0000',
      }),
      reading({
        meter: 3,
        date: '2026-09-02',
        multiplying_factor: '20.0000',
        rate_per_unit: '9.0000',
        opening_reading: '110.00',
        closing_reading: '120.00',
      }),
    ];

    const rate = findAnomalies(rows, [boiler], WINDOW).find((f) => f.title.includes('rate moved'));

    expect(rate?.level).toBe('info');
    expect(rate?.title).toContain('₹9');
  });

  it('counts the days a meter was due but never keyed', () => {
    const rows = [reading({ meter: 3, date: '2026-09-01', multiplying_factor: '20.0000' })];

    const missing = findAnomalies(rows, [boiler], WINDOW).find((f) => f.title.includes('missing'));

    expect(missing?.title).toContain('missing 3 days');
  });
});

describe('reconcileSupply', () => {
  it('calls out sub-meters that add up to more than the supply', () => {
    const result = reconcileSupply({ units: 100, cost: 700 }, { units: 130, cost: 910 });

    expect(result.overDrawn).toBe(true);
    expect(result.gap).toBe(30);
    expect(result.gapPct).toBeCloseTo(30);
  });

  it('stays quiet when the slices fit inside the supply', () => {
    expect(reconcileSupply({ units: 100, cost: 700 }, { units: 80, cost: 560 }).overDrawn).toBe(
      false,
    );
  });
});

describe('companyShare', () => {
  const shared = meter({
    id: 11,
    name: 'KWH',
    company_codes: [COMPANY_CODES.JIVO_OIL, COMPANY_CODES.JIVO_BEVERAGES],
  });
  const beverages = meter({ id: 8, name: 'Boiler', company_codes: [COMPANY_CODES.JIVO_BEVERAGES] });

  it('halves a meter that feeds both plants', () => {
    expect(companyShare(shared, COMPANY_CODES.JIVO_BEVERAGES)).toBe(0.5);
    expect(companyShare(shared, COMPANY_CODES.JIVO_OIL)).toBe(0.5);
  });

  it('leaves a meter on one plant’s own supply whole', () => {
    expect(companyShare(beverages, COMPANY_CODES.JIVO_BEVERAGES)).toBe(1);
  });

  it('leaves every meter whole while no company is chosen', () => {
    expect(companyShare(shared, '')).toBe(1);
  });
});

describe('apportionToCompany', () => {
  const meters = [
    meter({
      id: 11,
      name: 'KWH',
      company_codes: [COMPANY_CODES.JIVO_OIL, COMPANY_CODES.JIVO_BEVERAGES],
    }),
    meter({ id: 8, name: 'Boiler', company_codes: [COMPANY_CODES.JIVO_BEVERAGES] }),
  ];
  const rows = [
    reading({
      meter: 11,
      date: '2026-09-01',
      meter_name: 'KWH',
      units_consumed: '1000.00',
      total_cost: '7000.00',
      opening_reading: '500.00',
      closing_reading: '600.00',
    }),
    reading({
      meter: 8,
      date: '2026-09-01',
      units_consumed: '400.00',
      total_cost: '2800.00',
    }),
  ];

  it('gives the company half of a meter it shares and all of its own', () => {
    const [kwh, boiler] = apportionToCompany(rows, meters, COMPANY_CODES.JIVO_BEVERAGES);

    expect(parseFloat(kwh.units_consumed)).toBe(500);
    expect(parseFloat(kwh.total_cost)).toBe(3500);
    expect(parseFloat(boiler.units_consumed)).toBe(400);
    expect(parseFloat(boiler.total_cost)).toBe(2800);
  });

  it('leaves the dials alone — half a dial reading is not a reading', () => {
    const [kwh] = apportionToCompany(rows, meters, COMPANY_CODES.JIVO_BEVERAGES);

    expect(kwh.opening_reading).toBe('500.00');
    expect(kwh.closing_reading).toBe('600.00');
  });

  it('changes nothing when no company is chosen', () => {
    expect(apportionToCompany(rows, meters, '')).toBe(rows);
  });

  it('totals a shared meter once per company, not twice', () => {
    const forOil = sumReadings(apportionToCompany(rows, meters, COMPANY_CODES.JIVO_OIL));
    const forBeverages = sumReadings(
      apportionToCompany(rows, meters, COMPANY_CODES.JIVO_BEVERAGES),
    );

    // Oil takes half the incomer; Beverages takes the other half plus its own.
    expect(forOil.units).toBe(900);
    expect(forBeverages.units).toBe(900);
  });
});
