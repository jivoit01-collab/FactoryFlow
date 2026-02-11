import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditFormState } from '../../hooks/useEditFormState'

describe('useEditFormState', () => {
  // ─── Create Mode (isEditMode: false) ───────────────────────────

  describe('Create Mode (isEditMode: false)', () => {
    it('defaults to non-read-only in create mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.isReadOnly).toBe(false)
    })

    it('effectiveEditMode is false in create mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.effectiveEditMode).toBe(false)
    })

    it('canUpdate is false in create mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.canUpdate).toBe(false)
    })

    it('fillDataMode is initially false', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.fillDataMode).toBe(false)
    })

    it('updateMode is initially false', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.updateMode).toBe(false)
    })

    it('showFillDataButton is false without notFoundError', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.showFillDataButton).toBe(false)
    })
  })

  // ─── Edit Mode (isEditMode: true) ─────────────────────────────

  describe('Edit Mode (isEditMode: true)', () => {
    it('starts as read-only in edit mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      expect(result.current.isReadOnly).toBe(true)
    })

    it('effectiveEditMode is true in edit mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      expect(result.current.effectiveEditMode).toBe(true)
    })

    it('canUpdate is true when status is not COMPLETED', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, entryStatus: 'DRAFT' })
      )
      expect(result.current.canUpdate).toBe(true)
    })

    it('canUpdate is false when status is COMPLETED', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, entryStatus: 'COMPLETED' })
      )
      expect(result.current.canUpdate).toBe(false)
    })

    it('canUpdate is true when no entryStatus is provided', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      expect(result.current.canUpdate).toBe(true)
    })
  })

  // ─── Update Mode ──────────────────────────────────────────────

  describe('Update Mode', () => {
    it('enableUpdateMode makes form editable', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      expect(result.current.isReadOnly).toBe(true)

      act(() => {
        result.current.enableUpdateMode()
      })

      expect(result.current.updateMode).toBe(true)
      expect(result.current.isReadOnly).toBe(false)
    })
  })

  // ─── Fill Data Mode ───────────────────────────────────────────

  describe('Fill Data Mode', () => {
    it('showFillDataButton is true when hasNotFoundError and not in fillDataMode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )
      expect(result.current.showFillDataButton).toBe(true)
    })

    it('enableFillDataMode disables showFillDataButton', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )
      expect(result.current.showFillDataButton).toBe(true)

      act(() => {
        result.current.enableFillDataMode()
      })

      expect(result.current.fillDataMode).toBe(true)
      expect(result.current.showFillDataButton).toBe(false)
    })

    it('fillDataMode changes effectiveEditMode to false', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )
      expect(result.current.effectiveEditMode).toBe(true)

      act(() => {
        result.current.enableFillDataMode()
      })

      expect(result.current.effectiveEditMode).toBe(false)
    })

    it('fillDataMode makes form writable (not read-only)', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )
      expect(result.current.isReadOnly).toBe(true)

      act(() => {
        result.current.enableFillDataMode()
      })

      expect(result.current.isReadOnly).toBe(false)
    })
  })

  // ─── Not Found Error State ────────────────────────────────────

  describe('Not Found Error', () => {
    it('isReadOnly is true when hasNotFoundError and not in fillDataMode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )
      expect(result.current.isReadOnly).toBe(true)
    })

    it('isReadOnly is false in create mode with hasNotFoundError', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false, hasNotFoundError: true })
      )
      // Fixed: isReadOnly second condition now guarded by isEditMode
      expect(result.current.isReadOnly).toBe(false)
    })
  })

  // ─── Reset ────────────────────────────────────────────────────

  describe('resetModes', () => {
    it('resets both fillDataMode and updateMode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )

      // Enable both modes
      act(() => {
        result.current.enableFillDataMode()
        result.current.enableUpdateMode()
      })

      expect(result.current.fillDataMode).toBe(true)
      expect(result.current.updateMode).toBe(true)

      act(() => {
        result.current.resetModes()
      })

      expect(result.current.fillDataMode).toBe(false)
      expect(result.current.updateMode).toBe(false)
    })

    it('resets to read-only state in edit mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )

      act(() => {
        result.current.enableUpdateMode()
      })
      expect(result.current.isReadOnly).toBe(false)

      act(() => {
        result.current.resetModes()
      })
      expect(result.current.isReadOnly).toBe(true)
    })
  })

  // ─── isReadOnly Complex Scenarios ─────────────────────────────

  describe('isReadOnly - complex scenarios', () => {
    it('NOT read-only: edit mode + update mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      act(() => {
        result.current.enableUpdateMode()
      })
      expect(result.current.isReadOnly).toBe(false)
    })

    it('NOT read-only: edit mode + hasNotFoundError + update mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, hasNotFoundError: true })
      )
      // hasNotFoundError makes it read-only, but effect depends on fillDataMode
      // effectiveEditMode && !updateMode && !hasNotFoundError => false (hasNotFoundError is true)
      // hasNotFoundError && !fillDataMode => true
      expect(result.current.isReadOnly).toBe(true)

      act(() => {
        result.current.enableFillDataMode()
      })
      // Now: effectiveEditMode becomes false (because fillDataMode), hasNotFoundError && !fillDataMode => false
      expect(result.current.isReadOnly).toBe(false)
    })

    it('read-only: edit mode without update mode', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      expect(result.current.isReadOnly).toBe(true)
    })

    it('NOT read-only: create mode without errors', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: false })
      )
      expect(result.current.isReadOnly).toBe(false)
    })
  })

  // ─── Callback Stability ───────────────────────────────────────

  describe('Callback stability', () => {
    it('enableFillDataMode is stable across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      const first = result.current.enableFillDataMode
      rerender()
      expect(result.current.enableFillDataMode).toBe(first)
    })

    it('enableUpdateMode is stable across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      const first = result.current.enableUpdateMode
      rerender()
      expect(result.current.enableUpdateMode).toBe(first)
    })

    it('resetModes is stable across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      const first = result.current.resetModes
      rerender()
      expect(result.current.resetModes).toBe(first)
    })
  })

  // ─── Edge Cases ────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles undefined entryStatus', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, entryStatus: undefined })
      )
      // undefined !== 'COMPLETED', so canUpdate should be true
      expect(result.current.canUpdate).toBe(true)
    })

    it('handles empty string entryStatus', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, entryStatus: '' })
      )
      // '' !== 'COMPLETED', so canUpdate should be true
      expect(result.current.canUpdate).toBe(true)
    })

    it('handles lowercase completed status (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, entryStatus: 'completed' })
      )
      // Fixed: now uses toUpperCase() comparison
      expect(result.current.canUpdate).toBe(false)
    })

    it('handles mixed-case completed status', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true, entryStatus: 'Completed' })
      )
      expect(result.current.canUpdate).toBe(false)
    })

    it('handles hasNotFoundError defaulting to false', () => {
      const { result } = renderHook(() =>
        useEditFormState({ isEditMode: true })
      )
      expect(result.current.showFillDataButton).toBe(false)
    })
  })
})
