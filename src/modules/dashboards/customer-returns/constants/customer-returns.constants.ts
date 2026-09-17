import { GOODS_RETURN_ACCESS } from '@/config/permissions';

import type { ReturnCondition, ReturnReason, ReturnStatus } from '../types';

/**
 * Who may open the board.
 *
 * The plain "can see customer returns" right rather than a new one: the board
 * reports the returns its reader can already open one at a time, so it discloses
 * nothing extra — and it needs no permission row created on the live database
 * before anyone can use it. The backend gates the endpoint on the same right.
 */
export const CUSTOMER_RETURNS_VIEW_PERMISSIONS = GOODS_RETURN_ACCESS;

/** Returns are typed up over days, not seconds — a page refetch every 5 min is plenty. */
export const CUSTOMER_RETURNS_STALE_TIME = 5 * 60 * 1000;

/** Windows the header offers. `days` is inclusive of today. */
export const WINDOW_PRESETS: readonly { key: string; label: string; days: number }[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: '180d', label: 'Last 6 months', days: 180 },
  { key: '365d', label: 'Last 12 months', days: 365 },
] as const;

export const DEFAULT_WINDOW_KEY = '90d';

// ---------------------------------------------------------------------------
// Chart colour
// ---------------------------------------------------------------------------
//
// Two maps rather than one, and the dark set is a genuine re-step rather than a
// tint of the light one: a hue chosen to sit on white is washed out on near-black.
// Held as raw hex because recharts takes `fill`/`stroke` props that no Tailwind
// `dark:` variant can reach — the same reason `dispatch/constants/wall.palette.ts`
// resolves its hues in JS.
//
// Both sets were run through the six-check validator (lightness band, chroma
// floor, CVD separation, normal-vision floor, contrast) and pass. Two notes on
// what that leaves:
//
//  * The condition hues are a STATUS palette — teal "fine", rose "unsellable",
//    purple "wet", yellow "out of date". Their worst colour-blind separation sits
//    in the legal band only because every one of them is also carried by an icon
//    and a written label, never by colour alone. Keep those if you re-colour this.
//    Purple was picked for LEAKED over the obvious orange because orange and the
//    expiry yellow are indistinguishable to a deuteranope (ΔE 2.9).
//  * `other` is deliberately a grey. It is the overflow bucket, and giving it a
//    hue would make "we don't know" look like a finding.

export interface ReturnsPalette {
  /** Condition — stored, exact. */
  condition: Record<ReturnCondition, string>;
  /** The single hue every reason bar wears; the reason names are on the axis. */
  reason: string;
  /** Trend: everything that came back. */
  total: string;
  /** Trend: the part of it that cannot be sold again. */
  unsellable: string;
  grid: string;
  axis: string;
}

const LIGHT: ReturnsPalette = {
  condition: {
    GOOD: '#0d9488',
    DAMAGED: '#e11d48',
    LEAKED: '#9333ea',
    EXPIRED: '#ca8a04',
    OTHER: '#64748b',
  },
  reason: '#0284c7',
  total: '#0284c7',
  unsellable: '#e11d48',
  grid: '#e8eaee',
  axis: '#64748b',
};

const DARK: ReturnsPalette = {
  condition: {
    GOOD: '#0d9488',
    DAMAGED: '#e11d48',
    LEAKED: '#9333ea',
    // The only hue that has to move between themes: the light yellow reads as a
    // glare on near-black and falls outside the dark lightness band.
    EXPIRED: '#c2870a',
    OTHER: '#94a3b8',
  },
  reason: '#0284c7',
  total: '#0284c7',
  unsellable: '#e11d48',
  grid: '#2a2a2e',
  axis: '#94a3b8',
};

export const RETURNS_PALETTES = { light: LIGHT, dark: DARK } as const;

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/** Short enough for a legend chip; the API sends the long form for tooltips. */
export const CONDITION_SHORT: Record<ReturnCondition, string> = {
  GOOD: 'Good',
  DAMAGED: 'Damaged',
  LEAKED: 'Leaked',
  EXPIRED: 'Expired',
  OTHER: 'Other',
};

/**
 * The order the condition legend and every stacked bar are drawn in: worst first,
 * sellable last, so the left-hand end of every bar is the part that cost money.
 * `LEAKED` leads because it is the one condition that points at a single fixable
 * cause — a cap, a seal, a pouch weld.
 */
export const CONDITION_ORDER: readonly ReturnCondition[] = [
  'LEAKED',
  'DAMAGED',
  'EXPIRED',
  'OTHER',
  'GOOD',
] as const;

export const BASIS_LABELS: Record<string, string> = {
  INVOICE: 'Against invoice',
  DEBIT_NOTE: 'Against debit note',
  LETTER_PAD: 'Against letter pad',
};

/**
 * What each inferred reason bucket looks for, in the clerk's own words — shown
 * in the panel's tooltip so nobody reads these counts as stored facts.
 */
export const REASON_HINTS: Record<ReturnReason, string> = {
  LEAKAGE: 'Reason mentions leaking, spillage or seepage — mostly returns booked before "Leaked" was a condition',
  BREAKAGE: 'Reason mentions broken, cracked or burst stock',
  DAMAGE: 'Reason mentions dented, torn or damaged packing',
  EXPIRY: 'Reason mentions expiry, short shelf life or old stock',
  QUALITY: 'Reason mentions smell, taste, colour or a quality complaint',
  WRONG_SHORT: 'Reason mentions a wrong item, a short supply or an excess',
  UNSOLD: 'Reason mentions unsold or slow-moving market stock',
  OTHER: 'A reason was written that matches none of the buckets above',
  UNSPECIFIED: 'No reason was written on the line at all',
};

/** Status pill tone. Tailwind literals, so the JIT can see every class. */
export const STATUS_TONE: Record<ReturnStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  AWAITING_ARRIVAL: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  ARRIVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  RECEIVED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  PARTIALLY_POSTED: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  POSTED: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300',
  CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
};
