/**
 * The monthly plan workbook, rolled up for reading.
 *
 * Figures are litres, as the sheet gives them. EXIM printed each one over a
 * thousand and called it "MTS", but a thousand litres is a kilolitre, not a
 * tonne (a tonne of oil is about 1,099 litres), so here the big figures are
 * kilolitres and say so.
 */
import type { MonthlyPlanRow, MonthlyPlanUpload } from '../types';

export type PlanGroupBy = 'category' | 'sub_category' | 'brand' | 'head' | 'sku';

export const GROUP_BY_OPTIONS: { value: PlanGroupBy; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'sub_category', label: 'Sub-category' },
  { value: 'brand', label: 'Brand' },
  { value: 'head', label: 'Head' },
  { value: 'sku', label: 'SKU' },
];

export const GROUP_LABEL = Object.fromEntries(
  GROUP_BY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<PlanGroupBy, string>;

export function isGroupBy(value: string | null): value is PlanGroupBy {
  return !!value && value in GROUP_LABEL;
}

type Weeks = [number, number, number, number];

export interface PlanFigures {
  commodity: number;
  commodityWeeks: Weeks;
  premium: number;
  premiumWeeks: Weeks;
  ecom: number;
  total: number;
}

export interface PlanGroup extends PlanFigures {
  key: string;
  label: string;
  /** The SKU's code, when grouped by SKU. */
  code?: string;
  skus: number;
}

function n(value: string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function figuresOf(row: MonthlyPlanRow): PlanFigures {
  return {
    commodity: n(row.commodity_monthly),
    commodityWeeks: [
      n(row.commodity_w1),
      n(row.commodity_w2),
      n(row.commodity_w3),
      n(row.commodity_w4),
    ],
    premium: n(row.premium_monthly),
    premiumWeeks: [n(row.premium_w1), n(row.premium_w2), n(row.premium_w3), n(row.premium_w4)],
    ecom: n(row.ecom_planning),
    total: n(row.total_planning),
  };
}

export function emptyFigures(): PlanFigures {
  return {
    commodity: 0,
    commodityWeeks: [0, 0, 0, 0],
    premium: 0,
    premiumWeeks: [0, 0, 0, 0],
    ecom: 0,
    total: 0,
  };
}

function add(into: PlanFigures, more: PlanFigures) {
  into.commodity += more.commodity;
  into.premium += more.premium;
  into.ecom += more.ecom;
  into.total += more.total;
  for (let w = 0; w < 4; w += 1) {
    into.commodityWeeks[w] += more.commodityWeeks[w];
    into.premiumWeeks[w] += more.premiumWeeks[w];
  }
}

export function isPlanned(row: MonthlyPlanRow): boolean {
  return n(row.total_planning) !== 0;
}

/** One line per group, biggest plan first. By SKU the key is the code: two codes can share a name. */
export function groupRows(rows: MonthlyPlanRow[], by: PlanGroupBy): PlanGroup[] {
  const groups = new Map<string, PlanGroup>();
  for (const row of rows) {
    const key = by === 'sku' ? row.code : row[by] || '';
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: (by === 'sku' ? row.sku : row[by]) || 'Not given',
        code: by === 'sku' ? row.code : undefined,
        skus: 0,
        ...emptyFigures(),
      };
      groups.set(key, group);
    }
    group.skus += 1;
    add(group, figuresOf(row));
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function sumFigures(items: PlanFigures[]): PlanFigures {
  const total = emptyFigures();
  for (const item of items) add(total, item);
  return total;
}

/** Litres, whole: `45,23,400`. */
export function fmtLitres(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Kilolitres (thousands of litres), to ten litres: `4,523.40`. */
export function fmtKl(value: number): string {
  return (value / 1000).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `2026-09-01` reads `September 2026`. Read as a local date, not UTC midnight. */
export function monthName(iso: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function versionLabel(upload: Pick<MonthlyPlanUpload, 'month' | 'version'>): string {
  return `${monthName(upload.month)} v${upload.version}`;
}
