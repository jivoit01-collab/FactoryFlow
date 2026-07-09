import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  HandCoins,
  Lock,
  PackageCheck,
  Send,
  ThumbsUp,
  Truck,
  Undo2,
  XCircle,
} from 'lucide-react';

import { cn } from '@/shared/utils';

import { useReturnableTimeline } from '../../api/returnableGatePass.queries';
import type { ReturnableLogAction } from '../../types';

const ACTION_ICONS: Record<ReturnableLogAction, LucideIcon> = {
  CREATED: FilePlus2,
  UPDATED: FilePlus2,
  SUBMITTED: Send,
  APPROVED: ThumbsUp,
  APPROVAL_REJECTED: XCircle,
  GATE_OUT: Truck,
  REJECTED_AT_GATE: XCircle,
  RETURN_RECORDED: Undo2,
  ACKNOWLEDGED: HandCoins,
  CLOSED: CheckCircle2,
  SHORT_CLOSED: Lock,
  CANCELLED: Ban,
  DUE_TODAY: CalendarClock,
  OVERDUE_FLAGGED: AlertTriangle,
};

const ACTION_TONES: Partial<Record<ReturnableLogAction, string>> = {
  APPROVED: 'text-emerald-600',
  APPROVAL_REJECTED: 'text-rose-600',
  REJECTED_AT_GATE: 'text-rose-600',
  CANCELLED: 'text-rose-600',
  OVERDUE_FLAGGED: 'text-rose-600',
  DUE_TODAY: 'text-amber-600',
  SHORT_CLOSED: 'text-amber-600',
  CLOSED: 'text-emerald-600',
  RETURN_RECORDED: 'text-emerald-600',
};

interface ReturnableTimelineProps {
  passId: number;
}

/**
 * The backend has no simple-history, so the module keeps its own append-only log.
 * This renders it — who did what to this pass, and when.
 */
export function ReturnableTimeline({ passId }: ReturnableTimelineProps) {
  const { data: logs, isLoading } = useReturnableTimeline(passId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading timeline…</p>;
  }

  if (!logs?.length) {
    return <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {logs.map((log) => {
        const Icon = ACTION_ICONS[log.action] ?? PackageCheck;
        return (
          <li key={log.id} className="flex gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted',
                ACTION_TONES[log.action] ?? 'text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{log.action_display}</p>
              {log.note ? (
                <p className="mt-0.5 break-words text-sm text-muted-foreground">{log.note}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {log.actor_name ? `${log.actor_name} · ` : 'System · '}
                {new Date(log.at).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
