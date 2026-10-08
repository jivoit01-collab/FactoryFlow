import { describe, expect, it } from 'vitest';

import {
  averagePerActiveDay,
  combineDispatch,
  costPerLitre,
  dayOnDay,
  dayPlan,
  type DayPlanBill,
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
  const TODAY = '2026-10-06';

  function bill(overrides: Partial<DayPlanBill> = {}): DayPlanBill {
    return {
      key: 'JIVO_OIL:5001',
      weightKg: 10_000,
      litres: 10_800,
      boxes: 900,
      vehicleId: null,
      dispatchDate: TODAY,
      dispatched: false,
      ...overrides,
    };
  }

  it("adds the bills still waiting for a truck to today's linked ones", () => {
    const plan = dayPlan(
      [
        bill({ key: 'JIVO_OIL:1', weightKg: 12_000, litres: 13_000, vehicleId: 41 }),
        bill({ key: 'JIVO_MART:2', weightKg: 8_000, litres: 8_500, vehicleId: 42 }),
      ],
      [
        bill({ key: 'JIVO_OIL:3', weightKg: 30_000, litres: 32_000 }),
        // Planned for last week and never put on a truck: still today's work.
        bill({ key: 'JIVO_OIL:4', weightKg: 5_000, litres: 5_400, dispatchDate: '2026-09-29' }),
      ],
      TODAY,
    );

    const { rows, ...totals } = plan;
    expect(totals).toEqual({
      tonnes: 55,
      bills: 4,
      litres: 58_900,
      boxes: 3_600,
      linkedTonnes: 20,
      linkedBoxes: 1_800,
      linkedBills: 2,
      unlinkedTonnes: 35,
      unlinkedBoxes: 1_800,
      unlinkedBills: 2,
      pendingTonnes: 55,
      pendingBoxes: 3_600,
      pendingBills: 4,
    });
    // The bills behind the figures, linked first, for the drill-down.
    expect(rows.map((row) => row.key)).toEqual([
      'JIVO_OIL:1',
      'JIVO_MART:2',
      'JIVO_OIL:3',
      'JIVO_OIL:4',
    ]);
  });

  it('keeps a dispatched bill in the plan, and out of what is pending', () => {
    // The commitment does not shrink as trucks clear the gate: a plan that
    // fell as it was met would make every day look beaten.
    const plan = dayPlan(
      [
        bill({ key: 'JIVO_OIL:1', weightKg: 25_000, vehicleId: 7, dispatched: true }),
        // On a truck at the dock: linked, not gone — still pending.
        bill({ key: 'JIVO_OIL:2', weightKg: 6_000, vehicleId: 8 }),
      ],
      [bill({ key: 'JIVO_OIL:3', weightKg: 4_000 })],
      TODAY,
    );

    expect(plan.tonnes).toBe(35);
    expect(plan.pendingTonnes).toBe(10);
    expect(plan.pendingBills).toBe(2);
    // The same in boxes, for the Beverages board.
    expect(plan.boxes).toBe(2_700);
    expect(plan.pendingBoxes).toBe(1_800);
  });

  it('counts in litres a bill SAP holds no weight for', () => {
    // 626100147 on 6 Oct 2026: 5,000 L on the bill, 0 kg in SAP.
    const plan = dayPlan([bill({ weightKg: 0, litres: 5_000, vehicleId: 7 })], [], TODAY);

    expect(plan.tonnes).toBe(0);
    expect(plan.litres).toBe(5_000);
  });

  it('leaves out a bill planned for a later day', () => {
    const plan = dayPlan([], [bill({ dispatchDate: '2026-10-07' })], TODAY);

    expect(plan.bills).toBe(0);
  });

  it('counts a bill linked between the two reads once, as linked', () => {
    const plan = dayPlan(
      [bill({ key: 'JIVO_OIL:9', vehicleId: 41 })],
      [bill({ key: 'JIVO_OIL:9' })],
      TODAY,
    );

    expect(plan.linkedBills).toBe(1);
    expect(plan.unlinkedBills).toBe(0);
    expect(plan.tonnes).toBe(10);
    expect(plan.litres).toBe(10_800);
  });

  it('reads an empty day as a plan of nothing, not a missing one', () => {
    expect(dayPlan([], [], TODAY)).toEqual({
      tonnes: 0,
      bills: 0,
      litres: 0,
      boxes: 0,
      linkedTonnes: 0,
      linkedBoxes: 0,
      linkedBills: 0,
      unlinkedTonnes: 0,
      unlinkedBoxes: 0,
      unlinkedBills: 0,
      pendingTonnes: 0,
      pendingBoxes: 0,
      pendingBills: 0,
      rows: [],
    });
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
