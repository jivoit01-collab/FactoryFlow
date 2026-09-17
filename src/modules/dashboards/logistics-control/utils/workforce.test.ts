import { describe, expect, it } from 'vitest';

import { LOGISTICS_CONTROL_SECTION_EMPLOYEE_DEPARTMENTS } from '../constants';
import {
  buildWorkforceStrip,
  dailyFromAnnual,
  employeesForSection,
  gateLabourTotal,
  type LabourDepartment,
  labourForSection,
  sectionHeadcount,
  UNALLOCATED_LABEL,
} from './workforce';

function dept(department: string, headcount: number, cost = 0): LabourDepartment {
  return { department, headcount, cost };
}

describe('gateLabourTotal', () => {
  it('adds the unallocated pool to the assigned departments', () => {
    // 142 at the gate: 84 not yet split, 58 allocated across two departments.
    const total = gateLabourTotal([
      dept(UNALLOCATED_LABEL, 84),
      dept('Warehouse', 34),
      dept('Dispatch', 24),
    ]);

    expect(total).toBe(142);
  });

  it('ignores a negative headcount rather than subtracting it', () => {
    expect(gateLabourTotal([dept(UNALLOCATED_LABEL, 10), dept('Warehouse', -5)])).toBe(10);
  });

  it('is zero for an empty day', () => {
    expect(gateLabourTotal([])).toBe(0);
  });
});

describe('labourForSection', () => {
  const departments = [
    dept(UNALLOCATED_LABEL, 84, 8400),
    dept('Warehouse', 34, 3400),
    dept('Despatch (Docking)', 24, 2400),
  ];

  it('sums only the named departments', () => {
    const result = labourForSection(departments, ['Warehouse']);

    expect(result).toEqual({ headcount: 34, cost: 3400, assigned: true });
  });

  it('matches regardless of case and surrounding space', () => {
    const result = labourForSection(departments, ['  warehouse  ']);

    expect(result.headcount).toBe(34);
  });

  it('matches the Despatch spelling the org chart actually uses', () => {
    // Every route spells it Dispatch; the org chart spells it Despatch. An
    // exact match on the wrong one returns nobody, silently.
    const result = labourForSection(departments, ['Despatch (Docking)']);

    expect(result.headcount).toBe(24);
  });

  it('reports "not assigned" rather than zero for an empty list', () => {
    const result = labourForSection(departments, []);

    expect(result.assigned).toBe(false);
    expect(result.headcount).toBe(0);
  });

  it('is assigned but empty when a named department had nobody today', () => {
    const result = labourForSection(departments, ['Transportation']);

    expect(result.assigned).toBe(true);
    expect(result.headcount).toBe(0);
  });
});

describe('dailyFromAnnual', () => {
  it('spreads an annual figure over 365 days', () => {
    expect(dailyFromAnnual(3_650_000)).toBeCloseTo(10_000);
  });

  it('keeps null null, so hidden salary never reads as zero', () => {
    expect(dailyFromAnnual(null)).toBeNull();
  });
});

describe('buildWorkforceStrip', () => {
  const base = {
    employees: 12,
    annualPayroll: 4_380_000,
    salaryVisible: true,
    labour: 34,
    labourCost: 3400,
    labourAssigned: true,
    labourRateConfigured: true,
  };

  it('reports both costs per day when everything is configured', () => {
    const strip = buildWorkforceStrip(base);

    expect(strip.employeeCostPerDay).toBeCloseTo(12_000);
    expect(strip.labourCostPerDay).toBe(3400);
    expect(strip.note).toBeUndefined();
  });

  it('says salary is unset rather than showing nothing', () => {
    const strip = buildWorkforceStrip({ ...base, salaryVisible: false });

    expect(strip.employeeCostPerDay).toBeNull();
    expect(strip.note).toContain('Salary not set');
    // The headcount is still real and still shown.
    expect(strip.employees).toBe(12);
  });

  it('takes a configured daily cost even when payroll is withheld', () => {
    // The config screen is the other legitimate source for this line: a
    // wall-board login holds no salary grant, so payroll answers nothing.
    const strip = buildWorkforceStrip({
      ...base,
      salaryVisible: false,
      annualPayroll: null,
      employeeCostPerDay: 12_500,
    });

    expect(strip.employeeCostPerDay).toBe(12_500);
    expect(strip.note).toBeUndefined();
  });

  it('prefers the configured cost over the annual derivation', () => {
    // Somebody chose the typed figure for this board; silently preferring
    // payroll would make the config screen look broken.
    const strip = buildWorkforceStrip({ ...base, employeeCostPerDay: 9_000 });

    expect(strip.employeeCostPerDay).toBe(9_000);
  });

  it('says the labour rate is missing rather than implying free labour', () => {
    const strip = buildWorkforceStrip({
      ...base,
      labourRateConfigured: false,
      labourCost: 0,
    });

    expect(strip.labourCostPerDay).toBeNull();
    expect(strip.note).toContain('No labour rate configured');
  });

  it('says a card has nobody assigned in preference to the rate note', () => {
    // Unassigned is the more useful complaint: configuring a rate would change
    // nothing while the card matches no departments.
    const strip = buildWorkforceStrip({
      ...base,
      labourAssigned: false,
      labourRateConfigured: false,
    });

    expect(strip.note).toBe('No departments assigned');
  });

  it('joins several reasons when more than one applies', () => {
    const strip = buildWorkforceStrip({
      ...base,
      salaryVisible: false,
      labourAssigned: false,
    });

    expect(strip.note).toBe('Salary not set · No departments assigned');
  });
});

