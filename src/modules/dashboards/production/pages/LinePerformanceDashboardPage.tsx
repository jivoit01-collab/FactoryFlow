import { Maximize2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { useFullWidthPage } from '@/app/layouts/pageWidth';
import { useAuth } from '@/core/auth';
import { cn } from '@/shared/utils';

import { useFullscreen } from '../../dispatch/hooks';
import {
  BlowingPerformanceTile,
  BlowingSummary,
  CapacityBox,
  LinePerformanceTile,
  MonthPlanStrip,
  PerformanceTrend,
  ProductionRunCard,
  ProductionWallHeader,
  StoppagePanel,
} from '../components';
import { variantForCompany } from '../constants/production-dashboard.constants';
import { useBlowingPerformance, useLinePerformance, useProductionDay } from '../hooks';
import type { BoardUnit } from '../utils/boardUnit';

/** Which half of the plant the board is showing. */
type Stage = 'production' | 'blowing';

/**
 * What "good" means for blowing yield.
 *
 * Not the variant's OEE target, which grades output against a rating: a blowing
 * machine has no rating, and 25,867 bottles with 70 rejects is 99.7% good — a
 * yield graded at 75% would call every machine excellent whatever it did. This
 * is set where a bottle plant starts arguing.
 */
const BLOWING_YIELD_TARGET = 99;

/**
 * Every machine that ran, side by side — filling lines or blowing machines.
 *
 * The day wall answers "what did the plant make"; this answers "which machine
 * made it, and how well". One tile each, built around the comparison that makes
 * a count mean anything: for a line, output against what its rated speed says
 * it should have made in the time it ran; for a blowing machine, good bottles
 * against what the counter says it blew.
 *
 * The board's shape is the day's own: one tile per machine that carried a run,
 * so five lines on 17 September give five tiles and nothing else. A machine the
 * plant did not touch has no tile — every tile here is something somebody has
 * to answer for, and padding the grid out would push the ones that matter off
 * the screen.
 *
 * Both halves read their configuration as well as their runs. A filling line
 * whose run was entered without a preset still gets a rated speed and a pack
 * size from the line/SKU master; a blowing machine is graded against the three
 * targets on its preform spec, each shown only where somebody has set it.
 *
 * Tiles are ordered by what needs attention rather than by name or by output:
 * breakdown, running, stopped, finished. The machine that is costing the plant
 * money is the one the eye should land on first, and on a wall nobody scrolls
 * to find it.
 */
export default function LinePerformanceDashboardPage() {
  // Tiles this dense earn the whole window: capped at the layout's 1536px a
  // wide screen loses a column of them to the centred container's margins.
  useFullWidthPage();

  const { currentCompany } = useAuth();
  const variant = useMemo(() => variantForCompany(currentCompany), [currentCompany]);
  const unitNoun = variant.unitNoun;

  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  // A back-date sticks at a desk and expires on a wall: see `useProductionDay`.
  // Wall mode is the only place an abandoned back-date misleads a room.
  const day = useProductionDay({ autoReturn: isFullscreen });
  const board = useLinePerformance(day);
  const blowing = useBlowingPerformance(day);

  /**
   * Filling lines or blowing machines.
   *
   * One board rather than two pages: the question is the same one, the plant
   * runs both halves on the same shift, and the switch keeps the day — so
   * moving between them never silently changes the date under the reader.
   */
  const [stage, setStage] = useState<Stage>('production');
  const showing = stage === 'blowing' ? blowing : board;

  /**
   * Cases or litres, for the whole board at once.
   *
   * Cases are the default because that is what the floor books and what the
   * run register holds. Litres are the only way to compare a 5 L line with a
   * 1 L one, so the switch governs every figure on the screen — tiles, the
   * strip above them and the card underneath — rather than one panel. Blowing
   * counts bottles off a machine's own counter and has no such choice.
   */
  const [unit, setUnit] = useState<BoardUnit>('cases');

  /**
   * Which run's card is open, by id rather than by row — re-resolved from the
   * live tiles on every render, so a run that is still producing keeps climbing
   * under the reader and one that closes settles onto its final figures.
   */
  const [openRunId, setOpenRunId] = useState<number | null>(null);
  const openRun =
    openRunId == null
      ? null
      : (board.tiles.flatMap((tile) => tile.runs).find((row) => row.id === openRunId) ?? null);

  // Averaged over the days something actually ran, not over the calendar: a
  // fortnight with four idle Sundays in it is not a fortnight of low days.
  const trendPoints =
    stage === 'blowing' ? blowing.trend : unit === 'litres' ? board.litreTrend : board.trend;
  const ranDays = trendPoints.filter((point) => point.value > 0);
  const trendAverage = ranDays.length
    ? Math.round(ranDays.reduce((sum, point) => sum + point.value, 0) / ranDays.length)
    : 0;

  const empty =
    stage === 'blowing'
      ? 'No blowing run was opened on this day, so there is no machine to show.'
      : 'No production run was opened on this day, so there is no line to show.';

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden bg-background text-foreground',
        isFullscreen
          ? 'h-screen w-screen p-4'
          : 'min-h-[calc(100vh-8rem)] rounded-3xl border border-black/[0.09] p-3 dark:border-white/10',
      )}
    >
      {/* ambient wash — keeps a mostly-black board from looking switched off */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-violet-500/[0.07] to-transparent"
      />

      <ProductionWallHeader
        day={day}
        companyName={currentCompany?.company_name ?? 'No company selected'}
        variantLabel={variant.label}
        title={stage === 'blowing' ? 'Blowing performance' : 'Line performance'}
        isFetching={showing.isFetching}
        updatedAt={showing.updatedAt}
        onRefresh={showing.refetch}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
      />

      {/* The month and the day, side by side: what the plant committed to over
          the month, and what the lines that ran could have made today. Both
          production-side — the plan is finished goods, and a blowing machine
          has no rating to work a capacity out of. */}
      {stage === 'production' && (
        <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <MonthPlanStrip />
          <CapacityBox
            produced={board.cases}
            producedLitres={board.litres}
            capacity={board.capacityCases}
            capacityLitres={board.capacityLitres}
            capacityPct={board.capacityPct}
            capacityMinutes={board.capacityMinutes}
            idleMinutes={board.idleMinutes}
            breakdownMinutes={board.breakdownMinutes}
            stoppageCount={board.stoppageCount}
            lines={board.lines}
            unit={unit}
            unitNoun={unitNoun}
          />
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <StageSwitch stage={stage} onPick={setStage} />
        {/* The unit governs every figure on the board, so it sits beside the
            switch that governs which half of the plant is on it. Blowing counts
            bottles off a machine's own counter and has no such choice. */}
        {stage === 'production' && <UnitSwitch unit={unit} onPick={setUnit} unitNoun={unitNoun} />}
      </div>

      {stage === 'blowing' && (
        <BlowingSummary
          machines={blowing.machines}
          running={blowing.running}
          down={blowing.down}
          finished={blowing.finished}
          bottles={blowing.bottles}
          rejects={blowing.rejects}
          yieldPct={blowing.yieldPct}
          breakdownMinutes={blowing.breakdownMinutes}
          idleMinutes={blowing.idleMinutes}
          stoppageCount={blowing.stoppageCount}
          benchmark={BLOWING_YIELD_TARGET}
        />
      )}

      {!showing.isLoading && (
        <PerformanceTrend
          points={
            stage === 'blowing'
              ? blowing.trend
              : unit === 'litres'
                ? board.litreTrend
                : board.trend
          }
          noun={stage === 'blowing' ? 'bottles' : unit === 'litres' ? 'ltr' : `${unitNoun}s`}
          average={trendAverage}
        />
      )}

      {showing.isLoading ? (
        <TileSkeleton />
      ) : showing.tiles.length === 0 ? (
        <p className="rounded-2xl border border-black/[0.09] bg-black/[0.02] px-5 py-10 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.035]">
          {empty}
        </p>
      ) : (
        <div
          className={cn(
            'grid min-h-0 flex-1 auto-rows-min gap-3 overflow-y-auto',
            // A blowing machine takes the whole width: there are two of them in
            // this plant and rarely more than one running, so three across left
            // the row two-thirds empty while the run's own screen carried a
            // page of figures the board did not.
            stage === 'blowing' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {stage === 'blowing'
            ? blowing.tiles.map((tile) => (
                <BlowingPerformanceTile
                  key={tile.machineId}
                  tile={tile}
                  benchmark={BLOWING_YIELD_TARGET}
                />
              ))
            : board.tiles.map((tile) => (
                <LinePerformanceTile
                  key={tile.lineId}
                  tile={tile}
                  unitNoun={unitNoun}
                  unit={unit}
                  benchmark={variant.benchmarks.oee}
                  onOpen={() => setOpenRunId(tile.lead.id)}
                />
              ))}
        </div>
      )}

      {!showing.isLoading && showing.tiles.length > 0 && (
        <StoppagePanel
          stoppages={showing.stoppages}
          stoppageCount={showing.stoppageCount}
          breakdownMinutes={showing.breakdownMinutes}
          unrecoveredMinutes={showing.unrecoveredMinutes}
        />
      )}

      {stage === 'production' && openRunId != null && (
        <ProductionRunCard
          run={openRun}
          unitNoun={unitNoun}
          unit={unit}
          benchmark={variant.benchmarks.oee}
          onClose={() => setOpenRunId(null)}
        />
      )}

      {!isFullscreen && (
        <p className="flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Maximize2 className="h-3 w-3" />
          {stage === 'blowing'
            ? 'Blowing machines, graded against the targets on their preform specs.'
            : 'Click a line for its runs, segments and stoppages — or open wall mode.'}
        </p>
      )}
    </div>
  );
}

/**
 * Cases or litres, for every figure on the board at once.
 *
 * Lifted out of the summary strip when that strip went: the two cards above
 * carry the day's figures now, and a control that governs the whole board
 * belongs beside the other one that does, not inside a panel.
 */
function UnitSwitch({
  unit,
  onPick,
  unitNoun,
}: {
  unit: BoardUnit;
  onPick: (unit: BoardUnit) => void;
  unitNoun: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-black/[0.09] bg-black/[0.02] p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
      {(['cases', 'litres'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          aria-pressed={unit === option}
          className={cn(
            'rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
            unit === option
              ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option === 'cases' ? `${unitNoun}s` : 'litres'}
        </button>
      ))}
    </div>
  );
}

/**
 * Filling lines or blowing machines.
 *
 * Two words rather than a dropdown: there are exactly two halves of this plant,
 * and a reader at a wall must be able to see which one is on screen without
 * opening anything.
 */
function StageSwitch({ stage, onPick }: { stage: Stage; onPick: (stage: Stage) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-black/[0.09] bg-black/[0.02] p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
      {(['production', 'blowing'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          aria-pressed={stage === option}
          className={cn(
            'rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
            stage === option
              ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Keeps the board's shape while the first read is in flight. */
function TileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-black/[0.09] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.035]"
        />
      ))}
    </div>
  );
}
