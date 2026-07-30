import { CheckCircle2, ChevronRight, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { CompletedActivity, PendingActivity } from '../types';

function ageLabel(days: number | null) {
  if (days === null) return null;
  if (days === 0) return 'Today';
  if (days === 1) return '1 day old';
  return `${days} days old`;
}

function timeLabel(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Shell({ to, children }: { to: string | null; children: React.ReactNode }) {
  if (!to) {
    return <Card className="border-dashed">{children}</Card>;
  }
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <Link to={to} className="block">
        {children}
      </Link>
    </Card>
  );
}

/**
 * One outstanding job. The record reference and status come straight from the owning
 * module, so the row always reflects what that module currently says.
 */
export function PendingActivityRow({ activity }: { activity: PendingActivity }) {
  return (
    <Shell to={activity.url}>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium leading-tight">{activity.label}</p>
            {activity.mode === 'QUEUE' && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Users className="h-3 w-3" />
                Shared
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {activity.module}
            {activity.reference ? ` · ${activity.reference}` : ''}
            {activity.status ? ` · ${activity.status}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              activity.is_overdue ? 'font-semibold text-destructive' : 'text-muted-foreground',
            )}
          >
            <Clock className="h-3 w-3" />
            {ageLabel(activity.age_days) ?? '—'}
          </span>
          {activity.url && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardContent>
    </Shell>
  );
}

/** One finished job — the record carries this user as the actor, so it is provable. */
export function CompletedActivityRow({ activity }: { activity: CompletedActivity }) {
  return (
    <Shell to={activity.url}>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
          <div className="min-w-0">
            <p className="truncate font-medium leading-tight">{activity.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {activity.module}
              {activity.reference ? ` · ${activity.reference}` : ''}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {timeLabel(activity.completed_at)}
        </span>
      </CardContent>
    </Shell>
  );
}
