import { CheckCircle2, Clock, FileCheck2, Undo2, XCircle } from 'lucide-react';

import type { SapApprovalStatus } from '../types';
import { STATUS_LABELS } from '../utils/format';

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

const STYLES: Record<SapApprovalStatus, { className: string; Icon: typeof Clock }> = {
  PENDING: {
    className: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400',
    Icon: Clock,
  },
  APPROVED: {
    className: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400',
    Icon: CheckCircle2,
  },
  GENERATED: {
    className: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
    Icon: FileCheck2,
  },
  REJECTED: {
    className: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400',
    Icon: XCircle,
  },
  CANCELLED: {
    className: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground',
    Icon: Undo2,
  },
};

/** The draft-aware status; a leftover SAP still lists as pending says so. */
export function StatusChip({ status, stale }: { status: SapApprovalStatus; stale?: boolean }) {
  const { className, Icon } = STYLES[status] ?? STYLES.PENDING;
  return (
    <span
      className={`${CHIP} ${className}`}
      title={
        stale
          ? 'SAP still lists this request as pending, but its draft says otherwise — nothing is left to decide.'
          : undefined
      }
    >
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status] ?? status}
      {stale && <span className="opacity-70">(SAP leftover)</span>}
    </span>
  );
}
