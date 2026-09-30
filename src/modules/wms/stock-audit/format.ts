import type { ItemCategory } from './types';

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  RM: 'Raw Material',
  PM: 'Packing Material',
  FG: 'Finished Goods',
  OTHER: 'Other',
};

export const CATEGORY_ORDER: ItemCategory[] = ['RM', 'PM', 'FG', 'OTHER'];

/** '1500.5' → '1,500.5'; null → '—'. */
export function qty(value: string | null | undefined): string {
  if (value == null) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : value;
}

/** '2026-09-30T05:22:00Z' → '30 Sept 2026, 10:52 am'. */
export function when(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** A difference as a signed figure; its colour only repeats the sign. */
export function differenceLabel(value: string | null | undefined): {
  text: string;
  tone: 'match' | 'short' | 'excess' | 'none';
} {
  if (value == null) return { text: '—', tone: 'none' };
  const n = Number(value);
  if (n === 0) return { text: '0', tone: 'match' };
  return n < 0 ? { text: qty(value), tone: 'short' } : { text: `+${qty(value)}`, tone: 'excess' };
}
