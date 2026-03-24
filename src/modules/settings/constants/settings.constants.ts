// ============================================================================
// Action Point Category Colors
// ============================================================================

export const ACTION_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Gate & Access': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Production Line': { bg: 'bg-green-100', text: 'text-green-700' },
  'Batch & Job Order': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Quality Control': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Materials & Store': { bg: 'bg-teal-100', text: 'text-teal-700' },
  'Shift & Maintenance': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

// ============================================================================
// Condition Type Category Colors
// ============================================================================

export const CONDITION_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Documents: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  Personnel: { bg: 'bg-pink-100', text: 'text-pink-700' },
  Equipment: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  Workflow: { bg: 'bg-violet-100', text: 'text-violet-700' },
  Time: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Safety: { bg: 'bg-red-100', text: 'text-red-700' },
  Metrics: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

// ============================================================================
// Audit Log Constants
// ============================================================================

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  TOGGLED: 'Toggled',
  DELETED: 'Deleted',
};

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-green-100 text-green-700',
  UPDATED: 'bg-blue-100 text-blue-700',
  TOGGLED: 'bg-amber-100 text-amber-700',
  DELETED: 'bg-red-100 text-red-700',
};

// ============================================================================
// Default Category Fallback
// ============================================================================

export const DEFAULT_CATEGORY_COLOR = { bg: 'bg-gray-100', text: 'text-gray-700' };
