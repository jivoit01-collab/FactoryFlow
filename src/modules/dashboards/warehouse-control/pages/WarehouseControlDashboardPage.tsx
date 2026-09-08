/**
 * Warehouse Control — one board for the four things the floor asks about.
 *
 * Non-moving stock, pallet space, today's bills and vehicle linking each have a
 * full screen elsewhere; this page puts a glance of all four side by side so a
 * manager does not have to open four tabs. Every panel reads an existing feed —
 * nothing here is a second source of truth.
 *
 * Structure is deliberately two-tier. The headline strip carries the six numbers
 * that decide whether anything needs attention; the panels below carry the
 * detail behind them, each in its own hue so a number in the strip points at the
 * panel to scroll to. Every feed is read once here and handed down, so the two
 * tiers can never disagree and a panel cannot quietly re-fetch.
 *
 * Each section is gated on its own right, so the board degrades one panel at a
 * time rather than all-or-nothing, and a feed the user may not read is never
 * requested.
 */
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { usePermission } from '@/core/auth';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { NON_MOVING_QUERY_KEYS } from '../../non-moving/api';
import { WAREHOUSE_CONTROL_QUERY_KEYS } from '../api';
import {
  ControlDetailProvider,
  ControlHeadline,
  NonMovingPanel,
  PalletSpacePanel,
  PendingLinksPanel,
  TodaysBillsPanel,
  VehicleLinkingPanel,
} from '../components';
import {
  WAREHOUSE_CONTROL_BILLS_PERMISSIONS,
  WAREHOUSE_CONTROL_LINKING_PERMISSIONS,
  WAREHOUSE_CONTROL_NON_MOVING_PERMISSIONS,
  WAREHOUSE_CONTROL_PALLET_SPACE_PERMISSIONS,
} from '../constants';
import { useLinkingBoard, useNonMovingSnapshot, usePalletSpace, useScheduledBills } from '../hooks';

interface SectionLink {
  id: string;
  label: string;
}

function todayInputValue(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function WarehouseControlDashboardPage() {
  const { hasAnyPermission } = usePermission();
  const queryClient = useQueryClient();

  // The board is a snapshot of one day. Held in state so a refresh re-reads the
  // same day rather than silently rolling over at midnight mid-session.
  const [date] = useState(todayInputValue);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canSeeNonMoving = hasAnyPermission(WAREHOUSE_CONTROL_NON_MOVING_PERMISSIONS);
  const canSeePalletSpace = hasAnyPermission(WAREHOUSE_CONTROL_PALLET_SPACE_PERMISSIONS);
  const canSeeBills = hasAnyPermission(WAREHOUSE_CONTROL_BILLS_PERMISSIONS);
  const canSeeLinking = hasAnyPermission(WAREHOUSE_CONTROL_LINKING_PERMISSIONS);

  // Read every feed once, here. The headline strip and the panels are two views
  // of the same data, so neither may hold a copy of its own.
  const nonMoving = useNonMovingSnapshot(canSeeNonMoving);
  const palletSpace = usePalletSpace(canSeePalletSpace);
  // Today's Bills and Vehicle Linking are two folds of the one Bills Linking
  // read, so it is fetched whenever either panel is on screen.
  const linking = useLinkingBoard(date, canSeeBills || canSeeLinking);
  const scheduled = useScheduledBills(date, canSeeBills);

  const sections = useMemo<SectionLink[]>(() => {
    const links: SectionLink[] = [];
    if (canSeeNonMoving) links.push({ id: 'non-moving', label: 'Non-Moving' });
    if (canSeePalletSpace) links.push({ id: 'pallet-space', label: 'Pallet Space' });
    if (canSeeLinking) links.push({ id: 'vehicle-linking', label: 'Vehicle Linking' });
    if (canSeeBills) {
      links.push({ id: 'todays-bills', label: "Today's Bills" });
      links.push({ id: 'pending-linkings', label: 'Pending' });
    }
    return links;
  }, [canSeeNonMoving, canSeePalletSpace, canSeeBills, canSeeLinking]);

  const isFetchingAny =
    nonMoving.isFetching || linking.isFetching || scheduled.isFetching || palletSpace.loading;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: NON_MOVING_QUERY_KEYS.all }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  if (sections.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          You do not have access to any section of this board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      {/* Header. Kept compact on a phone: the title line and the actions sit on
          one row and the date drops beneath rather than pushing them apart. */}
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            Warehouse Control
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {format(new Date(date), 'EEEE, d MMMM yyyy')}
              {isFetchingAny && ' · refreshing'}
            </span>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </header>

      <ControlHeadline
        palletSpace={{
          summary: palletSpace.summary,
          loading: palletSpace.loading,
          available: canSeePalletSpace && palletSpace.enabled,
        }}
        nonMoving={{
          summary: nonMoving.summary,
          loading: nonMoving.isLoading,
          available: canSeeNonMoving,
        }}
        linking={{
          board: linking.board,
          loading: linking.isLoading,
          available: canSeeBills || canSeeLinking,
        }}
        scheduled={{
          queue: scheduled.queue,
          loading: scheduled.isLoading,
          available: canSeeBills,
        }}
      />

      {/* Jump-to chips: on a phone the panels stack tall, so give the reader a
          way past them. Hidden once two columns fit on screen. */}
      {sections.length > 1 && (
        <nav
          aria-label="Board sections"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {section.label}
            </a>
          ))}
        </nav>
      )}

      {/* Six columns so the five panels tile exactly, with no hole at the end.
          Row one is the three reference panels at two columns each; row two is
          the two long dispatch lists at three each, which is the width their
          rows actually need. Panel order matches the spans on purpose — a panel
          wider than the space left on a row wraps and leaves the gap this layout
          exists to avoid. At `lg` it falls back to two columns with the pending
          queue full-width, so that row is not left half empty either.

          Panels stretch to the tallest in their row rather than sitting ragged,
          and each hands the leftover height to its list — so a short panel shows
          more rows instead of blank card. */}
      <ControlDetailProvider>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-6">
          {canSeeNonMoving && (
            <NonMovingPanel
              className="xl:col-span-2"
              summary={nonMoving.summary}
              warehouses={nonMoving.warehouses}
              ageDays={nonMoving.ageDays}
              scope={nonMoving.scope}
              loading={nonMoving.isLoading}
              isFetching={nonMoving.isFetching}
              error={nonMoving.error}
              onRetry={nonMoving.refetch}
            />
          )}
          {canSeePalletSpace && (
            <PalletSpacePanel
              className="xl:col-span-2"
              summary={palletSpace.summary}
              loading={palletSpace.loading}
              moduleOff={palletSpace.moduleOff}
            />
          )}
          {canSeeLinking && (
            <VehicleLinkingPanel
              className="xl:col-span-2"
              board={linking.board}
              loading={linking.isLoading}
              isFetching={linking.isFetching}
              error={linking.error}
              onRetry={linking.refetch}
            />
          )}
          {canSeeBills && (
            <TodaysBillsPanel
              className="xl:col-span-3"
              board={linking.board}
              loading={linking.isLoading}
              isFetching={linking.isFetching}
              error={linking.error}
              onRetry={linking.refetch}
            />
          )}
          {canSeeBills && (
            <PendingLinksPanel
              className="lg:col-span-2 xl:col-span-3"
              queue={scheduled.queue}
              date={date}
              loading={scheduled.isLoading}
              isFetching={scheduled.isFetching}
              error={scheduled.error}
              onRetry={scheduled.refetch}
            />
          )}
        </div>
      </ControlDetailProvider>
    </div>
  );
}
