import { AlertTriangle, CheckCircle2, ListTodo, UserCheck, Users } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ActivitySummary } from '../types';

interface StatProps {
  label: string;
  value: number;
  hint: string;
  icon: typeof ListTodo;
  tone?: 'default' | 'danger' | 'success';
}

function Stat({ label, value, hint, icon: Icon, tone = 'default' }: StatProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold tabular-nums',
                tone === 'danger' && value > 0 && 'text-destructive',
                tone === 'success' && 'text-emerald-600 dark:text-emerald-500',
              )}
            >
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 text-muted-foreground',
              tone === 'danger' && value > 0 && 'text-destructive',
              tone === 'success' && 'text-emerald-600 dark:text-emerald-500',
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The five numbers that answer "where do I stand today".
 *
 * Pending is split into owned vs shared on purpose: a queue of 30 seen by five
 * approvers is not thirty jobs each, and showing one total would make every
 * approver look permanently behind.
 */
export function ActivityStatCards({ summary }: { summary: ActivitySummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat
        label="Pending"
        value={summary.pending}
        hint="Still to be done"
        icon={ListTodo}
      />
      <Stat
        label="Overdue"
        value={summary.overdue}
        hint="Past its expected time"
        icon={AlertTriangle}
        tone="danger"
      />
      <Stat
        label="Yours alone"
        value={summary.owned}
        hint="Nobody else will do these"
        icon={UserCheck}
      />
      <Stat
        label="Shared queue"
        value={summary.queued}
        hint="You or another holder"
        icon={Users}
      />
      <Stat
        label="Completed"
        value={summary.completed}
        hint="Finished in this window"
        icon={CheckCircle2}
        tone="success"
      />
    </div>
  );
}
