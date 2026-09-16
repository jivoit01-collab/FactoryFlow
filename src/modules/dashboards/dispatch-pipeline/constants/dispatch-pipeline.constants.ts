import type { DispatchPipelineFilters, PipelineStage } from '../types';

export const DISPATCH_PIPELINE_STALE_TIME = 30_000;

/** Auto-refresh interval for the live board (ms). */
export const DISPATCH_PIPELINE_REFETCH_INTERVAL = 60_000;

interface StageMeta {
  /** Colored dot on the column header / card accent. */
  dot: string;
  /** Subtle column header background. */
  headerBg: string;
}

/** Stable visual treatment per stage (order/labels/counts come from the API). */
export const PIPELINE_STAGE_META: Record<PipelineStage, StageMeta> = {
  BOOKED: { dot: 'bg-slate-400', headerBg: 'bg-slate-50 dark:bg-muted/40' },
  EMPTY_IN: { dot: 'bg-blue-400', headerBg: 'bg-blue-50 dark:bg-blue-500/10' },
  READY_TO_DOCK: { dot: 'bg-cyan-400', headerBg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  DOCKED: { dot: 'bg-indigo-400', headerBg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  PHOTO_ATTACHED: { dot: 'bg-violet-400', headerBg: 'bg-violet-50 dark:bg-violet-500/10' },
  READY_FOR_GATEPASS: { dot: 'bg-purple-400', headerBg: 'bg-purple-50 dark:bg-purple-500/10' },
  GATEPASS_PRINTED: { dot: 'bg-amber-400', headerBg: 'bg-amber-50 dark:bg-amber-500/10' },
  PRINT_COMMITTED: { dot: 'bg-orange-400', headerBg: 'bg-orange-50 dark:bg-orange-500/10' },
  DISPATCHED: { dot: 'bg-emerald-500', headerBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  REJECTED: { dot: 'bg-red-400', headerBg: 'bg-red-50 dark:bg-red-500/10' },
};

/** Left-to-right pipeline order (mirrors the backend PIPELINE_STAGE_ORDER). */
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'BOOKED',
  'EMPTY_IN',
  'READY_TO_DOCK',
  'DOCKED',
  'PHOTO_ATTACHED',
  'READY_FOR_GATEPASS',
  'GATEPASS_PRINTED',
  'PRINT_COMMITTED',
  'DISPATCHED',
  'REJECTED',
];

/** Full badge classes (bg + text + border) per stage for the status badge. */
export const PIPELINE_STAGE_BADGE_CLASSES: Record<PipelineStage, string> = {
  BOOKED: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-600 dark:text-muted-foreground',
  EMPTY_IN: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  READY_TO_DOCK: 'border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  DOCKED: 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  PHOTO_ATTACHED: 'border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
  READY_FOR_GATEPASS: 'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  GATEPASS_PRINTED: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PRINT_COMMITTED: 'border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  DISPATCHED: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
};

/** "<status> at <module>" label per stage (mirrors the backend mapping). */
export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  BOOKED: 'not entered',
  EMPTY_IN: 'pending at gate',
  READY_TO_DOCK: 'pending at dock',
  DOCKED: 'docked at dock',
  PHOTO_ATTACHED: 'photo attached at dock',
  READY_FOR_GATEPASS: 'ready for gatepass at dock',
  GATEPASS_PRINTED: 'gatepass printed at dock',
  PRINT_COMMITTED: 'pending at sales dispatch out',
  DISPATCHED: 'dispatched at sales dispatch out',
  REJECTED: 'rejected / cancelled',
};

/**
 * Whole-row tint per stage — strong enough to read in daylight.
 *
 * Light mode paints the 200 stop opaque. Dark mode cannot: an opaque light
 * pastel under a dark theme is a glowing block with unreadable text, which is
 * exactly what these rows were. The dark counterpart is the same hue at 500 and
 * 30% over the row's surface — it tints instead of replacing, so the row keeps
 * the theme's own foreground.
 *
 * 30% is not arbitrary. These ten stages have to stay distinguishable from each
 * other at a glance; at that alpha the closest pair (violet vs purple) sits at
 * dE 4.1, which is the separation light mode already lives with (4.6), and the
 * faintest row still reads dE 9.5 against the bare card. Row text stays at
 * 6.6:1 or better throughout. Lower the alpha and the stages start merging.
 */
export const PIPELINE_STAGE_ROW_CLASSES: Record<PipelineStage, string> = {
  BOOKED: 'bg-slate-200 hover:bg-slate-300/70 dark:bg-slate-500/30 dark:hover:bg-slate-500/40',
  EMPTY_IN: 'bg-blue-200 hover:bg-blue-300/70 dark:bg-blue-500/30 dark:hover:bg-blue-500/40',
  READY_TO_DOCK: 'bg-cyan-200 hover:bg-cyan-300/70 dark:bg-cyan-500/30 dark:hover:bg-cyan-500/40',
  DOCKED: 'bg-indigo-200 hover:bg-indigo-300/70 dark:bg-indigo-500/30 dark:hover:bg-indigo-500/40',
  PHOTO_ATTACHED: 'bg-violet-200 hover:bg-violet-300/70 dark:bg-violet-500/30 dark:hover:bg-violet-500/40',
  READY_FOR_GATEPASS: 'bg-purple-200 hover:bg-purple-300/70 dark:bg-purple-500/30 dark:hover:bg-purple-500/40',
  GATEPASS_PRINTED: 'bg-amber-200 hover:bg-amber-300/70 dark:bg-amber-500/30 dark:hover:bg-amber-500/40',
  PRINT_COMMITTED: 'bg-orange-200 hover:bg-orange-300/70 dark:bg-orange-500/30 dark:hover:bg-orange-500/40',
  DISPATCHED: 'bg-emerald-200 hover:bg-emerald-300/70 dark:bg-emerald-500/30 dark:hover:bg-emerald-500/40',
  REJECTED: 'bg-red-200 hover:bg-red-300/70 dark:bg-red-500/30 dark:hover:bg-red-500/40',
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_DAYS_BACK = 3;
const DEFAULT_DAYS_AHEAD = 14;

/** Default window: recent dispatches plus the upcoming fortnight. */
export function createDefaultPipelineFilters(): DispatchPipelineFilters {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - DEFAULT_DAYS_BACK);
  const to = new Date(today);
  to.setDate(to.getDate() + DEFAULT_DAYS_AHEAD);
  return {
    date_from: toISODate(from),
    date_to: toISODate(to),
    search: '',
    stage: '',
  };
}
