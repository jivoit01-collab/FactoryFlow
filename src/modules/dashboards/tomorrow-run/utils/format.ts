/**
 * The page's words and numbers, as the signed-off Vercel page wrote them.
 * 1 T = 1,000 L, flat. Times are the engine's clock strings ("18:46",
 * "04:50 +1 day"), where the plant day starts at 7:30.
 */

export const T = (l: number | null | undefined): string =>
  l == null || Number.isNaN(l)
    ? '—'
    : `${(Math.round(l / 100) / 10).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} T`;

/** A few litres never reads as "0.0 T". */
export const Tl = (l: number | null | undefined): string =>
  l != null && l > 0 && l < 50 ? `${Math.round(l)} L` : T(l);

export const n0 = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString('en-IN');

export const when = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const dayName = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export const dShort = (iso: string | null | undefined): string =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '—';

export const cap = (s: string | null | undefined): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

/** "MUSTARD KACHI GHANI 1 LTR 20 PCS" -> "Mustard Kachi Ghani 1 L" */
export function nice(n: string | null | undefined): string {
  const s = String(n || '')
    .replace(/\(\s*\d+\s*SET\s*\)/gi, '')
    .replace(/\b\d+\s*PCS\b/gi, '')
    .replace(/\bLTRS?\b/gi, 'L')
    .replace(/\bMLS\b/gi, 'ml')
    .replace(/\bGMS\b/gi, 'g')
    .replace(/\bKGS\b/gi, 'kg')
    .replace(/\s+/g, ' ')
    .trim();
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bMl\b/g, 'ml')
    .replace(/\bKg\b/g, 'kg')
    .replace(/(\d) G\b/g, '$1 g');
}

/** Hours from 7:30 on the clock for an engine time string. */
export const hOf = (t: string | null | undefined): number => {
  if (!t) return 0;
  const [hh, mm] = t.split(' ')[0].split(':').map(Number);
  let h = hh + mm / 60 - 7.5;
  const days = /\+(\d+)/.exec(t);
  if (days) h += 24 * Number(days[1]);
  return Math.max(0, h);
};

/** "18:46" -> "6:46 pm", "04:50 +1 day" -> "4:50 am (overnight)" */
export const finTxt = (t: string | null | undefined): string => {
  if (!t) return '—';
  const overnight = t.includes('+');
  const [hh, mm] = t.split(' ')[0].split(':').map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}${overnight ? ' (overnight)' : ''}`;
};

// ---------------------------------------------------------------------------
// Pack groups: by volume, then type. One colour each, used everywhere.
// ---------------------------------------------------------------------------

export type GroupKey = 'small' | '1l' | '2l' | 'mid' | '5l' | 'tin' | 'pouch' | 'combo' | 'other';

export interface PackGroup {
  k: GroupKey;
  title: string;
  cls: string;
  test: (pack: string, type: string) => boolean;
}

export const GROUPS: PackGroup[] = [
  {
    k: 'small',
    title: 'Small bottles · 200 to 500 ml',
    cls: 'small-c',
    test: (p) => /ml$/.test(p),
  },
  { k: '1l', title: '1 L bottles', cls: 'l1-c', test: (p, t) => p === '1 L' && t !== 'tin' },
  { k: '2l', title: '2 L bottles', cls: 'l2-c', test: (p, t) => p === '2 L' && t !== 'tin' },
  {
    k: 'mid',
    title: '3 L and 4 L',
    cls: 'mid-c',
    test: (p, t) => (p === '3 L' || p === '4 L') && t !== 'tin',
  },
  { k: '5l', title: '5 L bottles', cls: 'l5-c', test: (p, t) => p === '5 L' && t !== 'tin' },
  {
    k: 'tin',
    title: 'Tins · 3 L, 5 L, 15 L, 12 to 15 kg',
    cls: 'tin-c',
    test: (p, t) => t === 'tin' || /tin/.test(p),
  },
  { k: 'pouch', title: 'Pouches', cls: 'pouch-c', test: (p, t) => t === 'pouch' || p === 'pouch' },
  {
    k: 'combo',
    title: 'Combo packs · two bottles in one set',
    cls: 'combo-c',
    test: (p, t) => t === 'combo' || p === 'combo',
  },
  { k: 'other', title: 'Other', cls: 'other-c', test: () => true },
];

export const grp = (r: { pack?: string | null; type?: string | null }): PackGroup =>
  GROUPS.find((g) => g.test(r.pack || '', r.type || '')) as PackGroup;

/** A machine's icon is the pack it fills first tomorrow. */
export const SHAPE: Record<GroupKey, 'bottle' | 'can' | 'tin' | 'pouch' | 'combo'> = {
  small: 'bottle',
  '1l': 'bottle',
  '2l': 'bottle',
  mid: 'can',
  '5l': 'can',
  tin: 'tin',
  pouch: 'pouch',
  combo: 'combo',
  other: 'bottle',
};

export const pct = (a: number, b: number): number =>
  b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0;
