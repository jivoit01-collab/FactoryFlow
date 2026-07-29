import type { UserCompany } from '@/core/auth/types/auth.types';
import { type Accent, ACCENTS } from '@/shared/components/dashboard';

/**
 * The production dashboard is company-aware: Oil and Beverages get their own
 * framing (accent, unit noun, benchmarks). Oil vs Beverages is NOT a typed
 * field in the data model, so we infer the variant from the selected company's
 * name/code and treat it as a presentation + benchmark layer. Data itself is
 * already company-scoped by the `Company-Code` header.
 */
export type ProductionVariantKey = 'oil' | 'beverages' | 'generic';

export interface ProductionVariant {
  key: ProductionVariantKey;
  label: string;
  accent: Accent;
  /** what one unit of output is called (output is measured in cases in the data) */
  unitNoun: string;
  /**
   * units per case, used to convert case-cost → per-unit cost. Defaults to 1
   * (i.e. show per-case) because the real pack size is not stored yet. Set > 1
   * once a SKU pack size exists to show a true per-bottle cost.
   */
  unitsPerCase: number;
  benchmarks: {
    /** target OEE % */
    oee: number;
    /** target waste-vs-production % (lower is better) */
    wastePct: number;
    /** target plan achievement % */
    achievement: number;
  };
}

const OIL: ProductionVariant = {
  key: 'oil',
  label: 'Oil',
  accent: ACCENTS.amber,
  unitNoun: 'case',
  unitsPerCase: 1,
  benchmarks: { oee: 75, wastePct: 2, achievement: 95 },
};

const BEVERAGES: ProductionVariant = {
  key: 'beverages',
  label: 'Beverages',
  accent: ACCENTS.sky,
  unitNoun: 'case',
  unitsPerCase: 1,
  benchmarks: { oee: 80, wastePct: 1.5, achievement: 95 },
};

const GENERIC: ProductionVariant = {
  key: 'generic',
  label: 'Production',
  accent: ACCENTS.emerald,
  unitNoun: 'case',
  unitsPerCase: 1,
  benchmarks: { oee: 75, wastePct: 2, achievement: 95 },
};

/** Pick the variant for the selected company (keyword match on name/code). */
export function variantForCompany(company: UserCompany | null | undefined): ProductionVariant {
  const s = `${company?.company_name ?? ''} ${company?.company_code ?? ''}`.toLowerCase();
  if (/oil/.test(s)) return OIL;
  if (/bever|drink|juice|water|soda/.test(s)) return BEVERAGES;
  return GENERIC;
}

/** Ordered palette (hex) for categorical charts — from the shared accents. */
export const CHART_COLORS: string[] = [
  ACCENTS.blue.hex,
  ACCENTS.emerald.hex,
  ACCENTS.amber.hex,
  ACCENTS.violet.hex,
  ACCENTS.rose.hex,
  ACCENTS.cyan.hex,
  ACCENTS.orange.hex,
  ACCENTS.indigo.hex,
  ACCENTS.pink.hex,
  ACCENTS.teal.hex,
];

/** Poll interval for the production dashboard (ms). */
export const PRODUCTION_REFRESH_MS = 60_000;

/** ₹ abbreviated (Cr / L / K). */
export function money(value: number): string {
  const n = value || 0;
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n.toFixed(n < 100 ? 2 : 0)}`;
}

/** Compact integer with Indian grouping. */
export function count(value: number): string {
  return Math.round(value || 0).toLocaleString('en-IN');
}

/** Turn a cost_distribution key (e.g. "raw_material") into a label. */
export function prettyLabel(key: string): string {
  return key
    .replace(/_cost$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
