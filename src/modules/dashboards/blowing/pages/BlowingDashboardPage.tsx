import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ClipboardList,
  Coins,
  Info,
  Scale,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { BLOWING_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import {
  BLOWING_QUERY_KEYS,
  useDailyReport,
  useMachines,
  useMakeVsBuy,
  useMonthlyReport,
  useRuns as useBlowingRuns,
  useVariances,
} from '@/modules/production/blowing/api';
import { DashboardError } from '@/shared/components/dashboard';
import { getErrorMessage } from '@/shared/utils';

import {
  BlowingCostBreakdown,
  BlowingDayBreakdown,
  BlowingFilters,
  BlowingKpiStrip,
  BlowingMakeVsBuyPanel,
  BlowingRunsTable,
  BlowingTrend,
  BlowingVariancePanel,
} from '../components';
import { currentMonth, defaultDayFor, monthBounds, monthLabel, monthParts } from '../constants';
import type { BlowingDashboardFilters } from '../types';

function SectionHeading({ icon: Icon, title }: { icon: typeof Coins; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

/**
 * Blowing dashboard (/dashboards/blowing).
 *
 * A read-only roll-up of everything the Blowing section under Production
 * records: output and rejection, what the conversion costs and where that cost
 * goes, the day-wise trend, the machine and preform split for a chosen day,
 * every run in the month, the make-vs-buy verdict, and how runs graded against
 * their preform standards.
 *
 * It reads the blowing module's own endpoints (`@/modules/production/blowing/api`)
 * so the numbers here and on the Blowing Reports page are the same numbers —
 * this page adds no arithmetic of its own beyond deriving rejection shares.
 *
 * Month drives most panels; the daily report endpoint is single-date, so the
 * machine/preform split follows the separate day picker.
 */
export default function BlowingDashboardPage() {
  const { currentCompany } = useAuth();
  const { hasPermission } = usePermission();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<BlowingDashboardFilters>(() => {
    const month = currentMonth();
    return { month, day: defaultDayFor(month), machineId: undefined };
  });

  const { from, to } = useMemo(() => monthBounds(filters.month), [filters.month]);
  const { year, month: monthNo } = useMemo(() => monthParts(filters.month), [filters.month]);
  const label = useMemo(() => monthLabel(filters.month), [filters.month]);

  const machinesQuery = useMachines(true);
  const monthlyQuery = useMonthlyReport(year, monthNo);
  const dailyQuery = useDailyReport(filters.day);
  const runsQuery = useBlowingRuns({
    date_from: from,
    date_to: to,
    machine_id: filters.machineId,
  });
  const makeVsBuyQuery = useMakeVsBuy(from, to);
  const variancesQuery = useVariances(from, to);

  const canSeeRuns = hasPermission(BLOWING_PERMISSIONS.VIEW_RUN);

  const isFetching =
    monthlyQuery.isFetching ||
    dailyQuery.isFetching ||
    runsQuery.isFetching ||
    makeVsBuyQuery.isFetching ||
    variancesQuery.isFetching;

  const onRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: BLOWING_QUERY_KEYS.all });
  }, [queryClient]);

  const onSelectDay = useCallback((day: string) => {
    setFilters((prev) => ({ ...prev, day }));
  }, []);

  return (
    <div className="relative min-h-full space-y-8 p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-primary/[0.05] to-transparent" />

      {/* header */}
      <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col gap-4 duration-500 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Wind className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Blowing</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">
              {label}
            </span>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {currentCompany?.company_name ?? 'Select a company'} — preform to bottle in one view:
            output, rejection, what conversion costs, and whether making still beats buying.
          </p>
        </div>

        <BlowingFilters
          filters={filters}
          machines={machinesQuery.data ?? []}
          isFetching={isFetching}
          onChange={setFilters}
          onRefresh={onRefresh}
        />
      </header>

      {monthlyQuery.isError && (
        <DashboardError
          message={getErrorMessage(monthlyQuery.error, 'Failed to load the blowing month report.')}
          isPermissionError={(monthlyQuery.error as { status?: number })?.status === 403}
          onRetry={() => void monthlyQuery.refetch()}
        />
      )}

      {/* ---------------- Headline ---------------- */}
      <BlowingKpiStrip
        totals={monthlyQuery.data?.totals}
        month={filters.month}
        isLoading={monthlyQuery.isLoading}
      />

      {/* ---------------- Cost ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={Coins} title="What blowing costs" />
        <BlowingCostBreakdown totals={monthlyQuery.data?.totals} isLoading={monthlyQuery.isLoading} />
      </section>

      {/* ---------------- Trend ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={TrendingUp} title={`Trend · ${label}`} />
        <BlowingTrend
          report={monthlyQuery.data}
          isLoading={monthlyQuery.isLoading}
          selectedDay={filters.day}
          onSelectDay={onSelectDay}
        />
      </section>

      {/* ---------------- Day split ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={CalendarDays} title="Machine & preform split" />
        {dailyQuery.isError ? (
          <DashboardError
            message={getErrorMessage(dailyQuery.error, 'Failed to load the day breakdown.')}
            isPermissionError={(dailyQuery.error as { status?: number })?.status === 403}
            onRetry={() => void dailyQuery.refetch()}
          />
        ) : (
          <BlowingDayBreakdown
            report={dailyQuery.data}
            day={filters.day}
            isLoading={dailyQuery.isLoading}
          />
        )}
      </section>

      {/* ---------------- Runs ---------------- */}
      {canSeeRuns && (
        <section className="space-y-4">
          <SectionHeading icon={ClipboardList} title="Runs" />
          {runsQuery.isError ? (
            <DashboardError
              message={getErrorMessage(runsQuery.error, 'Failed to load the runs.')}
              isPermissionError={(runsQuery.error as { status?: number })?.status === 403}
              onRetry={() => void runsQuery.refetch()}
            />
          ) : (
            <BlowingRunsTable
              runs={runsQuery.data}
              isLoading={runsQuery.isLoading}
              monthLabel={label}
            />
          )}
        </section>
      )}

      {/* ---------------- Make vs buy + standards ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={Scale} title="Make vs buy & standards" />
        <BlowingMakeVsBuyPanel report={makeVsBuyQuery.data} isLoading={makeVsBuyQuery.isLoading} />
        <BlowingVariancePanel report={variancesQuery.data} isLoading={variancesQuery.isLoading} />
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Cost is computed per run from its meter readings, manpower and{' '}
          <strong className="mx-1">Cost Master</strong> rates (per-machine override &gt; company
          default) and frozen onto the run, so history stays costed at the rates that applied then.
          The month totals, make-vs-buy and standards panels all come from the blowing reports API —
          the same figures the Blowing section&apos;s own Reports page shows.
        </p>
      </section>
    </div>
  );
}
