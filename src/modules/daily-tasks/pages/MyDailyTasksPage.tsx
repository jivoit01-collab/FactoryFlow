import { useState } from 'react';

import { DashboardError, DashboardHeader, DashboardLoading } from '@/shared/components/dashboard';
import { Card, CardContent } from '@/shared/components/ui';

import { useMyDailySheet } from '../api';
import {
  CadenceSection,
  DailySheetStats,
  DailyTasksDateNav,
  NotTrackedNotice,
} from '../components';
import { CADENCE_ORDER } from '../constants';
import { todayLocalISO } from '../utils';

/**
 * My daily tasks — one user's job sheet for one day.
 *
 * Everything a user is responsible for, grouped by how often it is expected, with what
 * they have already recorded today. Read the module doc before adding a percentage, a
 * progress ring, or a red state: none of those are omissions.
 */
export default function MyDailyTasksPage() {
  const [date, setDate] = useState<string>(todayLocalISO());
  const { data: sheet, isLoading, isError, refetch } = useMyDailySheet(date);

  const groups = sheet
    ? CADENCE_ORDER.map((cadence) => sheet.groups.find((g) => g.cadence === cadence)).filter(
        (group): group is NonNullable<typeof group> => !!group && group.jobs.length > 0,
      )
    : [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My daily tasks"
        description="What you have recorded today, and what is still open. Nothing here is a score."
      >
        <DailyTasksDateNav date={date} onChange={setDate} />
      </DashboardHeader>

      {isLoading && <DashboardLoading />}

      {isError && (
        <DashboardError message="Could not load your daily tasks." onRetry={() => refetch()} />
      )}

      {sheet && (
        <>
          <DailySheetStats sheet={sheet} />
          <NotTrackedNotice audience="me" />

          {groups.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No tracked jobs are mapped to your permissions yet. Ask an administrator to add
                  you to the right access group.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <CadenceSection key={group.cadence} group={group} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
