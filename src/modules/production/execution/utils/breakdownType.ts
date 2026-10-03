/**
 * A breakdown's type is a main breakdown and, where the main has any, one of
 * its sub-breakdowns: Filler › Cap stuck. A main with none (Power cut,
 * Manpower) is logged on its own, and the typed reason is its only detail.
 */
import type { BreakdownCategory, BreakdownSubCategory } from '../types';

/** The sub-breakdowns offered under a main breakdown; none if it has none. */
export function subBreakdownsOf(
  categories: BreakdownCategory[],
  categoryId: number | null | undefined,
): BreakdownSubCategory[] {
  return categories.find((c) => c.id === categoryId)?.sub_categories ?? [];
}

/** 'Filler › Cap stuck', or just the main breakdown where there is no sub. */
export function breakdownTypeLabel(breakdown: {
  breakdown_category_name?: string | null;
  breakdown_subcategory_name?: string | null;
}): string {
  const main = breakdown.breakdown_category_name ?? '';
  const sub = breakdown.breakdown_subcategory_name ?? '';
  return main && sub ? `${main} › ${sub}` : main || sub;
}

export interface BreakdownTypeError {
  field: 'breakdown_subcategory_id' | 'reason';
  message: string;
}

/**
 * The server's rule, checked before sending: a main with sub-breakdowns needs
 * one of them, and without a sub the reason is required.
 */
export function checkBreakdownType(
  categories: BreakdownCategory[],
  values: {
    breakdown_category_id?: number;
    breakdown_subcategory_id?: number | null;
    reason?: string;
  },
): BreakdownTypeError | null {
  if (values.breakdown_subcategory_id) return null;
  const main = categories.find((c) => c.id === values.breakdown_category_id);
  if (main?.sub_categories?.length) {
    return {
      field: 'breakdown_subcategory_id',
      message: `Pick a sub-breakdown under ${main.name}`,
    };
  }
  if (!values.reason?.trim()) return { field: 'reason', message: 'Reason is required' };
  return null;
}
