import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { PM_PLAN_LIST_STALE_TIME, PM_REQUIREMENT_STALE_TIME } from '../constants';
import { pmRequirementApi } from './pm-requirement.api';

// ============================================================================
// Query keys
// ============================================================================
//
// Every key carries the company. The plan lives in that company's schema and
// so do its warehouses, so without it switching company would serve the
// previous one's plan against the new one's stock.

export const PM_REQUIREMENT_QUERY_KEYS = {
  all: ['pm-requirement'] as const,

  plans: (companyId?: number | string) =>
    [...PM_REQUIREMENT_QUERY_KEYS.all, 'plans', companyId] as const,

  requirement: (absId: number | null | undefined, companyId?: number | string) =>
    [...PM_REQUIREMENT_QUERY_KEYS.all, 'requirement', companyId, absId ?? 'default'] as const,

  purchaseOrder: (docEntry: number | null | undefined, companyId?: number | string) =>
    [...PM_REQUIREMENT_QUERY_KEYS.all, 'purchase-order', companyId, docEntry ?? 'none'] as const,
};

/**
 * A 502 is SAP rejecting the query and will fail the same way on a retry; a
 * 503 is SAP unreachable and may not. A 404 is "no such plan", which no
 * number of retries will change.
 */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404 || status === 502) return false;
  return failureCount < 2;
}

export function usePmRequirementPlans() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PM_REQUIREMENT_QUERY_KEYS.plans(currentCompany?.company_id),
    queryFn: () => pmRequirementApi.getPlans(),
    staleTime: PM_PLAN_LIST_STALE_TIME,
    retry: sapRetry,
  });
}

export function usePmRequirement(absId: number | null | undefined) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PM_REQUIREMENT_QUERY_KEYS.requirement(absId, currentCompany?.company_id),
    queryFn: () => pmRequirementApi.getRequirement(absId),
    staleTime: PM_REQUIREMENT_STALE_TIME,
    retry: sapRetry,
    // Changing plan is a different key. Keeping the previous answer on screen
    // while the new one loads means the table dims rather than empties, which
    // matters on a 196-row table that takes seven HANA reads to rebuild.
    placeholderData: (previous) => previous,
  });
}

/**
 * One open order, read when somebody opens it and not before.
 *
 * `enabled` on the DocEntry, so the board does not fetch an order per row it
 * happens to render — a component can have a dozen, and nobody opens more
 * than one at a time.
 *
 * Deliberately NOT cached the way the board is. A purchase order can be
 * amended or cancelled in SAP after this board counted it as cover, and the
 * one moment somebody is looking at the sheet is the moment it has to be the
 * live one. That is the same call `POPrintButton` makes for the same reason.
 */
export function usePmPurchaseOrder(docEntry: number | null | undefined) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: PM_REQUIREMENT_QUERY_KEYS.purchaseOrder(docEntry, currentCompany?.company_id),
    queryFn: () => pmRequirementApi.getPurchaseOrder(docEntry as number),
    enabled: !!docEntry,
    staleTime: 0,
    gcTime: 0,
    retry: sapRetry,
  });
}
