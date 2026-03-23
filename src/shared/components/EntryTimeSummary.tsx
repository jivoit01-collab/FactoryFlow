import { Clock, Timer } from 'lucide-react';

import { Card, CardContent } from './ui';

interface EntryTimeSummaryProps {
  startedAt: string;
  completedAt: string;
}

function formatDateTime(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
}

function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return '-';

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    if (hours > 0) return `${days}d ${hours}h ${minutes}m`;
    if (minutes > 0) return `${days}d ${minutes}m`;
    return `${days}d`;
  }
  if (hours > 0) {
    if (minutes > 0) return `${hours}h ${minutes}m`;
    return `${hours}h`;
  }
  if (minutes > 0) return `${minutes}m`;
  return 'Less than a minute';
}

export function EntryTimeSummary({ startedAt, completedAt }: EntryTimeSummaryProps) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Started: {formatDateTime(startedAt)}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Completed: {formatDateTime(completedAt)}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 font-medium text-primary">
            <Timer className="h-3.5 w-3.5" />
            Total Time: {formatDuration(startedAt, completedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
