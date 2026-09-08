/**
 * The board's colour vocabulary.
 *
 * Each panel owns one hue, and it is used consistently: the section's icon chip,
 * its accent rule, and the headline tile that summarises it. A reader learns
 * "amber means non-moving" once and can then find that number without reading a
 * label. Written as Tailwind class strings rather than raw hex so the palette
 * follows the app's light/dark themes for free.
 */

export type ControlAccent = 'amber' | 'indigo' | 'sky' | 'emerald' | 'rose' | 'slate';

export interface AccentClasses {
  /** Icon chip: tinted background + foreground. */
  chip: string;
  /** Thin rule down the left edge of a section card. */
  rule: string;
  /** Value text when a tile should carry the hue. */
  text: string;
  /** Solid fill for meters and bars. */
  fill: string;
  /** Faint fill for the empty part of a meter. */
  track: string;
}

export const ACCENTS: Record<ControlAccent, AccentClasses> = {
  amber: {
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rule: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    fill: 'bg-amber-500',
    track: 'bg-amber-500/15',
  },
  indigo: {
    chip: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    rule: 'bg-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    fill: 'bg-indigo-500',
    track: 'bg-indigo-500/15',
  },
  sky: {
    chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    rule: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    fill: 'bg-sky-500',
    track: 'bg-sky-500/15',
  },
  emerald: {
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rule: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    fill: 'bg-emerald-500',
    track: 'bg-emerald-500/15',
  },
  rose: {
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    rule: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    fill: 'bg-rose-500',
    track: 'bg-rose-500/15',
  },
  slate: {
    chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    rule: 'bg-slate-400',
    text: 'text-foreground',
    fill: 'bg-slate-500',
    track: 'bg-slate-500/15',
  },
};

/** Which hue each section owns. */
export const SECTION_ACCENT = {
  nonMoving: 'amber',
  palletSpace: 'indigo',
  bills: 'sky',
  linking: 'emerald',
  pending: 'rose',
} as const satisfies Record<string, ControlAccent>;

/**
 * Occupancy bands for the pallet meter. Below `busy` the warehouse has room;
 * past `full` there is nowhere left to put a pallet down.
 */
export const OCCUPANCY_BANDS = { busy: 70, full: 90 } as const;

/** Hue for a fill level — green with room, amber filling up, red when packed. */
export function occupancyAccent(percent: number): ControlAccent {
  if (percent >= OCCUPANCY_BANDS.full) return 'rose';
  if (percent >= OCCUPANCY_BANDS.busy) return 'amber';
  return 'emerald';
}
