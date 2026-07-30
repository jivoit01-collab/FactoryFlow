import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageLoading } from '@/shared/components/PageLoading';
import {
  Badge,
  Button,
  Card,
  CardContent,
  NativeSelect,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import { useUserActivityDetail } from '../api/activities.queries';
import { ActivityStatCards, CompletedActivityRow, PendingActivityRow } from '../components';

const WINDOWS = [
  { value: 0, label: 'Today' },
  { value: 1, label: 'Last 2 days' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
];

/**
 * One person's full activity picture. Reachable from Team Activity, and also by a
 * user for their own id — the backend allows self-access without the supervisor
 * permission so this page can be reused.
 */
export default function UserActivityDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(0);

  const parsed = Number(userId);
  const { data, isLoading, isError } = useUserActivityDetail(
    Number.isFinite(parsed) ? parsed : null,
    days,
  );

  if (isLoading) return <PageLoading />;

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/activities/team')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to team
        </Button>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            Could not load this user&apos;s activities.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1"
            onClick={() => navigate('/activities/team')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to team
          </Button>
          <h1 className="text-2xl font-bold leading-tight">{data.user.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.user.employee_code} · {data.user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.user.groups.map((group) => (
              <Badge key={group} variant="secondary" className="text-[10px]">
                {group}
              </Badge>
            ))}
            {data.user.groups.length === 0 && (
              <span className="text-xs text-muted-foreground">
                No access groups — this user has no assigned work.
              </span>
            )}
          </div>
        </div>
        <NativeSelect
          value={String(days)}
          onChange={(event) => setDays(Number(event.target.value))}
          aria-label="Completed work window"
          className="w-40"
        >
          {WINDOWS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <ActivityStatCards summary={data.summary} />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({data.pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({data.completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 pt-3">
          {data.pending.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                Nothing pending for this user.
              </CardContent>
            </Card>
          ) : (
            data.pending.map((item) => (
              <PendingActivityRow key={`${item.source_key}-${item.record_id}`} activity={item} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 pt-3">
          {data.completed.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                Nothing completed in this window.
              </CardContent>
            </Card>
          ) : (
            data.completed.map((item) => (
              <CompletedActivityRow key={`${item.source_key}-${item.record_id}`} activity={item} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
