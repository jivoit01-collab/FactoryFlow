// Small helpers shared by the Daily Electricity++ tabs.

import type { TreeMeter } from '../../types';

/**
 * The factory's calendar day, not UTC's. `toISOString()` answers in UTC, which
 * in India is still yesterday until 05:30 — the morning round would land on
 * the wrong day.
 */
export function localISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return localISO();
}

export function firstOfMonthISO(date: Date = new Date()): string {
  return localISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

/** "2026-09-24" moved by ``days``, in local time. */
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return localISO(new Date(y, m - 1, d + days));
}

/** "24 Sep 2026" — how dates read on the floor. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Units read as whole numbers; a fraction of a unit is noise on a wall. */
export function fmtUnits(value: string | number | null | undefined): string {
  return toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function fmtMoney(value: string | number | null | undefined): string {
  return `₹${toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** "40.0000" reads as ×40; only show decimals when the MF actually has them. */
export function trimFactor(factor: string | null | undefined): string {
  const value = parseFloat(factor ?? '');
  return Number.isFinite(value) ? String(value) : String(factor ?? '');
}

/** "06:30:00" from the API reads as 06:30 in an input and a table cell. */
export function trimSeconds(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '';
}

/** Local "HH:MM" — the default for "when was this read?". */
export function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * One colour per party, fixed to the party and never to its rank, so Oil is
 * the same blue on every tab however many parties a span happens to hold.
 * Keyed by the party key the API sends ("company:JIVO_OIL").
 *
 * The four hues are the first four categorical slots of the data-viz reference
 * palette, each with its own dark-surface step, and pass its colour-vision
 * checks in both modes. Aqua and yellow fall under 3:1 on the light surface,
 * which is why every figure they mark is also printed as text beside it.
 * "Unassigned" is deliberately a neutral grey — it is nobody, not a party —
 * and carries a hatch as well (see UNASSIGNED_HATCH) so it never reads as one.
 */
const PARTY_COLOURS: Record<string, string> = {
  'company:JIVO_OIL': 'bg-[#2a78d6] dark:bg-[#3987e5]',
  'company:JIVO_BEVERAGES': 'bg-[#eb6834] dark:bg-[#d95926]',
  'company:JIVO_MART': 'bg-[#1baf7a] dark:bg-[#199e70]',
  unassigned: 'bg-[#8f8e89] dark:bg-[#75746f]',
};
const CONSUMER_COLOUR = 'bg-[#eda100] dark:bg-[#c98500]';
const OTHER_COLOUR = 'bg-[#e87ba4] dark:bg-[#d55181]';

export function partyColour(key: string): string {
  if (PARTY_COLOURS[key]) return PARTY_COLOURS[key];
  return key.startsWith('consumer:') ? CONSUMER_COLOUR : OTHER_COLOUR;
}

/** The texture laid over "unassigned", so it is never identified by colour alone. */
export const UNASSIGNED_HATCH = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent 0 3px, rgba(255,255,255,0.45) 3px 5px)',
} as const;

/** Every meter under ``meterId`` in today's tree — a parent may never be one. */
export function descendantIds(meterId: number, meters: TreeMeter[]): Set<number> {
  const children = new Map<number, number[]>();
  for (const meter of meters) {
    const parent = meter.tree?.parent;
    if (parent != null && meter.tree?.in_service) {
      children.set(parent, [...(children.get(parent) ?? []), meter.id]);
    }
  }
  const found = new Set<number>();
  const stack = [...(children.get(meterId) ?? [])];
  while (stack.length) {
    const next = stack.pop() as number;
    if (found.has(next)) continue;
    found.add(next);
    stack.push(...(children.get(next) ?? []));
  }
  return found;
}

/** Meters that can be a parent: in the tree today, not a second register. */
export function parentCandidates(meters: TreeMeter[], excluding?: number): TreeMeter[] {
  const blocked = excluding != null ? descendantIds(excluding, meters) : new Set<number>();
  if (excluding != null) blocked.add(excluding);
  return meters
    .filter((meter) => meter.register_of == null && meter.tree?.in_service && !blocked.has(meter.id))
    .sort((a, b) => (a.tree?.order ?? 0) - (b.tree?.order ?? 0));
}

/** "   Lab" — a meter's name indented to its depth, for native selects. */
export function indentedName(meter: TreeMeter): string {
  const depth = meter.tree?.depth ?? 0;
  return `${'   '.repeat(depth)}${depth ? '└ ' : ''}${meter.name}`;
}
