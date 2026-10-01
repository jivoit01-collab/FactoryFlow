/**
 * A report default's rules, as the backend applies them
 * (`quality_control/services/production_qc.py`): a value row replaces the
 * parameter's spec — standard, min and max together — when any of the three is
 * set, a blank standard then reading "-"; and its `value` pre-fills the reading.
 */

import type { DecimalValue, ProductionParameterDefaultValue } from '../types/productionQC.types';

const isSet = (value: DecimalValue | null | undefined) =>
  value !== null && value !== undefined && value !== '';

/** The row sets the spec when any of standard, min or max is set. */
export function setsSpec(value: ProductionParameterDefaultValue): boolean {
  return !!value.standard_value.trim() || isSet(value.min_value) || isSet(value.max_value);
}

export interface Spec {
  standard_value: string;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
}

/** The spec an entry made with this default is judged on, for one parameter. */
export function specWithDefault(
  own: Spec,
  value: ProductionParameterDefaultValue | undefined,
): Spec {
  if (!value || !setsSpec(value)) return own;
  return {
    standard_value: value.standard_value.trim() || '-',
    min_value: isSet(value.min_value) ? value.min_value : null,
    max_value: isSet(value.max_value) ? value.max_value : null,
  };
}
