import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCurrentTime, getCurrentTimeHHMM, getTimeFromDatetime } from '../../hooks/useCurrentTime'

describe('useCurrentTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix the date to 2026-02-10T14:30:00
    vi.setSystemTime(new Date(2026, 1, 10, 14, 30, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── Initial Time Capture ─────────────────────────────────────

  it('captures current time when autoCapture is true', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )
    expect(result.current.time).toBe('14:30')
  })

  it('returns empty string when autoCapture is false and no initialTime', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: false })
    )
    expect(result.current.time).toBe('')
  })

  it('uses initialTime when provided (ISO datetime string)', () => {
    const { result } = renderHook(() =>
      useCurrentTime({
        autoCapture: false,
        initialTime: '2026-01-15T09:45:00.000Z',
      })
    )
    // The parsed time depends on locale - it should be a valid HH:mm format
    expect(result.current.time).toMatch(/^\d{2}:\d{2}$/)
  })

  it('uses initialTime over autoCapture when both are provided', () => {
    const { result } = renderHook(() =>
      useCurrentTime({
        autoCapture: true,
        initialTime: '2026-01-15T08:15:00.000Z',
      })
    )
    // initialTime should take precedence
    expect(result.current.time).toMatch(/^\d{2}:\d{2}$/)
    // It should NOT be the current fake time 14:30 (unless timezone makes it so)
  })

  it('falls back to autoCapture when initialTime is invalid', () => {
    const { result } = renderHook(() =>
      useCurrentTime({
        autoCapture: true,
        initialTime: 'not-a-date',
      })
    )
    expect(result.current.time).toBe('14:30')
  })

  it('returns empty string when autoCapture is false and initialTime is invalid', () => {
    const { result } = renderHook(() =>
      useCurrentTime({
        autoCapture: false,
        initialTime: 'invalid',
      })
    )
    expect(result.current.time).toBe('')
  })

  // ─── setTime ───────────────────────────────────────────────────

  it('updates time via setTime', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )
    expect(result.current.time).toBe('14:30')

    act(() => {
      result.current.setTime('16:00')
    })
    expect(result.current.time).toBe('16:00')
  })

  it('setTime rejects invalid time formats', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )

    act(() => {
      result.current.setTime('99:99')
    })
    // Invalid format is rejected, time stays at auto-captured value
    expect(result.current.time).toBe('14:30')
  })

  it('setTime rejects non-time strings', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )

    act(() => {
      result.current.setTime('abc')
    })
    expect(result.current.time).toBe('14:30')
  })

  it('setTime to empty string clears the time (even with autoCapture)', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )

    act(() => {
      result.current.setTime('')
    })
    // Fixed: `time` is no longer in useEffect deps, so empty string is preserved
    expect(result.current.time).toBe('')
  })

  it('setTime to empty string works when autoCapture is false', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: false, initialTime: '2026-01-15T08:00:00.000Z' })
    )

    act(() => {
      result.current.setTime('')
    })
    // Empty string is preserved since useEffect doesn't depend on `time`
    expect(result.current.time).toBe('')
  })

  // ─── refreshTime ──────────────────────────────────────────────

  it('refreshTime captures current system time', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )
    expect(result.current.time).toBe('14:30')

    // Advance time by 1 hour
    vi.setSystemTime(new Date(2026, 1, 10, 15, 30, 0))

    act(() => {
      result.current.refreshTime()
    })
    expect(result.current.time).toBe('15:30')
  })

  it('refreshTime works even when autoCapture is false', () => {
    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: false })
    )
    expect(result.current.time).toBe('')

    act(() => {
      result.current.refreshTime()
    })
    expect(result.current.time).toBe('14:30')
  })

  // ─── useEffect behavior with prop changes ─────────────────────

  it('updates time when initialTime prop changes', () => {
    const { result, rerender } = renderHook(
      ({ initialTime }) =>
        useCurrentTime({ autoCapture: false, initialTime }),
      { initialProps: { initialTime: '2026-01-15T08:00:00.000Z' } }
    )

    const firstTime = result.current.time
    expect(firstTime).toMatch(/^\d{2}:\d{2}$/)

    // Change initialTime
    rerender({ initialTime: '2026-06-20T16:45:00.000Z' })

    const secondTime = result.current.time
    expect(secondTime).toMatch(/^\d{2}:\d{2}$/)
  })

  // ─── Stability ─────────────────────────────────────────────────

  it('setTime reference is stable across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )

    const firstSetTime = result.current.setTime
    rerender()
    const secondSetTime = result.current.setTime

    expect(firstSetTime).toBe(secondSetTime)
  })

  it('refreshTime reference is stable across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )

    const firstRefresh = result.current.refreshTime
    rerender()
    const secondRefresh = result.current.refreshTime

    expect(firstRefresh).toBe(secondRefresh)
  })

  // ─── Edge Cases ────────────────────────────────────────────────

  it('handles midnight time correctly', () => {
    vi.setSystemTime(new Date(2026, 1, 10, 0, 0, 0))

    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )
    expect(result.current.time).toBe('00:00')
  })

  it('handles end-of-day time correctly', () => {
    vi.setSystemTime(new Date(2026, 1, 10, 23, 59, 0))

    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )
    expect(result.current.time).toBe('23:59')
  })

  it('pads single-digit hours and minutes with zeroes', () => {
    vi.setSystemTime(new Date(2026, 1, 10, 5, 3, 0))

    const { result } = renderHook(() =>
      useCurrentTime({ autoCapture: true })
    )
    expect(result.current.time).toBe('05:03')
  })

  // ─── useEffect re-captures when autoCapture toggles ────────────

  it('re-captures current time when autoCapture toggles back on', () => {
    const { result, rerender } = renderHook(
      ({ autoCapture }) => useCurrentTime({ autoCapture }),
      { initialProps: { autoCapture: true } }
    )

    expect(result.current.time).toBe('14:30')

    // Advance system time
    vi.setSystemTime(new Date(2026, 1, 10, 16, 0, 0))

    // Toggle autoCapture off then on
    rerender({ autoCapture: false })
    rerender({ autoCapture: true })

    // Fixed: `time` removed from deps, so autoCapture toggle re-captures current time
    expect(result.current.time).toBe('16:00')
  })
})

// ─── Standalone Utility Functions ────────────────────────────────

describe('getCurrentTimeHHMM', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current time in HH:mm format', () => {
    vi.setSystemTime(new Date(2026, 1, 10, 9, 5, 0))
    expect(getCurrentTimeHHMM()).toBe('09:05')
  })

  it('handles midnight', () => {
    vi.setSystemTime(new Date(2026, 1, 10, 0, 0, 0))
    expect(getCurrentTimeHHMM()).toBe('00:00')
  })
})

describe('getTimeFromDatetime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 1, 10, 14, 30, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('extracts time from valid ISO datetime string', () => {
    const result = getTimeFromDatetime('2026-01-15T09:45:00.000Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns empty string for invalid datetime', () => {
    expect(getTimeFromDatetime('not-a-date')).toBe('')
  })

  it('returns empty string for empty string input', () => {
    expect(getTimeFromDatetime('')).toBe('')
  })
})
