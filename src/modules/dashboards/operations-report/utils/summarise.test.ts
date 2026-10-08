import { describe, expect, it } from 'vitest';

import type { ReportDay, ReportMeta } from '../types';
import { measureOf, unitFor } from './measure';
import { comparisonSpan, daysBetween, resolvePeriod, trendSpan } from './period';
import { breakdownOf, buildReport, fetchSpan, totalsOf } from './summarise';

const NO_META: ReportMeta = { degraded: [], withheld: [], warnings: [] };
const OIL = { code: 'JIVO_OIL', name: 'Jivo Oil' };

const day = (date: string, overrides: Partial<ReportDay> = {}): ReportDay => ({
  date,
  lines: [{ line: '10 Head', runs: 2, cases: 100, litres: 1_200 }],
  wastage: [{ item: 'Caps', unit: 'pcs', quantity: 50, value: 30, unpriced: 0 }],
  labour: [{ group: 'Imran', heads: 10, day_shift: 8, night_shift: 2, cost: 6_500 }],
  salary: [{ department: 'Packing', monthly: 30_000, cost: 1_000 }],
  power: [{ area: 'Blowing', kwh: 300, cost: 2_505 }],
  returns: [
    {
      condition: 'LEAKED',
      label: 'Leaked',
      entries: ['GR-1'],
      lines: 1,
      quantity: 4,
      value: 600,
      unpriced: 0,
    },
    {
      condition: 'GOOD',
      label: 'Good',
      entries: ['GR-1', 'GR-2'],
      lines: 2,
      quantity: 6,
      value: 0,
      unpriced: 1,
    },
  ],
  ...overrides,
});

describe('totalsOf', () => {
  it('costs a litre as labour, salary, power and priced waste over litres filled', () => {
    const totals = totalsOf([day('2026-09-01')]);
    expect(totals.perLitre.labour).toBeCloseTo(6_500 / 1_200, 6);
    expect(totals.perLitre.salary).toBeCloseTo(1_000 / 1_200, 6);
    expect(totals.perLitre.power).toBeCloseTo(2_505 / 1_200, 6);
    expect(totals.perLitre.wastage).toBeCloseTo(30 / 1_200, 6);
    expect(totals.perLitre.total).toBeCloseTo((6_500 + 1_000 + 2_505 + 30) / 1_200, 6);
    expect(totals.kwhPerKl).toBeCloseTo(300 / 1.2, 6);
  });

  it('gives no cost per litre, rather than zero, for a day nothing was filled', () => {
    const totals = totalsOf([day('2026-09-06', { lines: [] })]);
    expect(totals.perLitre).toEqual({
      labour: null,
      salary: null,
      power: null,
      wastage: null,
      total: null,
    });
    // The spend is still there — the day cost something.
    expect(totals.labourCost).toBe(6_500);
  });

  it('keeps a section it could not read as unknown, never zero', () => {
    const totals = totalsOf([day('2026-09-01', { lines: null, wastage: null })]);
    expect(totals.litres).toBeNull();
    expect(totals.wastageValue).toBeNull();
    expect(totals.perLitre.total).toBeNull();
    expect(totals.labourCost).toBe(6_500);
  });

  it('will not total labour with a day that had no rate', () => {
    const totals = totalsOf([
      day('2026-09-01'),
      day('2026-09-02', {
        labour: [{ group: 'Imran', heads: 10, day_shift: 10, night_shift: 0, cost: null }],
      }),
    ]);
    expect(totals.labourCost).toBeNull();
    expect(totals.manDays).toBe(20);
    expect(totals.perLitre.labour).toBeNull();
    expect(totals.perLitre.total).toBeNull();
  });

  it('averages people over the days and sums man-days and money', () => {
    const totals = totalsOf([
      day('2026-09-01'),
      day('2026-09-02', {
        labour: [{ group: 'Imran', heads: 20, day_shift: 20, night_shift: 0, cost: 13_000 }],
      }),
    ]);
    expect(totals.heads).toBe(15);
    expect(totals.manDays).toBe(30);
    expect(totals.labourCost).toBe(19_500);
    expect(totals.litres).toBe(2_400);
  });

  it('will not give litres for a span with a run of unknown volume', () => {
    const totals = totalsOf([
      day('2026-08-01', { lines: [{ line: '10 Head', runs: 1, cases: 100, litres: null }] }),
      day('2026-08-02'),
    ]);
    expect(totals.cases).toBe(200);
    expect(totals.litres).toBeNull();
    expect(totals.perLitre.total).toBeNull();
  });

  it('sums salary over the days, and gives the bill in force on the last one', () => {
    const totals = totalsOf([
      day('2026-09-30'),
      day('2026-10-01', { salary: [{ department: 'Packing', monthly: 31_000, cost: 1_000 }] }),
    ]);
    expect(totals.salaryCost).toBe(2_000);
    expect(totals.salaryMonthly).toBe(31_000);
    expect(totals.salaryUncostedDays).toBe(0);
  });

  it('will not total salary with a day that had no rate, and counts the day', () => {
    const totals = totalsOf([day('2026-09-01'), day('2026-09-02', { salary: null })]);
    expect(totals.salaryCost).toBeNull();
    expect(totals.salaryUncostedDays).toBe(1);
    expect(totals.perLitre.salary).toBeNull();
    expect(totals.perLitre.total).toBeNull();
  });

  it('reads a server that sends no salary as not read, never as nobody paid', () => {
    const old = day('2026-09-01');
    delete old.salary;
    const totals = totalsOf([old]);
    expect(totals.salaryCost).toBeNull();
    // Not a month of missing rates: the section is simply not there.
    expect(totals.salaryUncostedDays).toBe(0);
    expect(totals.perLitre.total).toBeNull();
    expect(breakdownOf([old]).salary).toBeNull();
  });

  it('sums electricity past an unread day and counts it', () => {
    const totals = totalsOf([day('2026-09-01'), day('2026-09-02', { power: null })]);
    expect(totals.kwh).toBe(300);
    expect(totals.powerUnreadDays).toBe(1);
  });

  it('counts the days each gap falls on, so a notice can name its own period', () => {
    const totals = totalsOf([
      day('2026-08-01', {
        lines: [{ line: '10 Head', runs: 1, cases: 100, litres: null }],
        labour: [{ group: 'Imran', heads: 10, day_shift: 10, night_shift: 0, cost: null }],
      }),
      day('2026-08-02', {
        labour: [{ group: 'Imran', heads: 10, day_shift: 10, night_shift: 0, cost: null }],
      }),
      day('2026-08-03'),
    ]);
    expect(totals.litresUnknownDays).toBe(1);
    expect(totals.labourUncostedDays).toBe(2);
    expect(totals.powerUnreadDays).toBe(0);
  });
});

