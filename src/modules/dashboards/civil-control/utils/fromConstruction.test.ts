import { describe, expect, it } from 'vitest';

import type { ProjectListItem, ProjectRevision } from '@/modules/construction/types';

import { baselineEnd, civilPlot, civilProjectFromRegister, civilStage } from './fromConstruction';

/**
 * A register row, in the shape the backend serialises it.
 *
 * Every money and measurement value is a STRING here because it is a string on
 * the wire — the backend quantises and stringifies so no amount is ever a
 * float. Tests that passed numbers would not exercise the one parser this
 * board's honesty rests on.
 */
function registerRow(over: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 4,
    code: 'PRJ-2026-004',
    name: 'New Warehouse',
    location: 'North yard',
    status: 'IN_PROGRESS',
    status_display: 'In progress',
    start_date: '2026-04-01',
    expected_end_date: '2027-02-28',
    actual_end_date: null,
    estimated_cost: '35000000.00',
    length: '300.00',
    breadth: '135.00',
    height: null,
    dimension_unit: 'FT',
    area: '40500.00',
    area_unit: 'sq ft',
    volume: null,
    volume_unit: 'cu ft',
    sanctioned_budget: '35000000.00',
    spent_amount: '15000000.00',
    remaining_budget: '20000000.00',
    percent_used: '42.86',
    is_over_budget: false,
    is_overdue: false,
    days_left: 160,
    progress_percent: '38.00',
    manager: 7,
    manager_name: 'R. Sharma',
    ...over,
  };
}

function revision(over: Partial<ProjectRevision> = {}): ProjectRevision {
  return {
    id: 1,
    project: 4,
    project_code: 'PRJ-2026-004',
    project_name: 'New Warehouse',
    revision_no: 1,
    additional_amount: '0.00',
    new_end_date: '2027-02-28',
    reason: 'Steel delivery slipped',
    budget_before: '35000000.00',
    budget_after: '35000000.00',
    end_date_before: '2026-12-31',
    end_date_after: '2027-02-28',
    extension_days: 59,
    status: 'APPROVED',
    status_display: 'Approved',
    requested_by_name: 'R. Sharma',
    requested_at: '2026-06-01T10:00:00Z',
    decided_by_name: 'A Director',
    decided_at: '2026-06-03T10:00:00Z',
    decision_note: '',
    ...over,
  };
}

describe('civilProjectFromRegister — a figure the register does not hold is a null, never a zero', () => {
  it('reads a sanctioned budget of nil as nothing sanctioned', () => {
    // The roll-up sits at zero until a project is approved. Nobody sanctions a
    // project for no money, so zero here can only mean "not sanctioned" — and
    // the board must draw that as a rule, not as ₹0.
    const row = civilProjectFromRegister(registerRow({ sanctioned_budget: '0.00' }));

    expect(row.money.budget).toBeNull();
  });

  it('reads a spend of nil as no bill booked', () => {
    const row = civilProjectFromRegister(registerRow({ spent_amount: '0.00' }));

    expect(row.money.spent).toBeNull();
  });

  it('reads an uncertified progress of nil as uncertified', () => {
    // The register carries the newest daily log that stated a percentage and
    // falls back to zero when none ever has, so the list payload cannot tell
    // the two apart. Reporting "not certified" over a genuine 0% is the mild
    // error; scoring an unmeasured project against the calendar is not.
    const row = civilProjectFromRegister(registerRow({ progress_percent: '0.00' }));

    expect(row.progress_pct).toBeNull();
  });

  it('keeps a certified figure exactly as the register states it', () => {
    const row = civilProjectFromRegister(registerRow());

    expect(row.progress_pct).toBe(38);
    expect(row.money.budget).toBe(35_000_000);
    expect(row.money.spent).toBe(15_000_000);
  });

  it('never invents a contractor out of the manager', () => {
    const row = civilProjectFromRegister(registerRow());

    // The register has no contractor column. Naming the manager there would
    // print an employee under the heading "who is building it".
    expect(row.contractor).toBeNull();
    expect(row.manager).toBe('R. Sharma');
  });

  it('leaves a project with one side without a plot', () => {
    // A boundary wall has a length and no meaningful breadth. "120 × 0 ft"
    // would read as a mistake in the register rather than as a shape.
    const row = civilProjectFromRegister(
      registerRow({ breadth: null, area: null }),
    );

    expect(row.plot).toBeNull();
    expect(row.area_sqft).toBeNull();
  });
});

