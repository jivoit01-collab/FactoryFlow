import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';

// Direct path, not the api barrel: the sidebar badge that uses this renders on
// every page, so it should not drag the rest of the QC module in with it.
import { useInspectionCounts } from '../api/inspection/inspection.queries';

/**
 * Inspections waiting for this user's sign-off: the chemist queue for a QA
 * chemist, the QAM queue for a QA manager, both for someone who is both.
 *
 * The counts endpoint lists unfinished work on every date, so this does not
 * follow the page's date range — the same as the approval queues themselves.
 */
export function usePendingApprovalsCount(refetchInterval: number | false = false): number {
  const { hasPermission } = usePermission();
  const canChemist = hasPermission(QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST);
  const canQAM = hasPermission(QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM);
  // The counts endpoint is gated on viewing inspections.
  const canView = hasPermission(QC_PERMISSIONS.INSPECTION.VIEW);

  const { data } = useInspectionCounts(
    undefined,
    canView && (canChemist || canQAM),
    refetchInterval,
  );

  return (
    (canChemist ? (data?.awaiting_chemist ?? 0) : 0) + (canQAM ? (data?.awaiting_qam ?? 0) : 0)
  );
}
