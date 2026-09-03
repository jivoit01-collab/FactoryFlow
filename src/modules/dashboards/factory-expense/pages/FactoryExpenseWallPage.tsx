import { Bolt, Building2, HardHat, Users, Wrench } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { cn, getErrorMessage } from '@/shared/utils';

import { useFullscreen } from '../../dispatch/hooks';
import { useExpenseBoard } from '../api';
import { ExpenseListPanel, ExpenseStat, ExpenseTrendChart, ExpenseWallHeader } from '../components';
import { BUCKET_META, BUCKET_ORDER, DEFAULT_REFRESH_MS } from '../constants';
import type { ExpenseBucketKey, ExpenseScope } from '../types';

/** Local YYYY-MM-DD — never `toISOString()`, which shifts the day in IST. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Factory cost, today, on a wall.
 *
 * Built for the screen in the admin's room, not for a laptop: one glance
 * answers "what has the plant spent today, what is driving it, and are we over
 * for the month". Everything fits one viewport — nothing below the fold exists
 * on a wall — and the lists creep past on their own so the board is complete
 * without anybody touching it.
 *
 * Every number comes from FactoryFlow's own registers, never SAP:
 *   - labour      — the gate's own head count, priced at the configured day rate;
 *   - salary      — the department figures an admin types in, accrued daily;
 *   - electricity — the Daily Electricity readings from the maintenance module;
 *   - maintenance — spares consumed and material indents committed.
 *
 * Which means the board is only as good as its Configuration page, and it says
 * so out loud: a bucket with nothing set behind it shows the reason on its tile
 * rather than a confident zero. A wall that quietly reads ₹0 for a week is
 * worse than no wall at all.
 */
