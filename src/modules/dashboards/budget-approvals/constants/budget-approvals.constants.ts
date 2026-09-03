import type { BudgetApprovalFilters, BudgetApprovalStatus } from '../types';

// ============================================================================
// Filter Options
// ============================================================================

export const BUDGET_APPROVAL_STATUS_OPTIONS: Array<{
  value: BudgetApprovalStatus;
  label: string;
}> = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ============================================================================
// Defaults
// ============================================================================

export const BUDGET_APPROVALS_PAGE_SIZE = 50;

export const DEFAULT_BUDGET_APPROVAL_FILTERS: BudgetApprovalFilters = {
  status: 'pending',
  branch: '',
  effect_month: '',
  search: '',
  column_filters: {},
  sort_by: '',
  sort_dir: 'desc',
  page: 1,
  page_size: BUDGET_APPROVALS_PAGE_SIZE,
};

// ============================================================================
// Query Config
// ============================================================================

// The backend caches the heavy DRAFT_APPROVAL_Budget call for 3 minutes;
// matching that here avoids pointless refetches that would hit the same cache.
export const BUDGET_APPROVALS_STALE_TIME = 3 * 60 * 1000;
