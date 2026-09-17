import { describe, expect, it } from 'vitest';

import {
  averagePerActiveDay,
  combineDispatch,
  costPerLitre,
  dayOnDay,
  dayPlan,
  type DispatchRow,
} from './dispatch';

function row(overrides: Partial<DispatchRow> = {}): DispatchRow {
  return {
    arrivalId: 1,
    vehicleNo: 'PB01AB1234',
    invoiceDocEntries: [5001],
    gateOutDate: '2026-09-10',
    kg: 12_000,
    companyCode: 'JIVO_OIL',
    intercompany: false,
    ...overrides,
  };
}

describe('combineDispatch', () => {
  it('adds weight across both companies', () => {
    const totals = combineDispatch([
      row({ companyCode: 'JIVO_OIL', kg: 12_000 }),
      row({ companyCode: 'JIVO_MART', arrivalId: 2, invoiceDocEntries: [6001], kg: 8_000 }),
    ]);

    expect(totals.kg).toBe(20_000);
  });

  it('counts a truck carrying both companies once, not twice', () => {
    // One arrival, two dockings — the shape that makes a naive sum overstate.
    const totals = combineDispatch([
      row({ companyCode: 'JIVO_OIL', arrivalId: 77, invoiceDocEntries: [5001] }),
      row({ companyCode: 'JIVO_MART', arrivalId: 77, invoiceDocEntries: [6001] }),
    ]);

    expect(totals.vehicles).toBe(1);
    expect(totals.invoices).toBe(2);
  });

  it('falls back to the registration when a legacy row has no arrival', () => {
    const totals = combineDispatch([
      row({ arrivalId: null, vehicleNo: 'PB01AB1234' }),
      row({ arrivalId: null, vehicleNo: ' pb01ab1234 ', invoiceDocEntries: [5002] }),
    ]);

    expect(totals.vehicles).toBe(1);
  });

  it('counts a part-shipped bill on two trucks as one invoice', () => {
    const totals = combineDispatch([
      row({ arrivalId: 1, invoiceDocEntries: [5001], kg: 6_000 }),
      row({ arrivalId: 2, invoiceDocEntries: [5001], kg: 6_000 }),
    ]);

    expect(totals.invoices).toBe(1);
    expect(totals.vehicles).toBe(2);
    // The weight still adds: between them they carried the whole bill.
    expect(totals.kg).toBe(12_000);
  });

  it('excludes intercompany bills from every figure', () => {
    const totals = combineDispatch([
      row({ kg: 12_000 }),
      row({ arrivalId: 9, invoiceDocEntries: [7001], kg: 30_000, intercompany: true }),
    ]);

    expect(totals.kg).toBe(12_000);
    expect(totals.vehicles).toBe(1);
    expect(totals.invoices).toBe(1);
  });

  it('counts only days that actually dispatched', () => {
    const totals = combineDispatch([
      row({ gateOutDate: '2026-09-01' }),
      row({ gateOutDate: '2026-09-01', arrivalId: 2, invoiceDocEntries: [5002] }),
      row({ gateOutDate: '2026-09-03', arrivalId: 3, invoiceDocEntries: [5003] }),
    ]);

    expect(totals.activeDays).toBe(2);
  });

  it('is all zeroes for a day nothing moved', () => {
    expect(combineDispatch([])).toEqual({
      kg: 0,
      vehicles: 0,
      invoices: 0,
      activeDays: 0,
    });
  });
});

describe('averagePerActiveDay', () => {
  it('divides tonnage by dispatching days, not calendar days', () => {
    // 1240 t over 17 dispatching days — not over the 20 days elapsed.
    const average = averagePerActiveDay({
      kg: 1_240_000,
      vehicles: 80,
      invoices: 302,
      activeDays: 17,
    });

    expect(average).toBeCloseTo(72.94, 2);
  });

  it('returns null rather than zero before anything has moved', () => {
    const average = averagePerActiveDay({
      kg: 0,
      vehicles: 0,
      invoices: 0,
      activeDays: 0,
    });

    expect(average).toBeNull();
  });
});

describe('dayPlan', () => {
  it('totals only the bills that have a truck against them', () => {
    const plan = dayPlan([
      { weightKg: 12_000, vehicleId: 41 },
      { weightKg: 8_000, vehicleId: 42 },
      // Dated for today, nobody has booked it — not tonnage the gate can be
      // measured against.
      { weightKg: 30_000, vehicleId: null },
    ]);

    expect(plan.tonnes).toBe(20);
    expect(plan.bills).toBe(2);
    expect(plan.unbookedBills).toBe(1);
  });

  it('keeps a dispatched bill in the plan', () => {
    // The commitment does not shrink as trucks clear the gate: a plan that
    // fell as it was met would make every day look beaten.
    const plan = dayPlan([{ weightKg: 25_000, vehicleId: 7 }]);

    expect(plan.tonnes).toBe(25);
  });

  it('reads an empty day as a plan of nothing, not a missing one', () => {
    expect(dayPlan([])).toEqual({ tonnes: 0, bills: 0, unbookedBills: 0 });
  });
});

describe('dayOnDay', () => {
  it('reports the rise over yesterday', () => {
    const change = dayOnDay(612, 566.7);

    expect(change?.direction).toBe('up');
    expect(change?.pct).toBeCloseTo(8, 1);
  });

  it('reports the fall as a positive magnitude pointing down', () => {
    const change = dayOnDay(450, 500);

    expect(change).toEqual({ pct: 10, direction: 'down' });
  });

  it('calls rounding noise flat', () => {
    expect(dayOnDay(500.4, 500)?.direction).toBe('flat');
  });

  it('refuses a comparison against a day that moved nothing', () => {
    // +100% against zero would read as a doubled day, not a restarted one.
    expect(dayOnDay(612, 0)).toBeNull();
  });
});

describe('costPerLitre', () => {
  it('divides freight by the litres those same bilties carried, then adds loading', () => {
    // 4,00,000 of freight over 10,00,000 litres = 0.40 a litre, plus 0.80
    // configured loading.
    const cost = costPerLitre(400_000, 1_000_000, 1_000_000, 0.8);

    expect(cost?.freight).toBeCloseTo(0.4, 4);
    expect(cost?.loading).toBe(0.8);
    expect(cost?.total).toBeCloseTo(1.2, 4);
    expect(cost?.coveragePct).toBe(100);
  });

  it('reports how much of the window the rate actually speaks for', () => {
    // Only 6 lakh of the window's 10 lakh litres have a freight figure behind
    // them — the rate is a sample, and the tile has to say so.
    const cost = costPerLitre(300_000, 600_000, 1_000_000, 0.8);

    expect(cost?.freight).toBeCloseTo(0.5, 4);
    expect(cost?.coveragePct).toBeCloseTo(60, 4);
    expect(cost?.coveredLitres).toBe(600_000);
    expect(cost?.windowLitres).toBe(1_000_000);
  });

  it('never divides by litres nobody priced', () => {
    // Would otherwise read "0.80 a litre", which says freight is free.
    expect(costPerLitre(0, 0, 1_000_000, 0.8)).toBeNull();
  });

  it('does not let coverage exceed the window it is a share of', () => {
    // Litres are per truck and freight per bilty, so a part-shipped plan can
    // make the covered figure edge past the window total.
    const cost = costPerLitre(100_000, 1_200_000, 1_000_000, 0.8);

    expect(cost?.coveragePct).toBe(100);
  });
});
