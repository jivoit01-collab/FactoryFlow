import { Clock, UserCheck, Users } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { DAILY_TASKS_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import { ACCENTS, DashboardError, DashboardHeader, KpiStat } from '@/shared/components/dashboard';

import { useTeamDailyBoard } from '../api';
import {
  type BoardSort,
  DailyTasksDateNav,
  NotTrackedNotice,
  TeamBoardFilters,
  TeamBoardTable,
} from '../components';
import type { DailyBoardRow } from '../types';
import { todayLocalISO } from '../utils';

function sortRows(rows: DailyBoardRow[], sort: BoardSort): DailyBoardRow[] {
  const sorted = [...rows];
  switch (sort) {
    case 'most':
      return sorted.sort((a, b) => b.records_done - a.records_done);
    case 'least':
      return sorted.sort((a, b) => a.records_done - b.records_done);
    case 'last':
      return sorted.sort((a, b) =>
        (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''),
      );
    default:
      return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }
}

/**
 * Daily tasks across every user for one day.
 *
 * Supervisory, not evaluative. The API ships no score and this page computes none —
 * see NotTrackedNotice for why, and the module doc before adding any ranking.
 */
export default function TeamDailyTasksPage() {
  const [date, setDate] = useState<string>(todayLocalISO());
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<BoardSort>('name');

  const { hasPermission } = usePermission();
  const { currentCompany } = useAuth();
  const canViewEarlierDays = hasPermission(DAILY_TASKS_PERMISSIONS.VIEW_REPORTS);

  const { data: board, isLoading, isError, refetch } = useTeamDailyBoard(date);

  // 88 rows arrive in one payload, so filtering stays on the client. Deferring keeps
  // typing responsive without a debounce timer.
  const deferredSearch = useDeferredValue(search);

  const rows = useMemo(() => {
    if (!board) return [];
    const needle = deferredSearch.trim().toLowerCase();
    const filtered = needle
      ? board.users.filter(
          (u) =>
            u.full_name.toLowerCase().includes(needle) ||
            u.employee_code.toLowerCase().includes(needle),
        )
      : board.users;
    return sortRows(filtered, sort);
  }, [board, deferredSearch, sort]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Daily tasks — all users"
        description="What each person has recorded. This is not an attendance or performance report."
      >
        <DailyTasksDateNav date={date} onChange={setDate} canGoBack={canViewEarlierDays} />
      </DashboardHeader>

      {isError && (
        <DashboardError message="Could not load the daily task board." onRetry={() => refetch()} />
      )}

      {board && (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiStat icon={Users} label="Users" value={board.totals.users} accent={ACCENTS.blue} />
          <KpiStat
            icon={UserCheck}
            label="Recorded something"
            value={board.totals.with_activity}
            sub={`${board.totals.records_done.toLocaleString('en-IN')} records`}
            accent={ACCENTS.emerald}
            delayMs={60}
          />
          <KpiStat
            icon={Clock}
            label="Nothing recorded yet"
            value={board.totals.no_activity_yet}
            sub="may simply not be working today"
            accent={ACCENTS.slate}
            delayMs={120}
          />
        </div>
      )}

      <NotTrackedNotice audience="team" />

      <TeamBoardFilters
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
      />

      <TeamBoardTable rows={rows} isLoading={isLoading} />

      {board && (
        <p className="text-xs text-muted-foreground">
          Counts are for {currentCompany?.company_name ?? 'the current company'}. Some jobs are not
          company-scoped and are counted in every company.
        </p>
      )}
    </div>
  );
}
