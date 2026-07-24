import type { OnlineQualitySpec } from '../../types';

export type SpecMap = Map<string, OnlineQualitySpec>;

export function buildSpecMap(specs: OnlineQualitySpec[] | undefined): SpecMap {
  const map: SpecMap = new Map();
  for (const spec of specs ?? []) {
    // Company spec (added last / higher priority) overrides a global default.
    if (!map.has(spec.parameter_key) || spec.company != null) map.set(spec.parameter_key, spec);
  }
  return map;
}

/** true = within spec, false = out of spec, null = not checkable / no value. */
export function evaluateSpec(
  spec: OnlineQualitySpec | undefined,
  raw: string | number | null | undefined,
): boolean | null {
  if (!spec || spec.validation_type === 'NONE') return null;
  if (raw === null || raw === undefined || raw === '') return null;
  const v = Number(raw);
  if (Number.isNaN(v)) return null;
  const lo = spec.min_value != null ? Number(spec.min_value) : null;
  const hi = spec.max_value != null ? Number(spec.max_value) : null;
  if (spec.validation_type === 'MIN') return lo == null ? null : v >= lo;
  if (spec.validation_type === 'MAX') return hi == null ? null : v <= hi;
  // RANGE
  if (lo == null && hi == null) return null;
  if (lo != null && v < lo) return false;
  if (hi != null && v > hi) return false;
  return true;
}

export function specLabel(spec: OnlineQualitySpec | undefined): string {
  if (!spec) return '';
  const text = spec.specification_text || '';
  return spec.unit ? `${text} ${spec.unit}`.trim() : text;
}
