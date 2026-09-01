import { Boxes, Maximize2, Recycle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { useAuth } from '@/core/auth';
import { useLines } from '@/modules/production/execution/api';
import { cn } from '@/shared/utils';

import { useFullscreen } from '../../dispatch/hooks';
import {
  CostBreakdownPanel,
  MaterialWallPanel,
  ProductionRunsPanel,
  ProductionTrendChart,
  ProductionWallHeader,
  ProductionWallKpis,
  ReconWallPanel,
} from '../components';
import { variantForCompany } from '../constants/production-dashboard.constants';
import { useProductionBoard, useProductionDay } from '../hooks';

/**
 * Production, today, on a wall.
 *
 * Built for the screen in the plant office rather than for a laptop: one glance
 * answers "what came off the lines, is SAP holding the same figures, what did it
 * cost and what did we throw away". Everything fits one viewport — nothing below
 * the fold exists on a wall — and every list creeps past on its own, so the
 * board is complete without anybody touching it.
 *
 * Two sources, and which one a number comes from decides how it behaves:
 *   - the runs themselves are app-only, so output, line state and the daily
 *     trend keep working when SAP is down;
 *   - the three reconciliations go out to SAP for the other half of their
 *     comparison, so a Service Layer outage empties those three panels and says
 *     so on their faces rather than quietly showing the app side alone under a
 *     heading that promises a comparison.
 *
 * The FG panel deliberately shows every SKU the plant produced that day, not
 * only the ones still running. The old desk version scoped it to in-progress
 * SKUs, which meant a wall reading zero all morning — a line that finished at
 * 11:00 still produced those cases, and the day's total has to include them.
 */
export default function ProductionDashboardPage() {
  const { currentCompany } = useAuth();
  const variant = useMemo(() => variantForCompany(currentCompany), [currentCompany]);
  const unitNoun = variant.unitNoun;

  const day = useProductionDay();
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);

  const linesQuery = useLines(true);
  const lines = useMemo(
    () => (linesQuery.data ?? []).map((line) => ({ id: line.id, name: line.name })),
    [linesQuery.data],
  );

  const board = useProductionBoard(day, selectedLine);

  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden bg-background text-foreground',
        isFullscreen
          ? 'h-screen w-screen p-4'
          : 'h-[calc(100vh-11rem)] min-h-[880px] rounded-3xl border border-black/[0.09] p-3 dark:border-white/10',
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
        lines={lines}
        selectedLine={selectedLine}
        onPickLine={setSelectedLine}
        isFetching={board.isFetching}
        updatedAt={board.updatedAt}
        onRefresh={board.refetch}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
      />

      {board.runsLoading ? (
        <BoardSkeleton />
      ) : (
        <>
          <ProductionWallKpis board={board} day={day} unitNoun={unitNoun} />

          <div className="grid h-[27%] min-h-[190px] shrink-0 grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
            <ProductionTrendChart trend={board.trend} unitNoun={unitNoun} />
            <CostBreakdownPanel cost={board.cost} unitNoun={unitNoun} />
          </div>

          {/* Four panels across on a wall, two on a laptop. */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProductionRunsPanel
              runs={board.runs}
              isLoading={board.runsLoading}
              isToday={day.isToday}
              unitNoun={unitNoun}
            />
            <ReconWallPanel
              title="Produced · App vs SAP"
              icon={Boxes}
              hue="match"
              slice={board.fg}
              appLabel="Produced"
              unitNoun={unitNoun}
              showLitres
              emptyText="Nothing was produced on this day."
            />
            <MaterialWallPanel slice={board.material} />
            <ReconWallPanel
              title="Wastage · BH-WST"
              icon={Recycle}
              hue="waste"
              slice={board.waste}
              appLabel="Wasted"
              unitNoun="unit"
              emptyText="No wastage was logged on this day."
            />
          </div>
        </>
      )}

      {!isFullscreen && (
        <p className="flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Maximize2 className="h-3 w-3" />
          Built for a wall screen &mdash; open wall mode for the full-height board.
        </p>
      )}
    </div>
  );
}

/** Keeps the wall's shape while the first read is in flight. */
function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-3 gap-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-black/[0.09] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.035]"
          />
        ))}
      </div>
      <div className="grid h-[27%] min-h-[190px] shrink-0 grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-black/[0.09] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.035]"
          />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-black/[0.09] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.035]"
          />
        ))}
      </div>
    </div>
  );
}
