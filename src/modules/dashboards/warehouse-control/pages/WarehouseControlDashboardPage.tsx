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
import { useControlTodaysBills, WAREHOUSE_CONTROL_QUERY_KEYS } from '../api';
import {
  ControlHeadline,
  NonMovingPanel,
  PalletSpacePanel,
  TodaysBillsPanel,
  VehicleLinkingSection,
} from '../components';
import {
  WAREHOUSE_CONTROL_BILLS_PERMISSIONS,
  WAREHOUSE_CONTROL_LINKING_PERMISSIONS,
  WAREHOUSE_CONTROL_NON_MOVING_PERMISSIONS,
  WAREHOUSE_CONTROL_PALLET_SPACE_PERMISSIONS,
} from '../constants';
import { useLinkingBoard, useNonMovingSnapshot, usePalletSpace } from '../hooks';

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
  const billsQuery = useControlTodaysBills(date, canSeeBills);
  const linking = useLinkingBoard(date, canSeeLinking);

  const sections = useMemo<SectionLink[]>(() => {
    const links: SectionLink[] = [];
    if (canSeeNonMoving) links.push({ id: 'non-moving', label: 'Non-Moving' });
    if (canSeePalletSpace) links.push({ id: 'pallet-space', label: 'Pallet Space' });
    if (canSeeBills) links.push({ id: 'todays-bills', label: "Today's Bills" });
    if (canSeeLinking) {
      links.push({ id: 'vehicle-linking', label: 'Vehicle Linking' });
      links.push({ id: 'pending-linkings', label: 'Pending' });
    }
    return links;
  }, [canSeeNonMoving, canSeePalletSpace, canSeeBills, canSeeLinking]);

  const isFetchingAny =
    nonMoving.isFetching || billsQuery.isFetching || linking.isFetching || palletSpace.loading;

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
        bills={{
          meta: billsQuery.data?.meta,
          loading: billsQuery.isLoading && canSeeBills,
          available: canSeeBills,
        }}
        linking={{
          board: linking.board,
          loading: linking.isLoading,
          available: canSeeLinking,
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

      {/* `items-start` keeps a short panel from stretching to match a tall one
          in the other column. */}
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        {canSeeNonMoving && (
          <NonMovingPanel
            summary={nonMoving.summary}
            warehouses={nonMoving.warehouses}
            ageDays={nonMoving.ageDays}
            loading={nonMoving.isLoading}
            isFetching={nonMoving.isFetching}
            error={nonMoving.error}
            onRetry={nonMoving.refetch}
          />
        )}
        {canSeePalletSpace && (
          <PalletSpacePanel
            summary={palletSpace.summary}
            loading={palletSpace.loading}
            moduleOff={palletSpace.moduleOff}
          />
        )}
        {canSeeBills && (
          <TodaysBillsPanel
            bills={billsQuery.data?.data ?? []}
            meta={billsQuery.data?.meta}
            loading={billsQuery.isLoading}
            isFetching={billsQuery.isFetching}
            error={billsQuery.error}
            onRetry={() => void billsQuery.refetch()}
          />
        )}
        {canSeeLinking && (
          <VehicleLinkingSection
            board={linking.board}
            date={date}
            loading={linking.isLoading}
            isFetching={linking.isFetching}
            error={linking.error}
            onRetry={linking.refetch}
          />
        )}
      </div>
    </div>
  );
}
