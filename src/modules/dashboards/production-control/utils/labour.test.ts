import { describe, expect, it } from 'vitest';

import type { LabourGateEntry } from '@/modules/gate/api/labourGate/labourGate.api';

import { summariseLabour } from './labour';

let seq = 0;

function entry(overrides: Partial<LabourGateEntry> = {}): LabourGateEntry {
  seq += 1;
  return {
    id: seq,
    company: 1,
    department: 9,
    department_name: 'production(oil)',
    contractor: 1,
    contractor_name: 'Contractor A',
    work_date: '2026-09-09',
    shift: 'DAY',
    count_in: 10,
    total_out: 0,
    remaining: 10,
    out_batches: [],
    is_deleted: false,
    can_undo_last: false,
    can_restore: false,
    ...overrides,
  } as LabourGateEntry;
}

describe('summariseLabour', () => {
  it('totals only the Production departments', () => {
    const result = summariseLabour([
      entry({ count_in: 53 }),
      entry({ department_name: 'Warehouse Basement', count_in: 2 }),
      entry({ department_name: 'Boiling Floor 1', count_in: 3 }),
    ]);
    expect(result.productionIn).toBe(53);
    expect(result.totalIn).toBe(58);
  });

  it('keeps production(beverages) out of the Oil figure', () => {
    // The department master holds three lookalikes; a substring match on
    // "production" would silently fold Beverages into Oil.
    const result = summariseLabour([
      entry({ count_in: 53 }),
      entry({ department_name: 'production(beverages)', count_in: 40 }),
    ]);
    expect(result.productionIn).toBe(53);
  });

  it('excludes the bare "production" department, which names no line', () => {
    // It carries no gate entries today, and if it ever does there is nothing to
    // say whether those people were on the Oil or the Beverages line.
    const result = summariseLabour([
      entry({ count_in: 53 }),
      entry({ department_name: 'production', department: 8, count_in: 30 }),
    ]);
    expect(result.productionIn).toBe(53);
    expect(result.totalIn).toBe(83);
  });

  it('matches the department name regardless of case or padding', () => {
    const result = summariseLabour([
      entry({ department_name: '  Production(Oil) ', count_in: 12 }),
    ]);
    expect(result.productionIn).toBe(12);
  });

  it('drops soft-deleted rows, which keep their count for the audit trail', () => {
    const result = summariseLabour([
      entry({ count_in: 53 }),
      entry({ count_in: 20, is_deleted: true }),
    ]);
    expect(result.productionIn).toBe(53);
    expect(result.totalIn).toBe(53);
  });

  it('counts unallocated labour separately, never inside the Production figure', () => {
    // 84 of today's 142 on Jivo Oil carry no department at all.
    const result = summariseLabour([
      entry({ count_in: 53 }),
      entry({ department_name: undefined, department: null, count_in: 84 }),
    ]);
    expect(result.productionIn).toBe(53);
    expect(result.unallocatedIn).toBe(84);
    expect(result.totalIn).toBe(137);
  });

  it('treats a blank department name as unallocated, not as a department', () => {
    const result = summariseLabour([entry({ department_name: '   ', count_in: 7 })]);
    expect(result.productionIn).toBe(0);
    expect(result.unallocatedIn).toBe(7);
  });

  it('splits Production by shift', () => {
    const result = summariseLabour([
      entry({ shift: 'DAY', count_in: 53 }),
      entry({ shift: 'NIGHT', count_in: 21 }),
      entry({ shift: 'NIGHT', count_in: 4 }),
    ]);
    expect(result.shifts).toEqual({ day: 53, night: 25 });
    expect(result.productionIn).toBe(78);
  });

  it('reports how many are still inside, not just how many came in', () => {
    const result = summariseLabour([
      entry({ count_in: 53, total_out: 20, remaining: 33 }),
      entry({ count_in: 10, total_out: 10, remaining: 0 }),
    ]);
    expect(result.productionIn).toBe(63);
    expect(result.productionInside).toBe(33);
  });

  it('counts distinct contractors, not rows', () => {
    const result = summariseLabour([
      entry({ contractor: 1 }),
      entry({ contractor: 1 }),
      entry({ contractor: 2 }),
    ]);
    expect(result.contractors).toBe(2);
  });

  it('returns a usable zero for a day with no gate entries', () => {
    expect(summariseLabour([])).toMatchObject({
      productionIn: 0,
      productionInside: 0,
      totalIn: 0,
      unallocatedIn: 0,
      contractors: 0,
    });
    expect(summariseLabour(undefined).productionIn).toBe(0);
  });
});
