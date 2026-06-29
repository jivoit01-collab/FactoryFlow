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
  BOOKED: { dot: 'bg-slate-400', headerBg: 'bg-slate-50' },
  EMPTY_IN: { dot: 'bg-blue-400', headerBg: 'bg-blue-50' },
  READY_TO_DOCK: { dot: 'bg-cyan-400', headerBg: 'bg-cyan-50' },
  DOCKED: { dot: 'bg-indigo-400', headerBg: 'bg-indigo-50' },
  PHOTO_ATTACHED: { dot: 'bg-violet-400', headerBg: 'bg-violet-50' },
  READY_FOR_GATEPASS: { dot: 'bg-purple-400', headerBg: 'bg-purple-50' },
  GATEPASS_PRINTED: { dot: 'bg-amber-400', headerBg: 'bg-amber-50' },
  PRINT_COMMITTED: { dot: 'bg-orange-400', headerBg: 'bg-orange-50' },
  DISPATCHED: { dot: 'bg-emerald-500', headerBg: 'bg-emerald-50' },
  REJECTED: { dot: 'bg-red-400', headerBg: 'bg-red-50' },
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
  BOOKED: 'border-slate-200 bg-slate-50 text-slate-600',
  EMPTY_IN: 'border-blue-200 bg-blue-50 text-blue-700',
  READY_TO_DOCK: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  DOCKED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  PHOTO_ATTACHED: 'border-violet-200 bg-violet-50 text-violet-700',
  READY_FOR_GATEPASS: 'border-purple-200 bg-purple-50 text-purple-700',
  GATEPASS_PRINTED: 'border-amber-200 bg-amber-50 text-amber-700',
  PRINT_COMMITTED: 'border-orange-200 bg-orange-50 text-orange-700',
  DISPATCHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
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

/** Whole-row tint per stage — strong enough to read in daylight. */
export const PIPELINE_STAGE_ROW_CLASSES: Record<PipelineStage, string> = {
  BOOKED: 'bg-slate-200 hover:bg-slate-300/70',
  EMPTY_IN: 'bg-blue-200 hover:bg-blue-300/70',
  READY_TO_DOCK: 'bg-cyan-200 hover:bg-cyan-300/70',
  DOCKED: 'bg-indigo-200 hover:bg-indigo-300/70',
  PHOTO_ATTACHED: 'bg-violet-200 hover:bg-violet-300/70',
  READY_FOR_GATEPASS: 'bg-purple-200 hover:bg-purple-300/70',
  GATEPASS_PRINTED: 'bg-amber-200 hover:bg-amber-300/70',
  PRINT_COMMITTED: 'bg-orange-200 hover:bg-orange-300/70',
  DISPATCHED: 'bg-emerald-200 hover:bg-emerald-300/70',
  REJECTED: 'bg-red-200 hover:bg-red-300/70',
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
