import { Clock } from 'lucide-react';

import { Card, CardContent } from './ui';

interface RecordTimestampsProps {
  createdAt?: string | null;
  updatedAt?: string | null;
}

function formatDateTime(dateTime?: string | null): string {
  if (!dateTime) return '-';
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

export function RecordTimestamps({ createdAt, updatedAt }: RecordTimestampsProps) {
  if (!createdAt && !updatedAt) return null;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {createdAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Created: {formatDateTime(createdAt)}
            </span>
          )}
          {createdAt && updatedAt && <span>•</span>}
          {updatedAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Updated: {formatDateTime(updatedAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
