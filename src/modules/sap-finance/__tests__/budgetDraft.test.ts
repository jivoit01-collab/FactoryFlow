import { describe, expect, it } from 'vitest';

import { budgetDraftError } from '../utils/budgetDraft';
import { monthLabel, sapDate } from '../utils/format';

const line = (month: string, fixed = '0', variable = '0') => ({
  month,
  fixed_amount: fixed,
  variable_amount: variable,
  sub_budget: '',
});

describe('budgetDraftError', () => {
  it('accepts a head with distinct months and non-negative amounts', () => {
    expect(budgetDraftError('B1', [line('2026-04', '100'), line('2026-05', '0', '2.5')])).toBeNull();
  });

  it('needs a head and at least one month', () => {
    expect(budgetDraftError('', [line('2026-04')])).toMatch(/budget head/);
    expect(budgetDraftError('B1', [])).toMatch(/at least one month/);
  });

  it('refuses the same month twice, a missing month and negative or blank amounts', () => {
    expect(budgetDraftError('B1', [line('2026-04'), line('2026-04')])).toMatch(/only once/);
    expect(budgetDraftError('B1', [line('')])).toMatch(/needs a month/);
    expect(budgetDraftError('B1', [line('2026-04', '-1')])).toMatch(/zero or more/);
    expect(budgetDraftError('B1', [line('2026-04', '')])).toMatch(/zero or more/);
  });
});

describe('dates', () => {
  it('reads a SAP date as a local calendar day', () => {
    expect(sapDate('2026-04-01')).toMatch(/01.04.2026|2026.04.01/);
    expect(sapDate(null)).toBe('-');
  });

  it('names a budget month', () => {
    expect(monthLabel('2026-04-01')).toMatch(/Apr/);
    expect(monthLabel(undefined)).toBe('-');
  });
});
