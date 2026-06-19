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
