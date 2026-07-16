import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDispatchPipelineBoard } from '@/modules/dashboards/dispatch-pipeline/api';
import type { PipelineCard, PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import { ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import type { GateRange } from '../constants/gate-dashboard.constants';

/** The three gate steps + their horizontal position on the road. */
const STEPS = [
  {
    key: 'in',
    label: 'Gate In',
    accent: ACCENTS.emerald,
    pos: 16,
    stages: ['BOOKED', 'EMPTY_IN'] as PipelineStage[],
  },
  {
    key: 'purpose',
    label: 'Purpose',
    accent: ACCENTS.amber,
    pos: 50,
    stages: [
      'READY_TO_DOCK',
      'DOCKED',
      'PHOTO_ATTACHED',
      'READY_FOR_GATEPASS',
      'GATEPASS_PRINTED',
      'PRINT_COMMITTED',
    ] as PipelineStage[],
  },
  {
    key: 'out',
    label: 'Gate Out',
    accent: ACCENTS.blue,
    pos: 84,
    stages: ['DISPATCHED'] as PipelineStage[],
  },
] as const;

const ROAD_TOP = 172;
const TRUCK_ANCHOR = 246; // block bottom (truck sits on the road here)
const LABEL_TOP = 256;

/** A red-and-white boom barrier standing on the road at a step. */
function GateBarrier({ pos }: { pos: number }) {
  return (
    <div
      className="absolute z-0 -translate-x-1/2"
      style={{ left: `${pos}%`, top: `${ROAD_TOP - 40}px` }}
    >
      <div className="relative flex flex-col items-center">
        {/* boom arm */}
        <div
          className="absolute -top-1 left-1 h-1.5 w-16 origin-left -rotate-[38deg] rounded-full bg-[repeating-linear-gradient(45deg,#ef4444_0_6px,#ffffff_6px_12px)] shadow-sm"
        />
        {/* pivot */}
        <div className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        {/* post */}
        <div className="h-9 w-1.5 rounded-b bg-slate-400 dark:bg-slate-500" />
      </div>
    </div>
  );
}

/** One colored truck + all its vehicle numbers, driven in and parked on the road. */
function StepTrucks({ step, cards }: { step: (typeof STEPS)[number]; cards: PipelineCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div
      className="animate-df-drive-to absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{ '--df-stop': `${step.pos}%`, top: `${TRUCK_ANCHOR}px` } as React.CSSProperties}
    >
      <div className="animate-df-float flex flex-col items-center gap-1">
        {/* every vehicle number on this step */}
        <div className="mb-0.5 flex max-h-[104px] flex-col items-center gap-1 overflow-y-auto">
          {cards.map((card) => (
            <div
              key={card.plan_id}
              title={card.stage_label}
              className="whitespace-nowrap rounded-[5px] border border-slate-300 bg-white px-2 py-[2px] text-[11px] font-extrabold uppercase leading-none tracking-wider text-slate-800 shadow-sm dark:border-slate-500 dark:bg-slate-100"
            >
              {card.vehicle_no || '—'}
            </div>
          ))}
        </div>
        {/* the truck */}
        <div className="relative">
          <div
            className={cn(
              'flex h-9 w-16 items-center justify-center rounded-lg border border-white/40 shadow-md',
              step.accent.bar,
            )}
          >
            {/* cab + box hint */}
            <div className="absolute left-1 top-1.5 h-6 w-4 rounded-sm bg-white/30" />
            <div className="absolute right-1.5 h-3 w-3 rounded-sm bg-white/40" />
          </div>
          {/* wheels */}
          <div className="mx-auto -mt-0.5 flex w-12 justify-between">
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="h-2 w-2 rounded-full bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Vehicle-journey road — colored trucks drive in and park at their live gate
 * step (Gate In → Purpose → Gate Out), every vehicle number on a plate above
 * the truck. Data is the dispatch-pipeline board for the selected range.
 */
export function GateVehicleJourney({ range }: { range: GateRange }) {
  const navigate = useNavigate();
  const board = useMemo(
    () => ({ date_from: range.from, date_to: range.to, all_companies: true }),
    [range.from, range.to],
  );
  const query = useDispatchPipelineBoard(board);

  const byStep = useMemo(() => {
    const cards = query.data?.cards ?? [];
    return STEPS.map((step) => {
      const set = new Set(step.stages);
      return cards.filter((c) => set.has(c.stage));
    });
  }, [query.data]);

  const total = byStep.reduce((sum, cards) => sum + cards.length, 0);
  const goToBoard = () => navigate('/dashboards/dispatch-pipeline');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-sm duration-500">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-primary/70" />
          <h3 className="text-base font-semibold">Vehicle journey</h3>
        </div>
        <button
          type="button"
          onClick={goToBoard}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Open board →
        </button>
      </header>

      {/* the road scene */}
      <div className="relative h-72 w-full">
        {/* sky wash */}
        <div className="absolute inset-x-0 top-0 h-44 rounded-2xl bg-gradient-to-b from-sky-50/60 to-transparent dark:from-sky-500/5" />

        {/* road */}
        <div
          className="absolute inset-x-0 rounded-xl bg-gradient-to-b from-slate-200/90 to-slate-300/80 dark:from-slate-700/50 dark:to-slate-800/60"
          style={{ top: `${ROAD_TOP}px`, height: '72px' }}
        >
          {/* dashed centre line */}
          <div className="absolute inset-x-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,#fbbf24_0_20px,transparent_20px_38px)] opacity-90" />
          {/* flowing shimmer */}
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden">
            <div className="animate-df-flow-x absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        </div>

        {/* gate barriers */}
        {STEPS.map((step) => (
          <GateBarrier key={`b-${step.key}`} pos={step.pos} />
        ))}

        {/* trucks + plates */}
        {!query.isLoading &&
          STEPS.map((step, si) => (
            <StepTrucks key={`t-${step.key}`} step={step} cards={byStep[si]} />
          ))}

        {/* step labels + counts, below the road */}
        {STEPS.map((step, si) => (
          <div
            key={`l-${step.key}`}
            className="absolute z-10 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${step.pos}%`, top: `${LABEL_TOP}px` }}
          >
            <div className="text-sm font-semibold">{step.label}</div>
            <div
              className={cn(
                'mt-1 inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                step.accent.iconBg,
                step.accent.icon,
              )}
            >
              {byStep[si].length}
            </div>
          </div>
        ))}

        {/* idle / loading */}
        {query.isLoading ? (
          <div
            className="absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground"
            style={{ top: `${ROAD_TOP - 70}px` }}
          >
            Loading vehicles…
          </div>
        ) : total === 0 ? (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm dark:bg-slate-800/70"
            style={{ top: `${ROAD_TOP - 70}px` }}
          >
            No vehicles on the road for this range
          </div>
        ) : null}
      </div>
    </div>
  );
}
