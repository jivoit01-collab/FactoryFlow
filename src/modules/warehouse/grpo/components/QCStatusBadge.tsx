import type { InspectionDecision } from '@/modules/qc/types';

import type { QCStatus } from '../types';

// Effective verdict = manager decision when present, else the QC status.
type Verdict = QCStatus | InspectionDecision;

const VERDICT_STYLES: Record<string, string> = {
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  INSPECTION_PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  ARRIVAL_SLIP_PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  NO_ARRIVAL_SLIP: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const VERDICT_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  HOLD: 'Hold',
  PENDING: 'QC Pending',
  INSPECTION_PENDING: 'Inspection Pending',
  ARRIVAL_SLIP_PENDING: 'Slip Pending',
  NO_ARRIVAL_SLIP: 'No QC Slip',
};

const FALLBACK_STYLE = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

interface QCStatusBadgeProps {
  status: QCStatus;
  decision?: InspectionDecision | null;
  className?: string;
}

/**
 * Compact pill showing the QC verdict for a PO item. Shared across the GRPO
 * preview and the All Entries read-only QC drill-down so the accept/reject
 * styling and labels stay consistent.
 */
export function QCStatusBadge({ status, decision, className = '' }: QCStatusBadgeProps) {
  const verdict: Verdict = decision || status;
  const style = VERDICT_STYLES[verdict] ?? FALLBACK_STYLE;
  const label = VERDICT_LABELS[verdict] ?? verdict;

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${style} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
