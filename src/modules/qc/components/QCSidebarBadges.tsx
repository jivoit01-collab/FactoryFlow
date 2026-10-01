import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
// Direct paths, not the api barrels: these badges render in the sidebar on every
// page, so they should not drag the rest of either module in with them.
import { useLineClearances } from '@/modules/production/execution/api/execution.queries';
import { cn } from '@/shared/utils';

import { useProductionQCEntryCounts } from '../api/productionQC/productionQC.queries';
import { usePendingApprovalsCount } from '../hooks/usePendingApprovalsCount';

const POLL_MS = 30_000;

function CountPill({ count, label, className }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white',
        className,
      )}
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Inspections waiting for this user's chemist / QAM sign-off. */
export function PendingApprovalsBadge({ className }: { className?: string }) {
  const count = usePendingApprovalsCount(POLL_MS);
  return (
    <CountPill
      count={count}
      label={`${count} inspection${count === 1 ? '' : 's'} awaiting your approval`}
      className={className}
    />
  );
}

/** Line clearances submitted by production and waiting for QA's decision. */
export function LineClearanceQABadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(QC_PERMISSIONS.LINE_CLEARANCE_QC.APPROVE);
  const { data } = useLineClearances(undefined, 'SUBMITTED', canApprove, POLL_MS);
  const count = canApprove ? (data?.length ?? 0) : 0;
  return (
    <CountPill
      count={count}
      label={`${count} line clearance${count === 1 ? '' : 's'} awaiting QA`}
      className={className}
    />
  );
}

/** Document entries waiting for a QC lead's approval (shown to approvers only). */
export function ProductionQCBadge({ className }: { className?: string }) {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(QC_PERMISSIONS.PRODUCTION_QC.APPROVE);
  // No range: pending counts every date, so the badge matches the queue.
  const { data } = useProductionQCEntryCounts(undefined, canApprove, POLL_MS);
  const count = canApprove ? (data?.pending ?? 0) : 0;
  return (
    <CountPill
      count={count}
      label={`${count} document entr${count === 1 ? 'y' : 'ies'} awaiting approval`}
      className={className}
    />
  );
}