export default function FactoryExpenseWallPage() {
  const { hasPermission } = usePermission();
  const canConfigure = hasPermission(DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE);

  // From and To both start on today, so the board opens on a single day — what
  // a wall in the admin's room is for — and widens only when asked.
  // The whole factory by default: the plant shares a campus, a gate and four
  // electricity meters, so "what did we spend" spans the companies.
  const [scope, setScope] = useState<ExpenseScope>('all');
  const [range, setRange] = useState(() => ({ from: localToday(), to: localToday() }));
  const isSingleDay = range.from === range.to;
  const isToday = isSingleDay && range.to === localToday();

  /**
   * Moving From carries To with it while the board is on a single day, so
   * picking another day stays one click. Once a real range is open, From moves
   * on its own and only clamps if it would overtake To.
   */
  const changeFrom = (next: string) => {
    if (!next) return;
    setRange((current) =>
      current.from === current.to
        ? { from: next, to: next }
        : { from: next, to: next > current.to ? next : current.to },
    );
  };

  const changeTo = (next: string) => {
    if (!next) return;
    setRange((current) => ({
      from: next < current.from ? next : current.from,
      to: next,
    }));
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  const { data, isLoading, isFetching, isError, error, refetch, dataUpdatedAt } = useExpenseBoard(
    isToday ? undefined : range.from,
    isToday ? undefined : range.to,
    scope,
  );

  const visible = useMemo<ExpenseBucketKey[]>(() => {
    if (!data) return BUCKET_ORDER;
    const flags: Record<ExpenseBucketKey, boolean> = {
      LABOUR: data.settings.show_labour,
      SALARY: data.settings.show_salary,
      ELECTRICITY: data.settings.show_electricity,
      MAINTENANCE: data.settings.show_maintenance,
    };
    return BUCKET_ORDER.filter((key) => flags[key]);
  }, [data]);

  const refreshSeconds = data?.settings.refresh_seconds ?? DEFAULT_REFRESH_MS / 1000;

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden bg-background text-foreground',
        isFullscreen
          ? 'h-screen w-screen p-4'
          : 'h-[calc(100vh-11rem)] min-h-[880px] rounded-3xl border border-black/[0.09] dark:border-white/10 p-3',
      )}
    >
      {/* ambient wash — keeps a mostly-black board from looking switched off */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-teal-500/[0.07] to-transparent"
      />

      <ExpenseWallHeader
        dateFrom={range.from}
        dateTo={range.to}
        isToday={isToday}
        isSingleDay={isSingleDay}
        days={data?.days ?? 1}
        onResetToToday={() => setRange({ from: localToday(), to: localToday() })}
        onChangeFrom={changeFrom}
        onChangeTo={changeTo}
        companyCode={data?.company_code ?? '—'}
        companyCount={data?.company_count ?? 1}
        scope={scope}
        onChangeScope={setScope}
        rangeTotal={Number(data?.total.today ?? 0)}
        mtdTotal={Number(data?.total.mtd ?? 0)}
        perDay={Number(data?.total.per_day ?? 0)}
        isFetching={isFetching}
        updatedAt={dataUpdatedAt}
        refreshSeconds={refreshSeconds}
        onRefresh={() => void refetch()}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
        canConfigure={canConfigure}
      />

      {isError && (
        <p className="shrink-0 rounded-xl border border-rose-600/30 dark:border-rose-400/30 bg-rose-500/10 dark:bg-rose-400/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-200">
          {getErrorMessage(error, 'The expense board could not be read.')}
        </p>
      )}

      {isLoading && !data ? (
        <BoardSkeleton />
      ) : data ? (
        <>
          <div
            className={cn(
              'grid shrink-0 gap-3',
              visible.length === 4
                ? 'grid-cols-2 xl:grid-cols-4'
                : visible.length === 3
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2',
            )}
          >
            {visible.map((key, index) => (
              <ExpenseStat
                key={key}
                icon={BUCKET_META[key].icon}
                label={BUCKET_META[key].label}
                hex={BUCKET_META[key].hex}
                source={BUCKET_META[key].source}
                figures={data.buckets[key]}
                delayMs={index * 70}
              />
            ))}
          </div>

          <ExpenseTrendChart trend={data.trend} className="h-[30%] shrink-0" />

          {/* Four panels across on a wall, two on a laptop. A fifth (contractors)
              only appears when it says something the first four do not. */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.settings.show_labour && (
              <ExpenseListPanel
                pauseSeconds={data.settings.rotate_seconds}
                title="Labour at the gate"
                icon={HardHat}
                hex={BUCKET_META.LABOUR.hex}
                badge={`${data.labour_departments.reduce((sum, row) => sum + row.headcount, 0)} in`}
                emptyText={`Nobody has been recorded through the gate ${data.is_single_day ? 'today' : 'in this range'}.`}
                rows={data.labour_departments.map((row) => ({
                  id: row.department,
                  label: row.department,
                  meta: `${row.headcount} labourers`,
                  amount: Number(row.cost),
                }))}
              />
            )}

            {data.settings.show_salary && (
              <ExpenseListPanel
                pauseSeconds={data.settings.rotate_seconds}
                title="Salary by department"
                icon={Users}
                hex={BUCKET_META.SALARY.hex}
                badge={`${data.salary_departments.length} depts`}
                emptyText="No department salary set for this month — open Configuration."
                rows={data.salary_departments.map((row) => ({
                  id: String(row.department_id ?? 'all'),
                  label: row.department,
                  meta: `₹${Number(row.monthly).toLocaleString('en-IN')} / month`,
                  amount: Number(row.daily),
                }))}
              />
            )}

            {data.settings.show_electricity && (
              <ExpenseListPanel
                pauseSeconds={data.settings.rotate_seconds}
                title="Electricity by meter"
                icon={Bolt}
                hex={BUCKET_META.ELECTRICITY.hex}
                badge={`${Number(data.buckets.ELECTRICITY.unit ?? 0).toLocaleString('en-IN')} units`}
                emptyText={`No reading entered ${data.is_single_day ? 'today' : 'in this range'} — Maintenance › Daily Electricity.`}
                rows={data.meters.map((row) => ({
                  id: row.meter,
                  label: row.meter,
                  meta: `${Number(row.units).toLocaleString('en-IN')} units @ ₹${Number(row.rate)}`,
                  amount: Number(row.cost),
                }))}
              />
            )}

            {data.settings.show_maintenance && (
              <ExpenseListPanel
                pauseSeconds={data.settings.rotate_seconds}
                title={data.is_single_day ? 'Maintenance today' : 'Maintenance in range'}
                icon={Wrench}
                hex={BUCKET_META.MAINTENANCE.hex}
                badge={`${data.maintenance_items.length} entries`}
                emptyText={`No spares consumed and no indent committed ${data.is_single_day ? 'today' : 'in this range'}.`}
                rows={data.maintenance_items.map((row, index) => ({
                  id: `${row.kind}-${index}-${row.label}`,
                  label: row.label,
                  meta: row.kind,
                  amount: Number(row.amount),
                }))}
              />
            )}

            {/* Contractors only earn a panel when labour is the dominant line and
                there is more than one of them — otherwise it repeats the
                department panel with different words. */}
            {data.settings.show_labour && data.labour_contractors.length > 1 && (
              <ExpenseListPanel
                pauseSeconds={data.settings.rotate_seconds}
                title="Labour by contractor"
                icon={Building2}
                hex={BUCKET_META.LABOUR.hex}
                badge={`${data.labour_contractors.length} contractors`}
                emptyText={`No contractor brought labour in ${data.is_single_day ? 'today' : 'in this range'}.`}
                rows={data.labour_contractors.map((row) => ({
                  id: row.contractor,
                  label: row.contractor,
                  meta: `${row.headcount} labourers`,
                  amount: Number(row.cost),
                }))}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Keeps the wall's shape while the first read is in flight. */
function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035]"
          />
        ))}
      </div>
      <div className="h-[30%] shrink-0 animate-pulse rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035]" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035]"
          />
        ))}
      </div>
    </div>
  );
}
