import { AlertTriangle } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDispatchPipelineBoard } from '@/modules/dashboards/dispatch-pipeline/api';
import type { PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import { PIPELINE_NODES } from './dispatchDashboard.constants';

/** last-30-days window, mapped to the pipeline board's filter shape */
function useWindow() {
  return useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { date_from: iso(from), date_to: iso(to), all_companies: true };
  }, []);
}

/**
 * Animated dispatch pipeline — the live journey a vehicle takes from Booked →
 * Vehicle In → Ready to Dock → Docked → Gatepass → Dispatched. Nodes bob gently,
 * connectors shimmer with a flowing pulse, and each node deep-links to the full
 * pipeline board. Counts are live from the dispatch-pipeline board.
 */
export function DispatchPipelineFlow() {
  const navigate = useNavigate();
  const filters = useWindow();
  const query = useDispatchPipelineBoard(filters);

  const { counts, rejected, total } = useMemo(() => {
    const map = new Map<PipelineStage, number>();
    for (const col of query.data?.columns ?? []) map.set(col.stage, col.count);
    const nodeCounts = PIPELINE_NODES.map((n) =>
      n.stages.reduce((sum, s) => sum + (map.get(s) ?? 0), 0),
    );
    return {
      counts: nodeCounts,
      rejected: map.get('REJECTED') ?? 0,
      total: query.data?.meta.total ?? 0,
    };
  }, [query.data]);

  const goToBoard = () => navigate('/dashboards/dispatch-pipeline');

  return (
    <section className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/[0.03] to-transparent p-5 shadow-sm duration-500">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-primary/70" />
          <div>
            <h3 className="text-base font-semibold">Dispatch pipeline</h3>
            <p className="text-xs text-muted-foreground">
              {query.isLoading ? 'Loading live stages…' : `${total} vehicles in flight · last 30 days`}
            </p>
          </div>
        </div>
        {rejected > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {rejected} rejected
          </span>
        )}
      </header>

      <div className="flex items-start gap-1 overflow-x-auto pb-2">
        {PIPELINE_NODES.map((node, i) => {
          const accent = ACCENTS[node.accent];
          const Icon = node.icon;
          const count = counts[i] ?? 0;
          const active = count > 0;

          return (
            <Fragment key={node.key}>
              {/* node */}
              <button
                type="button"
                onClick={goToBoard}
                style={{ animationDelay: `${i * 90}ms` }}
                className="animate-in fade-in zoom-in-95 fill-mode-both group flex min-w-[116px] flex-1 flex-col items-center gap-2.5 rounded-2xl p-2 duration-500 focus:outline-none"
              >
                <div className="relative">
                  {/* soft glow */}
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 rounded-2xl opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-90',
                      accent.iconBg,
                    )}
                  />
                  {/* pulsing ring when the stage has vehicles */}
                  {active && (
                    <span
                      className={cn(
                        'pointer-events-none absolute inset-0 animate-ping rounded-2xl opacity-30',
                        accent.bar,
                      )}
                    />
                  )}
                  <div
                    style={{ animationDelay: `${i * 240}ms` }}
                    className={cn(
                      'animate-df-float relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1',
                      accent.iconBg,
                    )}
                  >
                    <Icon className={cn('h-6 w-6', accent.icon)} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums leading-none">{count}</div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">{node.label}</div>
                </div>
              </button>

              {/* connector (not after the last node) */}
              {i < PIPELINE_NODES.length - 1 && (
                <div className="relative mt-7 hidden h-1.5 min-w-[24px] flex-1 overflow-hidden rounded-full bg-muted sm:block">
                  <div
                    style={{ animationDelay: `${i * 260}ms` }}
                    className="animate-df-flow-x absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
