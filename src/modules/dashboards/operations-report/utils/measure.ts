/**
 * What the report counts output in, and the words and figures that go with it.
 *
 * Oil reads in litres: a cost per litre, kWh per KL. Beverages reads in boxes —
 * the cases off its runs — so its cost is per box and its power per box. The
 * cost basis is the same either way (labour, salary, power, priced waste); only
 * the divisor changes. Components take the measure from the report rather than
 * asking which company is signed in, so the unit always matches the read.
 */

import { COMPANY_CODES } from '@/config/constants';

import type { PerLitreCost, ReportTotals, ReportUnit } from '../types';
import { NIL, whole } from './format';

export interface OutputMeasure {
  unit: ReportUnit;
  /** "litre", "box" — as in "cost per box". */
  noun: string;
  /** "Litres", "Boxes" — a column header. */
  plural: string;
  /** After a figure: "1.2 lakh L", "4,200 boxes". */
  suffix: string;
  /** "₹/L", "₹/box". */
  rate: string;
  /** "kWh per KL", "kWh per box". */
  energyLabel: string;
  /** What was made, in this unit. */
  output: (totals: ReportTotals) => number | null;
  /** What each one cost, by head. */
  cost: (totals: ReportTotals) => PerLitreCost;
  /** Units of power per KL, or per box. */
  energy: (totals: ReportTotals) => number | null;
  /** That figure written out: whole per KL, to two places per box (a box is a fraction of a kWh). */
  energyText: (value: number | null) => string;
}

export const MEASURES: Record<ReportUnit, OutputMeasure> = {
  litre: {
    unit: 'litre',
    noun: 'litre',
    plural: 'Litres',
    suffix: 'L',
    rate: '₹/L',
    energyLabel: 'kWh per KL',
    output: (totals) => totals.litres,
    cost: (totals) => totals.perLitre,
    energy: (totals) => totals.kwhPerKl,
    energyText: whole,
  },
  box: {
    unit: 'box',
    noun: 'box',
    plural: 'Boxes',
    suffix: 'boxes',
    rate: '₹/box',
    energyLabel: 'kWh per box',
    output: (totals) => totals.cases,
    cost: (totals) => totals.perBox,
    energy: (totals) => totals.kwhPerBox,
    energyText: (value) => (value === null ? NIL : value.toFixed(2)),
  },
};

/** Boxes for Beverages; litres for everyone else. */
export function unitFor(companyCode: string): ReportUnit {
  return companyCode === COMPANY_CODES.JIVO_BEVERAGES ? 'box' : 'litre';
}

export function measureOf(report: { unit: ReportUnit }): OutputMeasure {
  return MEASURES[report.unit];
}
