import { AlertTriangle, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PageLoading } from '@/shared/components/PageLoading';
import { Button, Card, CardContent, Input, NativeSelect } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useAllUsersActivity } from '../api/activities.queries';
import type { UserActivityRow } from '../types';

const WINDOWS = [
  { value: 0, label: 'Today' },
  { value: 1, label: 'Last 2 days' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
];

type SortKey = 'overdue' | 'pending' | 'completed' | 'name';

function sortRows(rows: UserActivityRow[], key: SortKey) {
  const copy = [...rows];
  switch (key) {
    case 'pending':
      return copy.sort((a, b) => b.owned_pending - a.owned_pending);
    case 'completed':
      return copy.sort((a, b) => b.completed - a.completed);
    case 'name':
      return copy.sort((a, b) => a.full_name.localeCompare(b.full_name));
    default:
      return copy.sort(
        (a, b) => b.owned_overdue - a.owned_overdue || b.owned_pending - a.owned_pending,
      );
  }
}

/**
 * Supervisor view — who is on top of their work and who is behind.
 *
 * "Assigned" is the column that measures a person: it counts only jobs the records
 * name them for. "Shared queue" is shown separately and greyed because the same
 * backlog is visible to every permission holder — summing that column across users
 * would multiply one queue by the number of people who can see it.
 */
export default function TeamActivityPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('overdue');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, isFetching, refetch } = useAllUsersActivity(days);

  const rows = useMemo(() => {
    const all = data?.users ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? all.filter(
          (row) =>
            row.full_name.toLowerCase().includes(term) ||
            row.email.toLowerCase().includes(term) ||
            row.employee_code.toLowerCase().includes(term),
        )
      : all;
    return sortRows(filtered, sortKey);
  }, [data, search, sortKey]);

  const totals = useMemo(
    () => ({
      people: rows.length,
      assigned: rows.reduce((sum, row) => sum + row.owned_pending, 0),
      overdue: rows.reduce((sum, row) => sum + row.owned_overdue, 0),
      completed: rows.reduce((sum, row) => sum + row.completed, 0),
      behind: rows.filter((row) => row.owned_overdue > 0).length,
    }),
    [rows],
  );

  if (isLoading) return <PageLoading />;

  if (isError) {
    return (
      <div className="space-y-4">
        <DashboardHeader title="Team Activity" description="Pending and completed work by user" />
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            Could not load team activity.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Team Activity"
        description="Who is on top of their work, and who is falling behind"
      >
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            aria-label="Completed work window"
          >
            {WINDOWS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            aria-label="Sort by"
          >
            <option value="overdue">Most overdue</option>
            <option value="pending">Most assigned</option>
            <option value="completed">Most completed</option>
            <option value="name">Name</option>
          </NativeSelect>
          <Button variant="outline" size="icon" onClick={() => void refetch()} aria-label="Refresh">
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </DashboardHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'People', value: totals.people, hint: 'Active users' },
          { label: 'Assigned pending', value: totals.assigned, hint: 'Named to one person' },
          { label: 'Overdue', value: totals.overdue, hint: 'Past expected time', danger: true },
          { label: 'Completed', value: totals.completed, hint: 'In this window' },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tile.label}
              </p>
              <p
                className={cn(
                  'mt-1 text-2xl font-bold tabular-nums',
                  tile.danger && tile.value > 0 && 'text-destructive',
                )}
              >
                {tile.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {totals.behind > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span>
            <b>{totals.behind}</b> {totals.behind === 1 ? 'person has' : 'people have'} work past
            its expected time.
          </span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, employee code or email"
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 text-right font-medium">Assigned</th>
                  <th className="p-3 text-right font-medium">Overdue</th>
                  <th className="p-3 text-right font-medium">Shared queue</th>
                  <th className="p-3 text-right font-medium">Completed</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.user_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/activities/users/${row.user_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/activities/users/${row.user_id}`);
                      }
                    }}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-3">
                      <p className="font-medium leading-tight">{row.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.employee_code} · {row.email}
                      </p>
                    </td>
                    <td className="p-3 text-right tabular-nums">{row.owned_pending}</td>
                    <td
                      className={cn(
                        'p-3 text-right tabular-nums',
                        row.owned_overdue > 0 && 'font-semibold text-destructive',
                      )}
                    >
                      {row.owned_overdue}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {row.queue_pending}
                    </td>
                    <td className="p-3 text-right tabular-nums">{row.completed}</td>
                    <td className="p-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No users match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <b>Assigned</b> counts jobs the record names this person for. <b>Shared queue</b> is a
        backlog every permission holder can see, so the same items are counted for each of them —
        do not add that column up.
      </p>
    </div>
  );
}
