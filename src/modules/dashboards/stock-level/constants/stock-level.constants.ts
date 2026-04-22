// ============================================================================
// Filter Options
// ============================================================================

export const STOCK_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'low', label: 'Low' },
  { value: 'critical', label: 'Critical' },
  { value: 'unset', label: 'No Minimum' },
] as const;

// ============================================================================
// Query Config
// ============================================================================

export const STOCK_LEVEL_STALE_TIME = 5 * 60 * 1000; // 5 minutes
