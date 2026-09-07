import { Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { count } from '../../dispatch/utils/format';
import { JOURNEY_STEPS, type JourneyStep, type VehiclePlate } from '../hooks/useGateBoard';

/**
 * The road scene, in percentages of the panel rather than pixels.
 *
 * A wall board is a flex column that hands whatever height is left to this
 * panel, and that height is different on a 24" desk and a 55" screen. Every
 * fixed offset the old desk version carried — road at 172 px, truck at 246 px —
 * would have pinned the scene to the top of a tall panel and left the road
 * floating in empty space, so the whole scene is laid out as a share of the
 * panel and grows with it.
 */
const ROAD_TOP_PCT = 52;
const ROAD_HEIGHT_PCT = 24;
/** Where the wheels rest: just inside the lower half of the tarmac. */
const TRUCK_BOTTOM_PCT = 100 - (ROAD_TOP_PCT + ROAD_HEIGHT_PCT) + 6;
/** The barrier post stands on the near edge of the road. */
const BARRIER_BOTTOM_PCT = 100 - ROAD_TOP_PCT;

/** A red-and-white boom barrier standing on the road at a step. */
function GateBarrier({ pos }: { pos: number }) {
  return (
    <div
      className="absolute z-0 -translate-x-1/2"
      style={{ left: `${pos}%`, bottom: `${BARRIER_BOTTOM_PCT}%` }}
    >
      <div className="relative flex flex-col items-center">
        {/* boom arm */}
        <div className="absolute -top-1 left-1 h-1.5 w-16 origin-left -rotate-[38deg] rounded-full bg-[repeating-linear-gradient(45deg,#ef4444_0_6px,#ffffff_6px_12px)] shadow-sm" />
        {/* pivot */}
        <div className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        {/* post */}
        <div className="h-9 w-1.5 rounded-b bg-slate-400 dark:bg-slate-500" />
      </div>
    </div>
  );
}

/**
 * One coloured truck + its unique vehicle numbers, driven in and parked on the
 * road.
 *
 * The plate stack is anchored to the truck and grows upward, so a step holding
 * twenty vehicles pushes its plates into the sky rather than through the
 * tarmac. It is capped in viewport units so the stack stays inside the panel on
 * a laptop and uses the room it is given on a wall.
 */
function StepTrucks({
  step,
  plates,
  hex,
}: {
  step: JourneyStep;
  plates: VehiclePlate[];
  hex: string;
}) {
  if (plates.length === 0) return null;

  return (
    <div
      className="animate-df-drive-to absolute z-20 -translate-x-1/2"
      style={{ '--df-stop': `${step.pos}%`, bottom: `${TRUCK_BOTTOM_PCT}%` } as React.CSSProperties}
    >
      <div className="animate-df-float flex flex-col items-center gap-1">
        {/* one plate per unique vehicle on this step (×N = plans on that vehicle) */}
        {/* Capped in viewport units, not a percentage: the stack is anchored by
            `bottom` inside an auto-height box, so a percentage max-height has
            nothing to resolve against and would silently mean "no cap". The
            clamp keeps it inside the panel on a laptop and lets it use the room
            a wall gives it. */}
        <div className="wall-scroll mb-0.5 flex max-h-[clamp(60px,11vh,160px)] flex-col items-center gap-1 overflow-y-auto">
          {plates.map((plate) => (
            <div
              key={plate.key}
              title={
                plate.count > 1
                  ? `${plate.vehicle_no} · ${plate.count} plans${plate.stage_label ? ` · ${plate.stage_label}` : ''}`
                  : plate.stage_label
              }
              className="flex items-center gap-1 whitespace-nowrap rounded-[5px] border border-slate-300 bg-white px-2 py-[2px] text-[11px] font-extrabold uppercase leading-none tracking-wider text-slate-800 shadow-sm dark:border-slate-500 dark:bg-slate-100"
            >
              <span>{plate.vehicle_no}</span>
              {plate.count > 1 && (
                <span className="rounded bg-slate-800 px-1 py-[1px] text-[9px] font-bold leading-none tracking-normal text-white dark:bg-slate-700">
                  ×{plate.count}
                </span>
              )}
            </div>
          ))}
        </div>
        {/* the truck */}
        <div className="relative">
          <div
            className="flex h-9 w-16 items-center justify-center rounded-lg border border-white/40 shadow-md"
            style={{ backgroundColor: hex }}
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
 * Vehicle-journey road — coloured trucks drive in and park at their live gate
 * step (Gate In → Purpose → Gate Out), every vehicle number on a plate above
 * the truck. Data is the dispatch-pipeline board for the selected range.
 *
 * This is the one panel on the board that is a picture rather than a list, and
 * it earns the space: "three trucks stuck at Purpose" is a shape somebody
 * catches from the far side of a room, where the same three rows in a table
 * would need walking up to.
 */
export function GateVehicleJourney({
  journey,
  isLoading,
  className,
}: {
  journey: VehiclePlate[][];
  isLoading: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const palette = useWallPalette();
  const total = journey.reduce((sum, plates) => sum + plates.length, 0);

  return (
    <BoardPanel
      title="Vehicle journey"
      icon={Route}
      hex={palette.hue('journey')}
      className={className}
      aside={
        <>
          <PanelBadge>{count(total)} on the road</PanelBadge>
          <button
            type="button"
            onClick={() => navigate('/dashboards/dispatch-pipeline')}
            className="shrink-0 text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            Open board →
          </button>
        </>
      }
    >
      {/* the road scene — fills whatever height the panel was handed */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        {/* sky wash */}
        <div
          className="absolute inset-x-0 top-0 rounded-2xl bg-gradient-to-b from-sky-50/60 to-transparent dark:from-sky-500/5"
          style={{ height: `${ROAD_TOP_PCT}%` }}
        />

        {/* road */}
        <div
          className="absolute inset-x-0 rounded-xl bg-gradient-to-b from-slate-200/90 to-slate-300/80 dark:from-slate-700/50 dark:to-slate-800/60"
          style={{ top: `${ROAD_TOP_PCT}%`, height: `${ROAD_HEIGHT_PCT}%` }}
        >
          {/* dashed centre line */}
          <div className="absolute inset-x-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,#fbbf24_0_20px,transparent_20px_38px)] opacity-90" />
          {/* flowing shimmer */}
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden">
            <div className="animate-df-flow-x absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        </div>

        {/* gate barriers */}
        {JOURNEY_STEPS.map((step) => (
          <GateBarrier key={`b-${step.key}`} pos={step.pos} />
        ))}

        {/* trucks + plates */}
        {!isLoading &&
          JOURNEY_STEPS.map((step, index) => (
            <StepTrucks
              key={`t-${step.key}`}
              step={step}
              plates={journey[index] ?? []}
              hex={palette.hue(step.hue)}
            />
          ))}

        {/* step labels + counts, below the road */}
        {JOURNEY_STEPS.map((step, index) => {
          const hex = palette.hue(step.hue);
          return (
            <div
              key={`l-${step.key}`}
              className="absolute bottom-1 z-10 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${step.pos}%` }}
            >
              <div className="text-sm font-semibold text-foreground">{step.label}</div>
              <div
                className="mt-1 inline-flex min-w-[32px] items-center justify-center rounded-full px-2 py-0.5 text-sm font-bold tabular-nums"
                style={{ backgroundColor: `${hex}24`, color: hex }}
              >
                {(journey[index] ?? []).length}
              </div>
            </div>
          );
        })}

        {/* idle / loading */}
        {(isLoading || total === 0) && (
          <div
            className={cn(
              'absolute left-1/2 top-[26%] -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground',
              !isLoading && 'bg-white/70 shadow-sm dark:bg-slate-800/70',
            )}
          >
            {isLoading ? 'Loading vehicles…' : 'No vehicles on the road for this range'}
          </div>
        )}
      </div>
    </BoardPanel>
  );
}
