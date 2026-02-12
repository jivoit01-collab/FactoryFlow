import { useCallback, useEffect, useState } from 'react'

/**
 * Formats a Date object to HH:mm format.
 */
function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Parses a datetime string and extracts the time in HH:mm format.
 * Returns null if parsing fails.
 */
function parseTimeFromDatetime(datetime: string): string | null {
  try {
    const date = new Date(datetime)
    if (isNaN(date.getTime())) return null
    return formatTimeHHMM(date)
  } catch {
    return null
  }
}

/**
 * Configuration for the current time hook.
 */
export interface UseCurrentTimeConfig {
  /**
   * Whether to auto-capture the current time.
   * Typically set to true in create mode, false in edit mode.
   */
  autoCapture: boolean
  /**
   * Initial time value (e.g., from existing data in edit mode).
   * If provided and valid, this will be used instead of current time.
   */
  initialTime?: string
}

/**
 * Return type for the current time hook.
 */
export interface UseCurrentTimeReturn {
  /** The current time value in HH:mm format */
  time: string
  /** Updates the time value */
  setTime: (time: string) => void
  /** Refreshes the time to current time */
  refreshTime: () => void
}

/**
 * Hook to manage time input with auto-capture functionality.
 *
 * This hook handles the common pattern of:
 * - Auto-capturing current time in create mode
 * - Using existing time from data in edit mode
 * - Allowing manual time updates
 *
 * @example
 * ```tsx
 * const { time, setTime } = useCurrentTime({
 *   autoCapture: !isEditMode,
 *   initialTime: existingData?.inspection_time,
 * })
 * ```
 */
export function useCurrentTime({
  autoCapture,
  initialTime,
}: UseCurrentTimeConfig): UseCurrentTimeReturn {
  const [time, setTimeState] = useState<string>(() => {
    // If we have an initial time from existing data, parse and use it
    if (initialTime) {
      const parsed = parseTimeFromDatetime(initialTime)
      if (parsed) return parsed
    }
    // If auto-capture is enabled, use current time
    if (autoCapture) {
      return formatTimeHHMM(new Date())
    }
    return ''
  })

  // Update time when autoCapture or initialTime changes
  useEffect(() => {
    if (initialTime) {
      const parsed = parseTimeFromDatetime(initialTime)
      if (parsed) {
        setTimeState(parsed)
        return
      }
    }
    if (autoCapture && !time) {
      setTimeState(formatTimeHHMM(new Date()))
    }
  }, [autoCapture, initialTime, time])

  const setTime = useCallback((newTime: string) => {
    setTimeState(newTime)
  }, [])

  const refreshTime = useCallback(() => {
    setTimeState(formatTimeHHMM(new Date()))
  }, [])

  return {
    time,
    setTime,
    refreshTime,
  }
}

/**
 * Utility function to get current time in HH:mm format.
 * Useful for one-time time capture without the hook.
 */
export function getCurrentTimeHHMM(): string {
  return formatTimeHHMM(new Date())
}

/**
 * Utility function to parse time from a datetime string.
 * Returns empty string if parsing fails.
 */
export function getTimeFromDatetime(datetime: string): string {
  return parseTimeFromDatetime(datetime) || ''
}
