import { CheckCircle2, Inbox, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PageLoading } from '@/shared/components/PageLoading';
import {
  Button,
  Card,
  CardContent,
  NativeSelect,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import {
  useMyActivitySummary,
  useMyCompletedActivities,
  useMyPendingActivities,
} from '../api/activities.queries';
import { ActivityStatCards, CompletedActivityRow, PendingActivityRow } from '../components';
import type { PendingActivity } from '../types';

const WINDOWS = [
  { value: 0, label: 'Today' },
  { value: 1, label: 'Last 2 days' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
];

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Inbox; title: string; hint: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function groupByModule(items: PendingActivity[]) {
  const groups = new Map<string, PendingActivity[]>();
  for (const item of items) {
    const bucket = groups.get(item.module);
    if (bucket) bucket.push(item);
    else groups.set(item.module, [item]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * "My Activities" — the screen a user opens to see what they still owe today.
 *
 * Nothing here is self-declared: pending items exist because a real record in the
 * owning module is sitting in a status that needs this user's action, and completed
 * items exist because a record records them as the person who acted.
 */
export default function MyActivitiesPage() {
  const [days, setDays] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');

  const summaryQuery = useMyActivitySummary(days);
  const pendingQuery = useMyPendingActivities(moduleFilter || undefined);
  const completedQuery = useMyCompletedActivities(days, moduleFilter || undefined);

  const modules = useMemo(
    () => (summaryQuery.data?.modules ?? []).map((row) => row.module),
    [summaryQuery.data],
  );

  const pendingGroups = useMemo(
    () => groupByModule(pendingQuery.data ?? []),
    [pendingQuery.data],
  );

  const refreshing =
    summaryQuery.isFetching || pendingQuery.isFetching || completedQuery.isFetching;

  function refresh() {
    void summaryQuery.refetch();
    void pendingQuery.refetch();
    void completedQuery.refetch();
  }

  if (summaryQuery.isLoading) return <PageLoading />;

  if (summaryQuery.isError) {
    return (
      <div className="space-y-4">
        <DashboardHeader title="My Activities" description="Your pending and completed work" />
        <EmptyState
          icon={Inbox}
          title="Could not load your activities"
          hint="Check your connection and try again. If this keeps happening, tell your supervisor."
        />
      </div>
    );
  }

  const summary = summaryQuery.data!;

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="My Activities"
        description="Everything waiting on you right now, taken live from each module"
      >
        <div className="flex items-center gap-2">
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
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            aria-label="Filter by module"
          >
            <option value="">All modules</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </NativeSelect>
          <Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh">
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </DashboardHeader>

      <ActivityStatCards summary={summary} />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({summary.pending})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({summary.completed})</TabsTrigger>
          <TabsTrigger value="modules">By module</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 pt-3">
          {pendingQuery.isLoading ? (
            <PageLoading />
          ) : pendingGroups.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing pending"
              hint="You are clear. Anything new will appear here as soon as it reaches your stage."
            />
          ) : (
            pendingGroups.map(([module, items]) => (
              <section key={module} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {module} ({items.length})
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <PendingActivityRow
                      key={`${item.source_key}-${item.record_id}`}
                      activity={item}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 pt-3">
          {completedQuery.isLoading ? (
            <PageLoading />
          ) : (completedQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing completed in this window"
              hint="Work shows here once you action it in the module that owns the record."
            />
          ) : (
            (completedQuery.data ?? []).map((item) => (
              <CompletedActivityRow
                key={`${item.source_key}-${item.record_id}`}
                activity={item}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="modules" className="pt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-3 font-medium">Module</th>
                      <th className="p-3 text-right font-medium">Pending</th>
                      <th className="p-3 text-right font-medium">Overdue</th>
                      <th className="p-3 text-right font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.modules.map((row) => (
                      <tr key={row.module} className="border-b last:border-0">
                        <td className="p-3">{row.module}</td>
                        <td className="p-3 text-right tabular-nums">{row.pending}</td>
                        <td
                          className={
                            row.overdue > 0
                              ? 'p-3 text-right font-semibold tabular-nums text-destructive'
                              : 'p-3 text-right tabular-nums'
                          }
                        >
                          {row.overdue}
                        </td>
                        <td className="p-3 text-right tabular-nums">{row.completed}</td>
                      </tr>
                    ))}
                    {summary.modules.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          No activity in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
