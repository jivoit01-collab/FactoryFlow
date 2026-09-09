import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

import { usePermission } from '@/core/auth';
import { NON_MOVING_QUERY_KEYS } from '@/modules/dashboards/non-moving/api';
import { EXECUTION_QUERY_KEYS } from '@/modules/production/execution/api';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { PRODUCTION_CONTROL_QUERY_KEYS } from '../api';
import { FloorPanel, LinesPanel, StandingPanel } from '../components';
import {
  PRODUCTION_CONTROL_FLOOR_PERMISSIONS,
  PRODUCTION_CONTROL_LINES_PERMISSIONS,
  PRODUCTION_CONTROL_STANDING_PERMISSIONS,
} from '../constants';
import { useProductionControlBoard } from '../hooks';

/**
 * Production Control — the lines up top, the floor they feed underneath.
 *
 * That order is the point of the board: a supervisor opens it to see whether
 * the plant is moving, then whether the output has anywhere to go. The two
 * questions are related — BH-PF filling up is what happens when the lines run
 * faster than dispatch clears — and putting them on one screen is the only way
 * that shows.
 *
 * Each panel owns its own loading and error state. The runs come from Postgres
 * and the stock from SAP HANA, so they fail independently and a HANA outage must
 * not blank the half of the board that still works.
 */
export function ProductionControlDashboardPage() {
  const { hasAnyPermission } = usePermission();
  const canSeeLines = hasAnyPermission(PRODUCTION_CONTROL_LINES_PERMISSIONS);
  const canSeeFloor = hasAnyPermission(PRODUCTION_CONTROL_FLOOR_PERMISSIONS);
  const canSeeStanding = hasAnyPermission(PRODUCTION_CONTROL_STANDING_PERMISSIONS);

  const board = useProductionControlBoard({ canSeeLines, canSeeFloor, canSeeStanding });
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isFetchingAny = board.linesFetching || board.stockFetching || board.standingFetching;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTION_CONTROL_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runs() }),
        queryClient.invalidateQueries({ queryKey: NON_MOVING_QUERY_KEYS.all }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            Production Control
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {format(new Date(board.date), 'EEEE, d MMMM yyyy')}
              {isFetchingAny && ' · refreshing'}
            </span>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </header>

      {/* Jump-to chips, for the phone layout where the panels stack tall. */}
      <nav
        aria-label="Board sections"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        {[
          canSeeLines && { id: 'lines', label: 'Lines' },
          canSeeFloor && { id: 'floor', label: 'BH-PF Floor' },
          canSeeStanding && { id: 'standing', label: 'Standing' },
        ]
          .filter((section): section is { id: string; label: string } => Boolean(section))
          .map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {section.label}
            </a>
          ))}
      </nav>

      {/* Lines take the full width of the top row — there are nine of them and
          the rows carry a speed bar, so they need the room. The floor and its
          standing queue split the row beneath, which is the width their rows
          actually need. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {canSeeLines && (
          <LinesPanel
            className="lg:col-span-2"
            board={board.lines}
            loading={board.linesLoading}
            isFetching={board.linesFetching}
            error={board.linesError}
            onRetry={board.refetchLines}
          />
        )}
        {canSeeFloor && (
          <FloorPanel
            occupancy={board.occupancy}
            stockValue={board.stockValue}
            unconfiguredItems={board.unconfiguredItems}
            loading={board.stockLoading}
            isFetching={board.stockFetching}
            error={board.stockError}
            onRetry={board.refetchStock}
          />
        )}
        {canSeeStanding && (
          <StandingPanel
            items={board.standing}
            totalValue={board.standingValue}
            loading={board.standingLoading}
            isFetching={board.standingFetching}
            error={board.standingError}
            onRetry={board.refetchStanding}
          />
        )}
      </div>
    </div>
  );
}

export default ProductionControlDashboardPage;
