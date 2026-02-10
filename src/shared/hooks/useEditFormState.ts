import { useState, useMemo, useCallback } from 'react'

/**
 * Configuration for the edit form state hook.
 */
export interface UseEditFormStateConfig {
  /** Whether we're in edit mode (editing existing data) */
  isEditMode: boolean
  /** Status of the entry being edited (e.g., 'COMPLETED', 'DRAFT') */
  entryStatus?: string
  /** Whether there was a "not found" error when fetching existing data */
  hasNotFoundError?: boolean
}

/**
 * Return type for the edit form state hook.
 */
export interface UseEditFormStateReturn {
  /** Whether fill data mode is active (user clicked "Fill Data" after not found error) */
  fillDataMode: boolean
  /** Whether update mode is active (user clicked "Update" to enable editing) */
  updateMode: boolean
  /**
   * Effective edit mode: true when in edit mode AND not in fill data mode.
   * Use this to determine if we're viewing existing data vs creating new.
   */
  effectiveEditMode: boolean
  /**
   * Whether the form fields should be read-only.
   * True when: (effectiveEditMode AND not updateMode AND not hasNotFoundError)
   * OR (hasNotFoundError AND not fillDataMode)
   */
  isReadOnly: boolean
  /**
   * Whether the user can click "Update" to edit.
   * True when in effective edit mode AND entry is not completed.
   */
  canUpdate: boolean
  /**
   * Whether a "Fill Data" button should be shown.
   * True when there's a not found error and fill data mode is not active.
   */
  showFillDataButton: boolean
  /** Enables fill data mode */
  enableFillDataMode: () => void
  /** Enables update mode */
  enableUpdateMode: () => void
  /** Resets both fill data and update modes */
  resetModes: () => void
}

/**
 * Hook to manage edit/create form state logic.
 *
 * This hook centralizes the common pattern used across step pages for handling:
 * - Edit mode vs create mode
 * - Fill data mode (when data not found, allowing user to enter new data)
 * - Update mode (when user wants to modify existing data)
 * - Read-only state determination
 *
 * @example
 * ```tsx
 * const {
 *   fillDataMode,
 *   updateMode,
 *   effectiveEditMode,
 *   isReadOnly,
 *   canUpdate,
 *   showFillDataButton,
 *   enableFillDataMode,
 *   enableUpdateMode,
 * } = useEditFormState({
 *   isEditMode,
 *   entryStatus: vehicleEntryData?.status,
 *   hasNotFoundError: isNotFoundError(error),
 * })
 * ```
 */
export function useEditFormState({
  isEditMode,
  entryStatus,
  hasNotFoundError = false,
}: UseEditFormStateConfig): UseEditFormStateReturn {
  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false)
  // State to track if Update button has been clicked (enables editing)
  const [updateMode, setUpdateMode] = useState(false)

  // Effective edit mode: we're editing existing data (not filling new data)
  const effectiveEditMode = isEditMode && !fillDataMode

  // Whether the user can click "Update" to edit
  const canUpdate = effectiveEditMode && entryStatus !== 'COMPLETED'

  // Whether to show the "Fill Data" button
  const showFillDataButton = hasNotFoundError && !fillDataMode

  // Fields are read-only when:
  // 1. In effective edit mode AND update mode is not active AND there's no not found error, OR
  // 2. There's a not found error AND fill data mode is not active
  const isReadOnly = useMemo(() => {
    return (
      (effectiveEditMode && !updateMode && !hasNotFoundError) ||
      (hasNotFoundError && !fillDataMode)
    )
  }, [effectiveEditMode, updateMode, hasNotFoundError, fillDataMode])

  const enableFillDataMode = useCallback(() => {
    setFillDataMode(true)
  }, [])

  const enableUpdateMode = useCallback(() => {
    setUpdateMode(true)
  }, [])

  const resetModes = useCallback(() => {
    setFillDataMode(false)
    setUpdateMode(false)
  }, [])

  return {
    fillDataMode,
    updateMode,
    effectiveEditMode,
    isReadOnly,
    canUpdate,
    showFillDataButton,
    enableFillDataMode,
    enableUpdateMode,
    resetModes,
  }
}
