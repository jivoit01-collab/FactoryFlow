/**
 * Judging a production QC reading against its spec, the way the backend does.
 *
 * A port of `quality_control/services/spec_evaluation.py`, so the in/out-of-spec
 * hint on the form is the verdict the server will record — and the form can ask
 * for the entry remark an out-of-spec reading needs before the save is refused.
 * The backend stays the judge: this only predicts it.
 */

import type { DecimalValue } from '../types/productionQC.types';
import type { ParameterType } from '../types/qc.types';

const NUMBER = String.raw`\d*\.?\d+`;
const TOLERANCE_RE = new RegExp(String.raw`(${NUMBER})\s*±\s*(${NUMBER})`);
const UPPER_RE = new RegExp(
  String.raw`(?:\bNMT\b|\bNOT\s+MORE\s+THAN\b|\bMAX\b|<=|<)\D*(${NUMBER})`,
  'i',
);
const LOWER_RE = new RegExp(
  String.raw`(?:\bNLT\b|\bNOT\s+LESS\s+THAN\b|\bMIN\b|>=|>)\D*(${NUMBER})`,
  'i',
);
const DASH_RANGE_RE = new RegExp(String.raw`^\s*(${NUMBER})\s*-\s*(${NUMBER})`);
const FIRST_NUMBER_RE = new RegExp(NUMBER);

export interface SpecBounds {
  low: number | null;
  high: number | null;
}

/** A DRF decimal ("910.0000") or number as a number; null when blank. */
export function toNumber(value: DecimalValue | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "910.0000" -> "910", "1.2500" -> "1.25". */
export function formatDecimal(value: DecimalValue | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? '' : String(parsed);
}

function normalizeTolerance(text: string): string {
  return text
    .replaceAll('_', ' ')
    .replaceAll('+/-', '±')
    .replaceAll('+ /-', '±')
    .replaceAll('+ -', '±')
    .replaceAll('+-', '±');
}

/** Bounds from a free-text spec ("910±5", "NLT 20", "58.6-61.7"), or null when it is not numeric. */
export function parseSpecRange(standardValue: string | null | undefined): SpecBounds | null {
  if (!standardValue) return null;

  const tolerance = TOLERANCE_RE.exec(normalizeTolerance(standardValue));
  if (tolerance) {
    const center = Number(tolerance[1]);
    const spread = Math.abs(Number(tolerance[2]));
    return { low: center - spread, high: center + spread };
  }

  const upper = UPPER_RE.exec(standardValue);
  const lower = LOWER_RE.exec(standardValue);
  if (upper || lower) {
    return {
      low: lower ? Number(lower[1]) : null,
      high: upper ? Number(upper[1]) : null,
    };
  }

  const dash = DASH_RANGE_RE.exec(standardValue);
  if (dash) {
    const a = Number(dash[1]);
    const b = Number(dash[2]);
    if (a <= b) return { low: a, high: b };
  }
  return null;
}

/** The bounds a reading is judged on: min / max when set, else those in the spec text. */
export function specBounds(spec: {
  standard_value: string;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
}): SpecBounds | null {
  const low = toNumber(spec.min_value);
  const high = toNumber(spec.max_value);
  if (low !== null || high !== null) return { low, high };
  return parseSpecRange(spec.standard_value);
}

export interface JudgedSpec {
  standard_value: string;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
  value_type: ParameterType;
}

/**
 * true / false when the reading can be judged on its own, null when it cannot —
 * nothing entered, or a text reading / a spec with no numbers in it. Those are
 * judged by hand on the form.
 */
export function judgeReading(spec: JudgedSpec, value: string): boolean | null {
  const reading = value.trim();
  if (!reading) return null;

  if (spec.value_type === 'BOOLEAN') return reading.toLowerCase() === 'pass';

  const match = FIRST_NUMBER_RE.exec(reading);
  if (!match) return null;
  const measured = Number(match[0]);

  const bounds = specBounds(spec);
  if (!bounds || (bounds.low === null && bounds.high === null)) return null;
  if (bounds.low !== null && measured < bounds.low) return false;
  if (bounds.high !== null && measured > bounds.high) return false;
  return true;
}

/** "910±5 · 905 – 915 g": the spec as QC reads it, for a row's Spec column. */
export function describeSpec(spec: {
  standard_value: string;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
  uom: string;
}): string {
  const parts: string[] = [];
  const standard = (spec.standard_value || '').trim();
  if (standard && standard !== '-') parts.push(standard);

  const low = formatDecimal(spec.min_value);
  const high = formatDecimal(spec.max_value);
  if (low && high) parts.push(`${low} – ${high}`);
  else if (low) parts.push(`≥ ${low}`);
  else if (high) parts.push(`≤ ${high}`);

  const text = parts.join(' · ');
  if (!text) return spec.uom ? spec.uom : '-';
  return spec.uom ? `${text} ${spec.uom}` : text;
}
