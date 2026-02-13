// ============================================================================
// Form Condition Helper Functions
// ============================================================================
// These helpers extract complex boolean logic into named, documented functions
// to improve code readability and maintainability.
// ============================================================================

/**
 * Configuration for determining read-only state in edit forms.
 */
export interface ReadOnlyConfig {
  /** Whether we're in effective edit mode (editing existing data) */
  effectiveEditMode: boolean;
  /** Whether update mode is active (user clicked Update) */
  updateMode: boolean;
  /** Whether there's a not found error */
  hasNotFoundError: boolean;
  /** Whether fill data mode is active */
  fillDataMode: boolean;
}

/**
 * Determines if form fields should be read-only.
 *
 * Fields are read-only when:
 * 1. In effective edit mode AND update mode is not active AND there's no not found error, OR
 * 2. There's a not found error AND fill data mode is not active
 *
 * @param config - The configuration object
 * @returns True if fields should be read-only
 *
 * @example
 * ```tsx
 * const readOnly = isReadOnly({
 *   effectiveEditMode,
 *   updateMode,
 *   hasNotFoundError: isNotFoundError(error),
 *   fillDataMode,
 * })
 * ```
 */
export function isReadOnly({
  effectiveEditMode,
  updateMode,
  hasNotFoundError,
  fillDataMode,
}: ReadOnlyConfig): boolean {
  const isEditModeAndNotUpdating = effectiveEditMode && !updateMode && !hasNotFoundError;
  const isNotFoundAndNotFilling = hasNotFoundError && !fillDataMode;
  return isEditModeAndNotUpdating || isNotFoundAndNotFilling;
}

/**
 * Configuration for determining if an action (like remove) is allowed.
 */
export interface CanPerformActionConfig {
  /** Whether we're in effective edit mode */
  effectiveEditMode: boolean;
  /** Whether global fill data mode is active */
  fillDataMode: boolean;
  /** Whether any item has fill data mode active */
  hasAnyFillDataMode: boolean;
  /** Whether this specific item has fill data mode active */
  thisItemFillDataMode: boolean;
  /** Whether update mode is active */
  updateMode: boolean;
}

/**
 * Determines if an action (like removing an item) can be performed.
 *
 * Action is blocked when:
 * - In effective edit mode AND
 * - Fill data mode is not active AND
 * - No item has fill data mode AND
 * - This specific item doesn't have fill data mode AND
 * - Update mode is not active
 *
 * @param config - The configuration object
 * @returns True if the action can be performed
 */
export function canPerformAction({
  effectiveEditMode,
  fillDataMode,
  hasAnyFillDataMode,
  thisItemFillDataMode,
  updateMode,
}: CanPerformActionConfig): boolean {
  // If not in effective edit mode, action is always allowed
  if (!effectiveEditMode) return true;

  // In edit mode, action is allowed if any of these are true:
  // - Fill data mode is active
  // - Any item has fill data mode
  // - This specific item has fill data mode
  // - Update mode is active
  return fillDataMode || hasAnyFillDataMode || thisItemFillDataMode || updateMode;
}

/**
 * Simplified version for when we only need basic edit mode check.
 */
export interface BasicEditModeConfig {
  /** Whether we're in effective edit mode */
  effectiveEditMode: boolean;
  /** Whether update mode is active */
  updateMode: boolean;
}

/**
 * Checks if editing is allowed based on edit and update modes.
 *
 * @param config - The configuration object
 * @returns True if editing is allowed
 */
export function isEditingAllowed({ effectiveEditMode, updateMode }: BasicEditModeConfig): boolean {
  // Editing is allowed when:
  // - Not in effective edit mode (create mode), OR
  // - Update mode is active
  return !effectiveEditMode || updateMode;
}

/**
 * Checks if an item can be modified based on edit mode and item-specific fill data mode.
 *
 * @param effectiveEditMode - Whether we're in effective edit mode
 * @param itemFillDataMode - Whether this item has fill data mode active
 * @param updateMode - Whether update mode is active
 * @returns True if the item can be modified
 */
export function canModifyItem(
  effectiveEditMode: boolean,
  itemFillDataMode: boolean,
  updateMode: boolean,
): boolean {
  if (!effectiveEditMode) return true;
  return itemFillDataMode || updateMode;
}

// ============================================================================
// Entry Status Helpers
// ============================================================================

/**
 * Checks if an entry is in completed status.
 *
 * @param status - The entry status
 * @returns True if the entry is completed
 */
export function isEntryCompleted(status?: string): boolean {
  return status?.toUpperCase() === 'COMPLETED';
}

/**
 * Checks if an entry is in draft status.
 *
 * @param status - The entry status
 * @returns True if the entry is in draft
 */
export function isEntryDraft(status?: string): boolean {
  return status?.toUpperCase() === 'DRAFT';
}

/**
 * Checks if an entry is in progress.
 *
 * @param status - The entry status
 * @returns True if the entry is in progress
 */
export function isEntryInProgress(status?: string): boolean {
  return status?.toUpperCase() === 'IN_PROGRESS';
}

/**
 * Checks if an entry can be edited (not completed).
 *
 * @param status - The entry status
 * @returns True if the entry can be edited
 */
export function canEditEntry(status?: string): boolean {
  return !isEntryCompleted(status);
}

// ============================================================================
// Data State Helpers
// ============================================================================

/**
 * Configuration for checking data availability state.
 */
export interface DataStateConfig {
  /** Whether we're in effective edit mode */
  effectiveEditMode: boolean;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Whether data exists */
  hasData: boolean;
  /** Whether there's a not found error */
  hasNotFoundError: boolean;
}

/**
 * Checks if we have no data in edit mode (not loading, no data, or not found error).
 *
 * @param config - The configuration object
 * @returns True if there's no data to display
 */
export function hasNoData({
  effectiveEditMode,
  isLoading,
  hasData,
  hasNotFoundError,
}: DataStateConfig): boolean {
  return effectiveEditMode && !isLoading && (!hasData || hasNotFoundError);
}

/**
 * Checks if we have data available in edit mode.
 *
 * @param config - The configuration object
 * @returns True if data is available
 */
export function hasDataAvailable({
  effectiveEditMode,
  isLoading,
  hasData,
  hasNotFoundError,
}: DataStateConfig): boolean {
  return effectiveEditMode && !isLoading && hasData && !hasNotFoundError;
}