describe('civilProjectFromRegister — feet, whatever the project was filed in', () => {
  it('converts a metric project to the unit the column is labelled in', () => {
    const row = civilProjectFromRegister(
      registerRow({
        dimension_unit: 'M',
        length: '30.00',
        breadth: '12.00',
        area: '360.00',
        area_unit: 'sq m',
      }),
    );

    // 30 m is 98.4 ft, 12 m is 39.4 ft, and 360 sq m is 3,875 sq ft. A board
    // that printed 360 under a "sq ft" heading would understate a building by
    // a factor of eleven.
    expect(row.plot).toEqual({ length_ft: 98, width_ft: 39 });
    expect(Math.round(row.area_sqft ?? 0)).toBe(3875);
  });

  it('leaves a project filed in feet untouched', () => {
    const row = civilProjectFromRegister(registerRow());

    expect(row.plot).toEqual({ length_ft: 300, width_ft: 135 });
    expect(row.area_sqft).toBe(40_500);
  });
});

describe('civilStage — the register says status, and this does not guess a trade', () => {
  it('calls work under way under way rather than naming a trade', () => {
    expect(civilStage('IN_PROGRESS')).toBe('in-progress');
  });

  it('maps the states the register does record', () => {
    expect(civilStage('ON_HOLD')).toBe('on-hold');
    expect(civilStage('APPROVED')).toBe('planning');
    expect(civilStage('PENDING_APPROVAL')).toBe('planning');
    expect(civilStage('COMPLETED')).toBe('handover');
  });
});

describe('baselineEnd — the date first committed to, not the last one missed', () => {
  it('takes the earliest approved extension, not the newest', () => {
    // After three extensions the honest comparison is against the date the
    // project originally promised.
    const first = revision({ id: 1, revision_no: 1, end_date_before: '2026-12-31' });
    const second = revision({
      id: 2,
      revision_no: 2,
      end_date_before: '2027-02-28',
      new_end_date: '2027-06-30',
    });

    expect(baselineEnd([second, first])).toBe('2026-12-31');
  });

  it('ignores an extension nobody has granted yet', () => {
    // A requested extension is not an extension. Treating one as granted would
    // show a slip the director has not agreed to.
    expect(baselineEnd([revision({ status: 'PENDING' })])).toBeNull();
    expect(baselineEnd([revision({ status: 'REJECTED' })])).toBeNull();
    expect(baselineEnd([revision({ status: 'WITHDRAWN' })])).toBeNull();
  });

  it('ignores a revision that asked for money alone', () => {
    // The date snapshot is taken on every revision, including ones that never
    // touched the date.
    expect(baselineEnd([revision({ new_end_date: null })])).toBeNull();
    expect(
      baselineEnd([revision({ new_end_date: '2026-12-31', end_date_before: '2026-12-31' })]),
    ).toBeNull();
  });

  it('answers null where the histories have not been read', () => {
    // Not an error state: the rows are drawn from the register and the
    // original dates arrive separately. The board says so in its header.
    expect(baselineEnd(undefined)).toBeNull();
    expect(baselineEnd([])).toBeNull();
  });

  it('carries the original date onto the row', () => {
    const row = civilProjectFromRegister(registerRow(), [revision()]);

    expect(row.schedule.baseline_end).toBe('2026-12-31');
    expect(row.schedule.end).toBe('2027-02-28');
  });
});

describe('civilPlot — rounded to the foot, because a site office writes whole feet', () => {
  it('rounds a converted side rather than printing four decimals of it', () => {
    expect(civilPlot(registerRow({ dimension_unit: 'M', length: '10.00', breadth: '5.00' })))
      .toEqual({ length_ft: 33, width_ft: 16 });
  });
});