describe('Goods Return (GR)', () => {
  it('counts a return once however many conditions and days it spans', () => {
    const totals = totalsOf([day('2026-09-01'), day('2026-09-02')]);
    expect(totals.grReturns).toBe(2);
    expect(totals.grQuantity).toBe(20);
    expect(totals.grSpoiledQuantity).toBe(8);
    expect(totals.grValue).toBe(1_200);
    expect(totals.grUnpriced).toBe(2);
  });

  it('keeps returns out of the cost per litre', () => {
    const totals = totalsOf([day('2026-09-01')]);
    expect(totals.perLitre.total).toBeCloseTo((6_500 + 1_000 + 2_505 + 30) / 1_200, 6);
  });

  it('reads a server that sends no returns as not read, never as nothing returned', () => {
    const old = day('2026-09-01');
    delete old.returns;
    expect(totalsOf([old]).grValue).toBeNull();
    expect(breakdownOf([old]).returns).toBeNull();
  });

  it('merges a condition across days, worst first', () => {
    const merged = breakdownOf([day('2026-09-01'), day('2026-09-02')]).returns;
    expect(merged?.map((row) => row.condition)).toEqual(['LEAKED', 'GOOD']);
    expect(merged?.[1]).toMatchObject({ entries: ['GR-1', 'GR-2'], quantity: 12, unpriced: 2 });
  });
});

describe('breakdownOf', () => {
  it('adds a line up across days and keeps people a daily average', () => {
    const merged = breakdownOf([day('2026-09-01'), day('2026-09-02')]);
    expect(merged.lines).toEqual([{ line: '10 Head', runs: 4, cases: 200, litres: 2_400 }]);
    expect(merged.labour?.[0]).toEqual({
      group: 'Imran',
      heads: 10,
      day_shift: 8,
      night_shift: 2,
      cost: 13_000,
    });
    expect(merged.power).toEqual([{ area: 'Blowing', kwh: 600, cost: 5_010 }]);
    expect(merged.salary).toEqual([{ department: 'Packing', monthly: 30_000, cost: 2_000 }]);
  });

  it('keeps a withheld section withheld', () => {
    const merged = breakdownOf([day('2026-09-01', { labour: null, power: null })]);
    expect(merged.labour).toBeNull();
    expect(merged.power).toBeNull();
  });
});

