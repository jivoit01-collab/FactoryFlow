import { describe, expect, it } from 'vitest';

import type { BreakdownCategory } from '../types';
import { breakdownTypeLabel, checkBreakdownType, subBreakdownsOf } from './breakdownType';

const category = (id: number, name: string, subs: string[] = []): BreakdownCategory => ({
  id,
  name,
  is_active: true,
  sub_categories: subs.map((sub, i) => ({ id: id * 100 + i, name: sub, is_active: true })),
  created_at: '',
  updated_at: '',
});

const categories = [category(1, 'Filler', ['Cap stuck', 'Capper']), category(2, 'Power cut')];

describe('subBreakdownsOf', () => {
  it('offers the chosen main’s subs, and none before a main is chosen', () => {
    expect(subBreakdownsOf(categories, 1).map((s) => s.name)).toEqual(['Cap stuck', 'Capper']);
    expect(subBreakdownsOf(categories, 2)).toEqual([]);
    expect(subBreakdownsOf(categories, undefined)).toEqual([]);
  });

  it('copes with a backend that does not send subs yet', () => {
    const bare = { ...category(3, 'Machine'), sub_categories: undefined };
    expect(subBreakdownsOf([bare], 3)).toEqual([]);
  });
});

describe('breakdownTypeLabel', () => {
  it('names the main and the sub', () => {
    expect(
      breakdownTypeLabel({
        breakdown_category_name: 'Filler',
        breakdown_subcategory_name: 'Cap stuck',
      }),
    ).toBe('Filler › Cap stuck');
  });

  it('is just the main where there is no sub', () => {
    expect(breakdownTypeLabel({ breakdown_category_name: 'Power cut' })).toBe('Power cut');
    expect(
      breakdownTypeLabel({ breakdown_category_name: 'Machine', breakdown_subcategory_name: '' }),
    ).toBe('Machine');
  });
});

describe('checkBreakdownType', () => {
  it('needs a sub under a main that has them, reason or not', () => {
    expect(
      checkBreakdownType(categories, { breakdown_category_id: 1, reason: 'cap jammed' }),
    ).toEqual({ field: 'breakdown_subcategory_id', message: 'Pick a sub-breakdown under Filler' });
  });

  it('takes a sub with no reason', () => {
    expect(
      checkBreakdownType(categories, { breakdown_category_id: 1, breakdown_subcategory_id: 100 }),
    ).toBeNull();
  });

  it('needs a reason under a main with no subs', () => {
    expect(checkBreakdownType(categories, { breakdown_category_id: 2, reason: '  ' })).toEqual({
      field: 'reason',
      message: 'Reason is required',
    });
    expect(
      checkBreakdownType(categories, { breakdown_category_id: 2, reason: 'grid down' }),
    ).toBeNull();
  });
});
