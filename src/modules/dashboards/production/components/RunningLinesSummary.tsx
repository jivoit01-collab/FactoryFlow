import { Factory, PackageSearch, Radio } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRunDetail, useRuns } from '@/modules/production/execution/api/execution.queries';
import type { ProductionRun } from '@/modules/production/execution/types';
import { cn } from '@/shared/utils';

import { count, type ProductionVariant } from '../constants/production-dashboard.constants';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function liveTone(live: string | undefined, status: string): { label: string; cls: string; dot: string } {
  const s = (live || status || '').toUpperCase();
  if (s.includes('RUN')) {
    return { label: 'Running', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-500' };
  }
  if (s.includes('STOP') || s.includes('BREAK') || s.includes('DOWN')) {
    return { label: 'Stopped', cls: 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300', dot: 'bg-rose-500' };
  }
  if (s.includes('MAINT')) {
    return { label: 'Maintenance', cls: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300', dot: 'bg-amber-500' };
  }
  if (s.includes('COMPLETE')) {
    return { label: 'Completed', cls: 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300', dot: 'bg-blue-500' };
  }
  return { label: live || status || '—', cls: 'text-slate-700 bg-slate-100 dark:bg-slate-500/10 dark:text-slate-300', dot: 'bg-slate-400' };
}

/** One line card — shows produced cases (live segments today, or completed output for a past date). */
function RunningLineCard({
  run,
  variant,
  index,
  live,
  onOpen,
}: {
  run: ProductionRun;
  variant: ProductionVariant;
  index: number;
  live: boolean;
  onOpen: (id: number) => void;
}) {
  const detail = useRunDetail(run.id);
  const output = useMemo(() => {
    const segs = detail.data?.segments ?? [];
    const segTotal = segs.reduce((s, seg) => s + (Number(seg.produced_cases) || 0), 0);
    return segTotal > 0 ? segTotal : Number(run.total_production) || 0;
  }, [detail.data, run.total_production]);

  const tone = liveTone(run.live_status, run.status);

  return (
    <button
      type="button"
      onClick={() => onOpen(run.id)}
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm',
        'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        variant.accent.glow,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{run.line_name || `Line ${run.line}`}</span>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', tone.cls)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
          {tone.label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <PackageSearch className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate" title={run.product}>{run.product || '—'}</span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Run #{run.run_number} · Produced{' '}
        <span className="font-semibold text-foreground tabular-nums">{count(output)}</span>{' '}
        {variant.unitNoun}s
        {live && <span className="ml-1 text-[10px] uppercase tracking-wide text-emerald-600">live</span>}
      </div>
    </button>
  );
}

/**
 * Production lines for the selected date — running (in-progress) lines today, or
 * the lines that produced on a past date. One card per line (latest run).
 */
export function RunningLinesSummary({
  variant,
  range,
}: {
  variant: ProductionVariant;
  range: { from: string; to: string };
}) {
  const navigate = useNavigate();
  const today = useMemo(() => todayISO(), []);
  const isToday = range.from === range.to && range.from === today;
  const singleDay = range.from === range.to;

  // Fetch every run for the day/range (all statuses — running, stopped,
  // completed, draft, breakdown) so the dashboard mirrors the execution list.
  const filters = useMemo(() => {
    if (singleDay) return { date: range.from };
    return { date_from: range.from, date_to: range.to };
  }, [singleDay, range.from, range.to]);

  const query = useRuns(filters);

  // One card per run, newest first (matches the execution page order).
  const runs = useMemo(() => {
    const list: ProductionRun[] = query.data ?? [];
    return [...list].sort((a, b) => (b.run_number ?? 0) - (a.run_number ?? 0));
  }, [query.data]);

  const openRun = (id: number) => navigate(`/production/execution/runs/${id}`);

  const title = isToday
    ? 'Production runs today'
    : singleDay
      ? `Production runs · ${range.from}`
      : `Production runs · ${range.from} → ${range.to}`;
  const subtitle = isToday
    ? 'All runs today — running, completed, draft & stopped'
    : 'All production runs in the selected range';
  const emptyText = 'No production runs on the selected date.';

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-3xl border border-border/60 bg-card p-5 shadow-sm duration-500">
      <header className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', variant.accent.iconBg)}>
          <Factory className={cn('h-5 w-5', variant.accent.icon)} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {title} · <span className="tabular-nums">{count(runs.length)}</span>
          </h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-8 text-sm text-muted-foreground">
          <Radio className="h-4 w-4" /> {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((run, i) => (
            <RunningLineCard
              key={run.id}
              run={run}
              variant={variant}
              index={i}
              live={isToday && (run.live_status || run.status || '').toUpperCase().includes('RUN')}
              onOpen={openRun}
            />
          ))}
        </div>
      )}
    </section>
  );
}
