import { LOGISTICS_CONTROL_SALARY_DAYS_PER_YEAR } from '../constants';
import type { WorkforceStrip } from '../types';

/** One labour department figure as the factory-expense board reports it. */
export interface LabourDepartment {
  department: string;
  headcount: number;
  cost: number;
}

/**
 * The label the gate's own intake arrives under, before any HOD split.
 *
 * `labour_gate` stores the gate count as a row with no department, and the
 * HOD's allocation of *the same people* as further rows that do carry one. The
 * factory-expense board surfaces the first under this label.
 */
export const UNALLOCATED_LABEL = 'Unallocated';

/**
 * Total heads at the gate, without counting anybody twice.
 *
 * This is the trap the backend currently falls into: `factory_expense`'s
 * `labour_costs` sums every row's `count_in` with no test for a null
 * department, so the gate intake and the HOD's re-split of those same people
 * both land in the total, inflating it by roughly the allocated share.
 *
 * The gate total is therefore the Unallocated row plus the department rows —
 * which is what summing all rows *would* give if the department rows were extra
 * people. They are not. So: take Unallocated as the people not yet assigned,
 * add the assigned ones, and never add the payload's own grand total on top.
 */
export function gateLabourTotal(departments: readonly LabourDepartment[]): number {
  return departments.reduce((total, row) => total + Math.max(row.headcount, 0), 0);
}

/**
 * The subset of labour assigned to one card, by department name.
 *
 * Matched case-insensitively and trimmed, because the two spellings in this
 * system differ — the org chart says *Despatch* where every route says
 * *Dispatch* — and an exact match on the wrong one silently returns nobody.
 * An empty `names` list means the card has no assignment yet, which is reported
 * rather than rendered as zero.
 */
export function labourForSection(
  departments: readonly LabourDepartment[],
  names: readonly string[],
): { headcount: number; cost: number; assigned: boolean } {
  if (names.length === 0) {
    return { headcount: 0, cost: 0, assigned: false };
  }

  const wanted = new Set(names.map((name) => name.trim().toLowerCase()));
  const matched = departments.filter((row) =>
    wanted.has(row.department.trim().toLowerCase()),
  );

  return {
    headcount: matched.reduce((total, row) => total + Math.max(row.headcount, 0), 0),
    cost: matched.reduce((total, row) => total + Math.max(row.cost, 0), 0),
    assigned: true,
  };
}

/**
 * An annual salary spread onto one day.
 *
 * Divided by 365 rather than a working-day count: the result is a rate of burn
 * and ties to no payslip, and there is no holiday calendar in this system that
 * would make a working-day figure any more honest. Null in means null out —
 * salary withheld by permission must not read as ₹0.
 */
export function dailyFromAnnual(annual: number | null): number | null {
  if (annual === null || !Number.isFinite(annual)) return null;
  return annual / LOGISTICS_CONTROL_SALARY_DAYS_PER_YEAR;
}

/**
 * Assemble one Employees/Labour strip, saying why a figure is missing.
 *
 * The note matters more than the numbers on a wall nobody is standing at. Three
 * things can hollow out this strip and all of them look like ₹0: the viewer has
 * no salary grant, no factory-labour cost rate has been configured, or the card
 * has nobody assigned to it yet. Each says so instead.
 */
export function buildWorkforceStrip(input: {
  employees: number | null;
  annualPayroll: number | null;
  salaryVisible: boolean;
  /**
   * A daily employee cost taken straight from configuration, which wins over
   * the annual derivation below.
   *
   * Two legitimate sources for the same line: payroll knows the annual figure
   * but withholds it without a salary grant, and a board whose viewer lacks one
   * can still be told the number by hand. Where both exist the typed figure
   * wins — somebody chose it for this board, and silently preferring payroll
   * would make the config screen look broken.
   */
  employeeCostPerDay?: number | null;
  labour: number;
  labourCost: number | null;
  labourAssigned: boolean;
  labourRateConfigured: boolean;
}): WorkforceStrip {
  const notes: string[] = [];

  // An unknown headcount is reported before anything else, because it is the
  // one that makes the rest of the strip unreadable — a cost with no headcount
  // behind it cannot be sanity-checked by the person looking at it.
  const configuredCost = input.employeeCostPerDay ?? null;

  if (input.employees === null) notes.push('Employee headcount not set');
  else if (configuredCost === null && !input.salaryVisible) {
    notes.push('Salary not set');
  }

  if (!input.labourAssigned) notes.push('No departments assigned');
  else if (!input.labourRateConfigured) notes.push('No labour rate configured');

  return {
    employees: input.employees,
    employeeCostPerDay:
      configuredCost ?? (input.salaryVisible ? dailyFromAnnual(input.annualPayroll) : null),
    labour: input.labour,
    // A rate that was never configured yields ₹0 from the backend by design.
    // Report it as absent rather than as free labour.
    labourCostPerDay: input.labourRateConfigured ? input.labourCost : null,
    note: notes.length > 0 ? notes.join(' · ') : undefined,
  };
}

/** One department's on-roll head count, as the employee roll reports it. */
export interface RollDepartmentCount {
  name: string;
  code: string;
  headcount: number;
}

/**
 * The on-roll employees belonging to one card.
 *
 * Matched on the department's name OR its code, case-insensitively and trimmed
 * — the directory is typed in by hand and the same section reaches this board
 * spelled three ways. Both companies' departments arrive in one list and are
 * added, which is what a card headed "Oil | Mart" means.
 *
 * Null rather than zero when nothing matches: a section the directory has never
 * heard of is an unknown head count, not an empty one, and the caller falls
 * back to the figure typed on the settings screen.
 */
export function employeesForSection(
  departments: readonly RollDepartmentCount[],
  names: readonly string[],
): number | null {
  if (names.length === 0) return null;

  const wanted = new Set(names.map((name) => name.trim().toLowerCase()));
  const matched = departments.filter(
    (row) =>
      wanted.has(row.name.trim().toLowerCase()) || wanted.has(row.code.trim().toLowerCase()),
  );

  if (matched.length === 0) return null;
  return matched.reduce((total, row) => total + Math.max(row.headcount, 0), 0);
}
