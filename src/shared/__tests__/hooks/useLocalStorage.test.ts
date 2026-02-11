import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the storage utility
vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}))

import { useLocalStorage } from '../../hooks/useLocalStorage'
import { storage } from '../../utils/storage'

const mockStorage = vi.mocked(storage)

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Initial Value ──────────────────────────────────────────────

  describe('Initial Value', () => {
    it('uses initialValue when nothing is stored', () => {
      mockStorage.get.mockReturnValue(null)

      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'default')
      )

      expect(result.current[0]).toBe('default')
    })

    it('uses stored value when available', () => {
      mockStorage.get.mockReturnValue('stored-value')

      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'default')
      )

      expect(result.current[0]).toBe('stored-value')
    })

    it('uses stored object value', () => {
      mockStorage.get.mockReturnValue({ name: 'test' })

      const { result } = renderHook(() =>
        useLocalStorage('test-key', { name: 'default' })
      )

      expect(result.current[0]).toEqual({ name: 'test' })
    })
  })

  // ─── setValue ──────────────────────────────────────────────────

  describe('setValue', () => {
    it('updates the value and saves to storage', () => {
      mockStorage.get.mockReturnValue(null)

      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'initial')
      )

      act(() => {
        result.current[1]('new-value')
      })

      expect(result.current[0]).toBe('new-value')
      expect(mockStorage.set).toHaveBeenCalledWith('test-key', 'new-value')
    })

    it('supports function updater pattern', () => {
      mockStorage.get.mockReturnValue(5)

      const { result } = renderHook(() =>
        useLocalStorage('counter', 0)
      )

      act(() => {
        result.current[1]((prev: number) => prev + 1)
      })

      expect(result.current[0]).toBe(6)
      expect(mockStorage.set).toHaveBeenCalledWith('counter', 6)
    })
  })

  // ─── removeValue ───────────────────────────────────────────────

  describe('removeValue', () => {
    it('removes from storage and resets to initialValue', () => {
      mockStorage.get.mockReturnValue('stored')

      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'initial')
      )

      expect(result.current[0]).toBe('stored')

      act(() => {
        result.current[2]()
      })

      expect(mockStorage.remove).toHaveBeenCalledWith('test-key')
      expect(result.current[0]).toBe('initial')
    })
  })

  // ─── Return type ──────────────────────────────────────────────

  describe('Return type', () => {
    it('returns a tuple of [value, setValue, removeValue]', () => {
      mockStorage.get.mockReturnValue(null)

      const { result } = renderHook(() =>
        useLocalStorage('key', 'default')
      )

      expect(result.current).toHaveLength(3)
      expect(typeof result.current[1]).toBe('function')
      expect(typeof result.current[2]).toBe('function')
    })
  })
})