describe('employeesForSection', () => {
  const departments = [
    { name: 'Despatch', code: 'DISP', headcount: 6 },
    { name: 'Dispatch', code: 'D2', headcount: 4 },
    { name: 'Warehouse Basement', code: 'WHB', headcount: 11 },
  ];

  it('adds both spellings of the same section', () => {
    // The org chart says Despatch, every route says Dispatch — an exact match
    // on one returns most of the people and looks like an answer.
    expect(employeesForSection(departments, ['Dispatch', 'Despatch'])).toBe(10);
  });

  it('matches on the code as well as the name', () => {
    expect(employeesForSection(departments, ['disp'])).toBe(6);
  });

  it('returns null where the directory has no such department', () => {
    // Unknown, not empty: the caller falls back to the configured head count
    // rather than printing a zero the floor would read as nobody employed.
    expect(employeesForSection(departments, ['Transportation'])).toBeNull();
  });

  it('returns null for a section with no names assigned', () => {
    expect(employeesForSection(departments, [])).toBeNull();
  });
});

describe('sectionHeadcount', () => {
  const directory = [{ name: 'Logistics', code: 'LOGISTICS', headcount: 1 }];

  it('shows the figure typed on the settings screen, not the directory', () => {
    // The whole complaint: somebody typed 6 against Transport and the wall
    // showed 1, with nothing on the settings screen to say why.
    expect(sectionHeadcount(6, directory, ['LOGISTICS'])).toBe(6);
  });

  it('treats a typed zero as an answer, not as nothing typed', () => {
    // A section really can have nobody in it, and the settings screen allows
    // zero for exactly that. Falling through to the directory here would make
    // the one deliberate zero on the board impossible to set.
    expect(sectionHeadcount(0, directory, ['LOGISTICS'])).toBe(0);
  });

  it('falls back to the directory where nothing is configured', () => {
    expect(sectionHeadcount(null, directory, ['LOGISTICS'])).toBe(1);
  });

  it('reports an unknown head count where neither master answers', () => {
    expect(sectionHeadcount(null, directory, ['DOCK'])).toBeNull();
  });
});

describe('the fallback section lists against the real directory', () => {
  /**
   * The JIVO_OIL employee directory as it actually stands, trimmed to the
   * departments that carry one of the three sections' obvious words.
   *
   * Pinned here because the previous lists were written from the words a
   * reader would expect and every one of them was wrong: `Warehouse` is the
   * Beverages floor, `Store` is the PM store, and *Despatch*, *Docking*,
   * *Transportation* and *Fleet* do not exist. Nothing in the app fails when
   * that happens — an unconfigured card just quietly shows somebody else's
   * people. This fixture makes the next edit to the lists fail out loud
   * instead.
   *
   * Only JIVO_OIL is represented: Mart and Beverages have no departments on
   * the roll at all, so their boards read the settings screen regardless.
   */
  const oilDirectory = [
    { name: 'Dock', code: 'DOCK', headcount: 8 },
    { name: 'Dispatched Frontend', code: 'DISPATCHED_FRONTEND', headcount: 0 },
    { name: 'Dispatched Backend', code: 'DISPATCHED_BACKEND', headcount: 0 },
    { name: 'Logistics', code: 'LOGISTICS', headcount: 1 },
    { name: 'Store', code: 'STORE', headcount: 9 },
    { name: 'Transport', code: 'TRANSPORT', headcount: 0 },
    { name: 'Transport (Transport)', code: 'TRANSPORT_TRANSPORT', headcount: 6 },
    { name: 'Warehouse', code: 'WAREHOUSE', headcount: 2 },
    {
      name: 'Warehouse (FG Warehouse Basement)',
      code: 'WAREHOUSE_FG_WAREHOUSE_BASEMEN',
      headcount: 4,
    },
    { name: 'FG Warehouse Basement', code: 'FG_WAREHOUSE_BASEMENT', headcount: 0 },
    { name: 'FG Warehouse Bev', code: 'FG_WAREHOUSE_BEV', headcount: 0 },
    { name: 'PM Warehouse', code: 'PM_WAREHOUSE', headcount: 2 },
  ];

  const section = (key: 'warehouse' | 'dispatch' | 'transport') =>
    employeesForSection(oilDirectory, LOGISTICS_CONTROL_SECTION_EMPLOYEE_DEPARTMENTS[key]);

  it('puts the FG basement on the warehouse card, not the PM store or the Beverages floor', () => {
    expect(section('warehouse')).toBe(4);
  });

  it('finds dispatch under the name the directory uses for it', () => {
    // *Dock*. A list that says "Dispatch" matches nobody here.
    expect(section('dispatch')).toBe(8);
  });

  it('counts transport and logistics together', () => {
    expect(section('transport')).toBe(7);
  });
});
