import { Check, CircleDot, Database, SkipForward, X } from 'lucide-react';

import { cn, formatDateTimeShort } from '@/shared/utils';

import type { ChangeApproval, RequestStep } from '../api/bom-changes.api';

const STATE_CLASSES: Record<RequestStep['state'], string> = {
  done: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  current:
    'border-sky-400 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300',
  rejected:
    'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300',
  skipped:
    'border-dashed border-slate-300 text-slate-500 dark:border-border dark:text-muted-foreground',
  upcoming: 'border-slate-200 text-slate-500 dark:border-border dark:text-muted-foreground',
};

const STATE_ICON = {
  done: Check,
  current: CircleDot,
  rejected: X,
  skipped: SkipForward,
  upcoming: CircleDot,
} as const;

/** The approval ladder for one request, the server's own reading of it. */
export function RequestSteps({ steps }: { steps: readonly RequestStep[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2">
      {steps.map((step) => {
        const Icon = STATE_ICON[step.state];
        return (
          <li
            key={step.level}
            className={cn(
              'flex min-w-[160px] flex-1 items-start gap-2 rounded-lg border px-3 py-2',
              STATE_CLASSES[step.state],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide">
                Level {step.level}
              </div>
              <div className="text-sm">{step.label}</div>
              {step.writes_sap && (
                <div className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                  <Database className="h-3 w-3" /> writes SAP
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Every decision on the request, oldest first. */
export function ApprovalHistory({ approvals }: { approvals: readonly ChangeApproval[] }) {
  if (approvals.length === 0) {
    return <p className="text-sm text-muted-foreground">No decisions yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {approvals.map((approval) => (
        <li
          key={approval.id}
          className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
        >
          <span
            className={cn(
              'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
              approval.action === 'APPROVE'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
            )}
          >
            {approval.action === 'APPROVE' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{approval.decided_by_name || 'Unknown'}</span>
              <span className="text-muted-foreground">
                {approval.direct
                  ? 'pushed directly to SAP'
                  : `${approval.action_label.toLowerCase()} at level ${approval.level}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTimeShort(approval.decided_at)}
              </span>
            </div>
            {approval.remarks && (
              <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{approval.remarks}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