describe('Beverages, in boxes', () => {
  const BEVERAGES = { code: 'JIVO_BEVERAGES', name: 'Jivo Beverages' };

  it('costs a box as the same heads over the cases packed', () => {
    const totals = totalsOf([day('2026-09-01')]);
    expect(totals.perBox.labour).toBeCloseTo(6_500 / 100, 6);
    expect(totals.perBox.salary).toBeCloseTo(1_000 / 100, 6);
    expect(totals.perBox.total).toBeCloseTo((6_500 + 1_000 + 2_505 + 30) / 100, 6);
    expect(totals.kwhPerBox).toBeCloseTo(300 / 100, 6);
  });

  it('still costs a box when a run has no pack size, so no litres', () => {
    const totals = totalsOf([
      day('2026-09-01', { lines: [{ line: 'PET', runs: 1, cases: 200, litres: null }] }),
    ]);
    expect(totals.perLitre.total).toBeNull();
    expect(totals.perBox.total).toBeCloseTo((6_500 + 1_000 + 2_505 + 30) / 200, 6);
  });

  it('gives no cost per box, rather than zero, for a day nothing was packed', () => {
    const totals = totalsOf([day('2026-09-06', { lines: [] })]);
    expect(totals.perBox.total).toBeNull();
    expect(totals.kwhPerBox).toBeNull();
  });

  it('reads a Beverages report in boxes, and every other company in litres', () => {
    const period = resolvePeriod({ view: 'day', date: '2026-09-14', month: null }, '2026-10-03');
    const days = [day('2026-09-14')];
    const bev = buildReport(period, { company: BEVERAGES, days, meta: NO_META });
    expect(bev.unit).toBe('box');
    expect(measureOf(bev).output(bev.totals)).toBe(100);
    expect(measureOf(bev).cost(bev.totals).total).toBeCloseTo(10_035 / 100, 6);

    const oil = buildReport(period, { company: OIL, days, meta: NO_META });
    expect(oil.unit).toBe('litre');
    expect(measureOf(oil).output(oil.totals)).toBe(1_200);
    expect(unitFor('JIVO_MART')).toBe('litre');
  });
});

describe('the period', () => {
  const today = '2026-10-03';

  it('defaults to yesterday, and never runs past it', () => {
    expect(resolvePeriod({ view: null, date: null, month: null }, today).date).toBe('2026-10-02');
    expect(resolvePeriod({ view: 'day', date: '2026-10-03', month: null }, today).date).toBe(
      '2026-10-02',
    );
    expect(resolvePeriod({ view: 'day', date: 'nonsense', month: null }, today).date).toBe(
      '2026-10-02',
    );
  });

  it('reads a running month to yesterday and an ended one to its last day', () => {
    const running = resolvePeriod({ view: 'month', date: null, month: '2026-10' }, today);
    expect([running.from, running.to]).toEqual(['2026-10-01', '2026-10-02']);
    expect(running.sublabel).toBe('1–2 Oct so far');
    expect(running.canGoForward).toBe(false);

    const ended = resolvePeriod({ view: 'month', date: null, month: '2026-09' }, today);
    expect([ended.from, ended.to]).toEqual(['2026-09-01', '2026-09-30']);
    expect(ended.sublabel).toBeNull();
    expect(ended.canGoForward).toBe(true);
  });

  it('compares a running month with the same days of the month before', () => {
    const running = resolvePeriod({ view: 'month', date: null, month: '2026-10' }, today);
    expect(comparisonSpan(running)).toMatchObject({ from: '2026-09-01', to: '2026-09-02' });

    const ended = resolvePeriod({ view: 'month', date: null, month: '2026-09' }, today);
    expect(comparisonSpan(ended)).toMatchObject({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('compares a day with the day before, and draws the fortnight to it', () => {
    const shown = resolvePeriod({ view: 'day', date: '2026-09-14', month: null }, today);
    expect(comparisonSpan(shown)).toMatchObject({ from: '2026-09-13', to: '2026-09-13' });
    expect(trendSpan(shown)).toEqual({ from: '2026-09-01', to: '2026-09-14' });
  });

  it('asks the server for one span covering the period, its comparison and its trend', () => {
    const shown = resolvePeriod({ view: 'day', date: '2026-09-14', month: null }, today);
    expect(fetchSpan(shown)).toEqual({ from: '2026-09-01', to: '2026-09-14' });

    const month = resolvePeriod({ view: 'month', date: null, month: '2026-09' }, today);
    expect(fetchSpan(month)).toEqual({ from: '2026-08-01', to: '2026-09-30' });
  });
});

describe('buildReport', () => {
  it('reads the period, its comparison and its trend out of one response', () => {
    const period = resolvePeriod({ view: 'month', date: null, month: '2026-09' }, '2026-10-03');
    const span = fetchSpan(period);
    const days = daysBetween(span.from, span.to).map((date) =>
      date < '2026-09-01'
        ? day(date, { lines: [{ line: '10 Head', runs: 1, cases: 50, litres: 600 }] })
        : day(date),
    );

    const report = buildReport(period, { company: OIL, days, meta: NO_META });

    expect(report.daily).toHaveLength(30);
    expect(report.dailyTotals.salaryCost).toBe(30 * 1_000);
    expect(report.totals.litres).toBe(30 * 1_200);
    expect(report.previous.litres).toBe(31 * 600);
    expect(report.previousLabel).toBe('Aug');
  });

  it('treats a day the server did not send as not read', () => {
    const period = resolvePeriod({ view: 'day', date: '2026-09-14', month: null }, '2026-10-03');
    const report = buildReport(period, { company: OIL, days: [], meta: NO_META });
    expect(report.totals.litres).toBeNull();
  });
});
