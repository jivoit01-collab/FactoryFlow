import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { BunchSummaryState, SapDocStatus } from '../types';
import { SAP_DOC_STATUS_LABELS } from '../utils/status';

const DOC_STATUS_CLASS: Record<SapDocStatus, string> = {
  PLANNED: 'bg-muted text-muted-foreground',
  QUEUED: 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300',
  IN_APPROVAL: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
  POSTED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-400',
  NOT_NEEDED: 'bg-muted text-muted-foreground',
};

interface SapDocStatusBadgeProps {
  status: SapDocStatus;
  /** Its newest posting was cancelled while the document was not done. */
  stopped?: boolean;
  /** Made in simulate mode: nothing is in SAP. */
  simulated?: boolean;
  className?: string;
}

/**
 * Where one SAP document has got to: the PO, a GRPO, an A/P draft or the PO
 * close. A simulated document says so beside its status -- "In SAP" alone
 * would be a lie when nothing reached SAP.
 */
export function SapDocStatusBadge({
  status,
  stopped,
  simulated,
  className,
}: SapDocStatusBadgeProps) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <Badge
        variant="outline"
        className={cn('whitespace-nowrap text-[10px]', DOC_STATUS_CLASS[status] ?? '')}
      >
        {stopped ? 'Stopped' : (SAP_DOC_STATUS_LABELS[status] ?? status)}
      </Badge>
      {simulated && (
        <Badge variant="outline" className="whitespace-nowrap border-dashed text-[10px]">
          Simulated
        </Badge>
      )}
    </span>
  );
}

const SUMMARY_CLASS: Record<BunchSummaryState, string> = {
  NOT_STARTED: 'bg-muted text-muted-foreground',
  NOTHING_SENT: 'bg-muted text-muted-foreground',
  BUNCH_CHANGED: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-400',
  NEEDS_ATTENTION: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
  POSTED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400',
  SIMULATED: 'border-dashed bg-muted text-foreground',
  IN_PROGRESS: 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300',
};

/** The bunch list's one-word SAP state (`bunch_status_summary`). */
export function BunchSapStateBadge({
  state,
  label,
  className,
}: {
  state: BunchSummaryState;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap text-[10px]', SUMMARY_CLASS[state] ?? '', className)}
    >
      {label}
    </Badge>
  );
}
