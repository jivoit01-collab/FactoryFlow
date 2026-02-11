import { describe, it, expect } from 'vitest'
import {
  isReadOnly,
  canPerformAction,
  isEditingAllowed,
  canModifyItem,
  isEntryCompleted,
  isEntryDraft,
  isEntryInProgress,
  canEditEntry,
  hasNoData,
  hasDataAvailable,
} from '../../utils/formConditions'

describe('Form Condition Utilities', () => {
  // ═══════════════════════════════════════════════════════════════
  // isReadOnly
  // ═══════════════════════════════════════════════════════════════

  describe('isReadOnly', () => {
    it('returns true when in edit mode, not updating, no error', () => {
      expect(
        isReadOnly({
          effectiveEditMode: true,
          updateMode: false,
          hasNotFoundError: false,
          fillDataMode: false,
        })
      ).toBe(true)
    })

    it('returns false when in edit mode and updating', () => {
      expect(
        isReadOnly({
          effectiveEditMode: true,
          updateMode: true,
          hasNotFoundError: false,
          fillDataMode: false,
        })
      ).toBe(false)
    })

    it('returns true when hasNotFoundError and not filling data', () => {
      expect(
        isReadOnly({
          effectiveEditMode: false,
          updateMode: false,
          hasNotFoundError: true,
          fillDataMode: false,
        })
      ).toBe(true)
    })

    it('returns false when hasNotFoundError but fillDataMode is active', () => {
      expect(
        isReadOnly({
          effectiveEditMode: false,
          updateMode: false,
          hasNotFoundError: true,
          fillDataMode: true,
        })
      ).toBe(false)
    })

    it('returns false in create mode (all false)', () => {
      expect(
        isReadOnly({
          effectiveEditMode: false,
          updateMode: false,
          hasNotFoundError: false,
          fillDataMode: false,
        })
      ).toBe(false)
    })

    it('returns false when edit mode + hasNotFoundError (second condition overrides first)', () => {
      // effectiveEditMode && !updateMode && !hasNotFoundError => true && true && false => false
      // hasNotFoundError && !fillDataMode => true && true => true
      expect(
        isReadOnly({
          effectiveEditMode: true,
          updateMode: false,
          hasNotFoundError: true,
          fillDataMode: false,
        })
      ).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // canPerformAction
  // ═══════════════════════════════════════════════════════════════

  describe('canPerformAction', () => {
    it('returns true when not in effective edit mode', () => {
      expect(
        canPerformAction({
          effectiveEditMode: false,
          fillDataMode: false,
          hasAnyFillDataMode: false,
          thisItemFillDataMode: false,
          updateMode: false,
        })
      ).toBe(true)
    })

    it('returns false when in edit mode without any enable flags', () => {
      expect(
        canPerformAction({
          effectiveEditMode: true,
          fillDataMode: false,
          hasAnyFillDataMode: false,
          thisItemFillDataMode: false,
          updateMode: false,
        })
      ).toBe(false)
    })

    it('returns true when in edit mode with fillDataMode', () => {
      expect(
        canPerformAction({
          effectiveEditMode: true,
          fillDataMode: true,
          hasAnyFillDataMode: false,
          thisItemFillDataMode: false,
          updateMode: false,
        })
      ).toBe(true)
    })

    it('returns true when in edit mode with hasAnyFillDataMode', () => {
      expect(
        canPerformAction({
          effectiveEditMode: true,
          fillDataMode: false,
          hasAnyFillDataMode: true,
          thisItemFillDataMode: false,
          updateMode: false,
        })
      ).toBe(true)
    })

    it('returns true when in edit mode with thisItemFillDataMode', () => {
      expect(
        canPerformAction({
          effectiveEditMode: true,
          fillDataMode: false,
          hasAnyFillDataMode: false,
          thisItemFillDataMode: true,
          updateMode: false,
        })
      ).toBe(true)
    })

    it('returns true when in edit mode with updateMode', () => {
      expect(
        canPerformAction({
          effectiveEditMode: true,
          fillDataMode: false,
          hasAnyFillDataMode: false,
          thisItemFillDataMode: false,
          updateMode: true,
        })
      ).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // isEditingAllowed
  // ═══════════════════════════════════════════════════════════════

  describe('isEditingAllowed', () => {
    it('returns true when not in effective edit mode', () => {
      expect(isEditingAllowed({ effectiveEditMode: false, updateMode: false })).toBe(true)
    })

    it('returns true when in edit mode with updateMode', () => {
      expect(isEditingAllowed({ effectiveEditMode: true, updateMode: true })).toBe(true)
    })

    it('returns false when in edit mode without updateMode', () => {
      expect(isEditingAllowed({ effectiveEditMode: true, updateMode: false })).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // canModifyItem
  // ═══════════════════════════════════════════════════════════════

  describe('canModifyItem', () => {
    it('returns true when not in effective edit mode', () => {
      expect(canModifyItem(false, false, false)).toBe(true)
    })

    it('returns true when in edit mode with item fill data mode', () => {
      expect(canModifyItem(true, true, false)).toBe(true)
    })

    it('returns true when in edit mode with update mode', () => {
      expect(canModifyItem(true, false, true)).toBe(true)
    })

    it('returns false when in edit mode without any enable flags', () => {
      expect(canModifyItem(true, false, false)).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Entry Status Helpers
  // ═══════════════════════════════════════════════════════════════

  describe('isEntryCompleted', () => {
    it('returns true for COMPLETED', () => {
      expect(isEntryCompleted('COMPLETED')).toBe(true)
    })

    it('returns true for lowercase completed', () => {
      expect(isEntryCompleted('completed')).toBe(true)
    })

    it('returns true for mixed case Completed', () => {
      expect(isEntryCompleted('Completed')).toBe(true)
    })

    it('returns false for DRAFT', () => {
      expect(isEntryCompleted('DRAFT')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isEntryCompleted(undefined)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isEntryCompleted('')).toBe(false)
    })
  })

  describe('isEntryDraft', () => {
    it('returns true for DRAFT', () => {
      expect(isEntryDraft('DRAFT')).toBe(true)
    })

    it('returns true for lowercase draft', () => {
      expect(isEntryDraft('draft')).toBe(true)
    })

    it('returns false for COMPLETED', () => {
      expect(isEntryDraft('COMPLETED')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isEntryDraft(undefined)).toBe(false)
    })
  })

  describe('isEntryInProgress', () => {
    it('returns true for IN_PROGRESS', () => {
      expect(isEntryInProgress('IN_PROGRESS')).toBe(true)
    })

    it('returns true for lowercase in_progress', () => {
      expect(isEntryInProgress('in_progress')).toBe(true)
    })

    it('returns false for COMPLETED', () => {
      expect(isEntryInProgress('COMPLETED')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isEntryInProgress(undefined)).toBe(false)
    })
  })

  describe('canEditEntry', () => {
    it('returns true for DRAFT', () => {
      expect(canEditEntry('DRAFT')).toBe(true)
    })

    it('returns true for IN_PROGRESS', () => {
      expect(canEditEntry('IN_PROGRESS')).toBe(true)
    })

    it('returns false for COMPLETED', () => {
      expect(canEditEntry('COMPLETED')).toBe(false)
    })

    it('returns true for undefined', () => {
      expect(canEditEntry(undefined)).toBe(true)
    })

    it('returns true for empty string', () => {
      expect(canEditEntry('')).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Data State Helpers
  // ═══════════════════════════════════════════════════════════════

  describe('hasNoData', () => {
    it('returns true when in edit mode, not loading, no data', () => {
      expect(
        hasNoData({
          effectiveEditMode: true,
          isLoading: false,
          hasData: false,
          hasNotFoundError: false,
        })
      ).toBe(true)
    })

    it('returns true when in edit mode, not loading, has notFoundError', () => {
      expect(
        hasNoData({
          effectiveEditMode: true,
          isLoading: false,
          hasData: true,
          hasNotFoundError: true,
        })
      ).toBe(true)
    })

    it('returns false when not in edit mode', () => {
      expect(
        hasNoData({
          effectiveEditMode: false,
          isLoading: false,
          hasData: false,
          hasNotFoundError: false,
        })
      ).toBe(false)
    })

    it('returns false when loading', () => {
      expect(
        hasNoData({
          effectiveEditMode: true,
          isLoading: true,
          hasData: false,
          hasNotFoundError: false,
        })
      ).toBe(false)
    })

    it('returns false when has data and no error', () => {
      expect(
        hasNoData({
          effectiveEditMode: true,
          isLoading: false,
          hasData: true,
          hasNotFoundError: false,
        })
      ).toBe(false)
    })
  })

  describe('hasDataAvailable', () => {
    it('returns true when in edit mode, not loading, has data, no error', () => {
      expect(
        hasDataAvailable({
          effectiveEditMode: true,
          isLoading: false,
          hasData: true,
          hasNotFoundError: false,
        })
      ).toBe(true)
    })

    it('returns false when not in edit mode', () => {
      expect(
        hasDataAvailable({
          effectiveEditMode: false,
          isLoading: false,
          hasData: true,
          hasNotFoundError: false,
        })
      ).toBe(false)
    })

    it('returns false when loading', () => {
      expect(
        hasDataAvailable({
          effectiveEditMode: true,
          isLoading: true,
          hasData: true,
          hasNotFoundError: false,
        })
      ).toBe(false)
    })

    it('returns false when no data', () => {
      expect(
        hasDataAvailable({
          effectiveEditMode: true,
          isLoading: false,
          hasData: false,
          hasNotFoundError: false,
        })
      ).toBe(false)
    })

    it('returns false when has notFoundError', () => {
      expect(
        hasDataAvailable({
          effectiveEditMode: true,
          isLoading: false,
          hasData: true,
          hasNotFoundError: true,
        })
      ).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('isReadOnly handles all flags true', () => {
      expect(
        isReadOnly({
          effectiveEditMode: true,
          updateMode: true,
          hasNotFoundError: true,
          fillDataMode: true,
        })
      ).toBe(false)
    })

    it('canPerformAction handles all flags true', () => {
      expect(
        canPerformAction({
          effectiveEditMode: true,
          fillDataMode: true,
          hasAnyFillDataMode: true,
          thisItemFillDataMode: true,
          updateMode: true,
        })
      ).toBe(true)
    })
  })
})
